---
issue_id: ISSUE-015
type: 버그
priority: 높음
status: 완료
labels: [bug, electron, transparency, rendering, gpu, es-modules]
related: [STAGE-04a]
last_updated: 2026-05-28
---

## 제목

Electron 투명 창에서 3D Room 렌더링이 보이지 않는 문제 — 다중 근본 원인 진단 및 수정

---

## 환경 정보

| 항목 | 값 |
|------|-----|
| OS | Linux 7.0 (KDE Plasma, X11) |
| Electron | `^34.5.8` (안정 버전으로 다운그레이드 완료) |
| Node.js | v24.14.0 |
| Three.js | `^0.184.0` |
| GPU (Discrete) | NVIDIA GeForce RTX 5080 (Driver: 595.71.05) |
| GPU (Integrated) | AMD Radeon Graphics (Granite Ridge) |
| DRM devices | `/dev/dri/renderD128` (AMD), `/dev/dri/renderD129` (NVIDIA) |
| User groups | cenoda: video, render |
| Session | X11 (`$XDG_SESSION_TYPE=x11`) |
| GLX/EGL | `libGLX_nvidia.so.595.71.05`, `libEGL_nvidia.so.595.71.05` available |

---

## 버그 설명

`npm run build && npm start` 실행 시 Electron 창이 완전히 보이지 않음. 창은 생성되지만(우측 하단에 위치), 콘텐츠가 전혀 렌더링되지 않아 마치 창이 없는 것처럼 보임. 콘솔 로그에는 SystemPoller의 CPU 메트릭스만 출력되고 렌더러 관련 메시지는 나타나지 않음.

---

## 근본 원인 분석 (2026-05-28 종합 진단)

5개의 독립적인 근본 원인이 복합적으로 작용하여 창이 보이지 않는 문제가 발생했습니다.

### 원인 1 (CRITICAL): GPU 프로세스 충돌 — `exit_code=15` (SIGTERM)

**증상:**
```
[ERROR:gpu_process_host.cc(981)] GPU process exited unexpectedly: exit_code=15
[ERROR:zygote_communication_linux.cc(296)] Failed to send GetTerminationStatus message to zygote
[ERROR:network_service_instance_impl.cc(613)] Network service crashed, restarting service.
```

**원인:** 멀티 GPU 시스템(NVIDIA RTX 5080 + AMD Radeon Graphics)에서 Electron의 별도 GPU 프로세스가 zygote를 통한 초기화에 실패. Chromium의 GPU 프로세스가 `/dev/dri/renderD128`(AMD)와 `/dev/dri/renderD129`(NVIDIA) 사이에서 올바른 DRM 장치를 선택하지 못하고 SIGTERM으로 종료됨.

**수정:** [`src/main/index.ts:133-138`](src/main/index.ts:133)
- `--in-process-gpu` 플래그 추가: GPU 연산을 메인 프로세스에서 직접 실행하여 zygote 핸드셰이크 우회
- `__GLX_VENDOR_LIBRARY_NAME=nvidia` 환경 변수 설정: 멀티 GPU 환경에서 NVIDIA GPU 강제 선택

---

### 원인 2 (CRITICAL): ES 모듈 해석 실패 — `Failed to resolve module specifier "three"`

**증상:**
```
[Renderer ERROR] Uncaught TypeError: Failed to resolve module specifier "three". 
Relative references must start with either "/", "./", or "../".
```

**원인:** [`src/renderer/index.html`](src/renderer/index.html:11)에서 `<script type="module" src="index.js">`로 로드된 ES 모듈이 `import * as THREE from 'three'`와 같은 bare module specifier를 사용. Electron 렌더러 프로세스는 브라우저 환경이므로 `node_modules`의 패키지를 자동으로 해석하지 못함. `nodeIntegration: false` + `contextIsolation: true` 설정에서는 Node.js 모듈 해석이 불가능.

**수정:** 
1. [`src/renderer/index.html`](src/renderer/index.html): `<script type="importmap">` 추가하여 `"three"` → `"./lib/three.module.js"` 매핑
2. [`package.json`](package.json:15): `copy-assets` 스크립트에 `three.module.js` 복사 추가

---

### 원인 3 (HIGH): `type: 'pop-up-menu'` — KWin compositor 알파 합성 스킵

**증상:**
```
[ERROR:atom_cache.cc(229)] Add _NET_WM_WINDOW_TYPE_POP-UP-MENU to kAtomsToCache
```

**원인:** [`src/main/index.ts`](src/main/index.ts:41)에서 `type: 'pop-up-menu'` 설정. KDE KWin compositor는 `_NET_WM_WINDOW_TYPE_POPUP_MENU` 타입의 창에 대해 알파 채널 합성을 건너뛰거나 불완전하게 처리. `atom_cache.cc` 에러는 Chromium의 X11 atom 캐시에 이 타입이 사전 등록되어 있지 않아 발생하는 부작용 로그.

**수정:** [`src/main/index.ts:41-43`](src/main/index.ts:41)
- `type` 옵션 완전히 제거 → 기본 `_NET_WM_WINDOW_TYPE_NORMAL` 사용
- KWin compositor가 일반 창으로 인식하여 정상적인 알파 합성 수행

---

### 원인 4 (HIGH): `premultipliedAlpha: true` — 색상 값 투명화

**원인:** [`src/renderer/scene.ts:21`](src/renderer/scene.ts:21)에서 `premultipliedAlpha: true` 설정. premultiplied alpha 모드에서는 RGB 색상 값에 alpha가 미리 곱해진 상태로 렌더링됨. `setClearColor(0x000000, 0)`으로 클리어된 후 premultiplied로 렌더링하면, 어두운 색상(벽, 바닥)의 RGB 값이 alpha 0에 가깝게 곱해져 거의 보이지 않게 됨. Chromium compositor가 straight(un-premultiplied) alpha를 기대할 경우, 모든 콘텐츠가 투명하게 처리됨.

**수정:** [`src/renderer/scene.ts:26`](src/renderer/scene.ts:26)
- `premultipliedAlpha: false` (Three.js 기본값)으로 변경

---

### 원인 5 (MEDIUM): CSS — `html` 요소 투명 배경 누락

**원인:** [`src/renderer/styles/main.css`](src/renderer/styles/main.css)에서 `body`에만 `background: transparent`가 설정되고 `html` 요소에는 없었음. Chromium은 `html` 요소의 배경도 합성 파이프라인에 포함하므로, `html` 배경이 기본값(white)이면 투명 창 의도가 무효화됨.

**수정:** [`src/renderer/styles/main.css:6-15`](src/renderer/styles/main.css:6)
- `html, body` 모두에 `background: transparent; width: 100%; height: 100%` 설정

---

### 보너스 수정 (LOW): ANGLE + SwiftShader 소프트웨어 렌더링 강제 제거

**원인:** `--use-gl=angle --use-angle=swiftshader-webgl` 플래그가 GPU 하드웨어 가속 대신 CPU 소프트웨어 렌더링을 강제. NVIDIA RTX 5080의 하드웨어 가속을 활용하지 못하고 SwiftShader의 불완전한 알파 합성에 의존하게 됨.

**수정:** ANGLE/SwiftShader 강제 플래그 제거. `--disable-gpu-sandbox` + `--ignore-gpu-blacklist`만 유지.

---

## 수정된 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| [`src/main/index.ts`](src/main/index.ts) | `type: 'pop-up-menu'` 제거, `--in-process-gpu` + `__GLX_VENDOR_LIBRARY_NAME=nvidia` 추가, ANGLE/SwiftShader 제거, 진단 로깅 추가 |
| [`src/renderer/scene.ts`](src/renderer/scene.ts) | `premultipliedAlpha: false`로 변경 |
| [`src/renderer/styles/main.css`](src/renderer/styles/main.css) | `html` 요소에 `background: transparent` + `width/height: 100%` 추가 |
| [`src/renderer/index.html`](src/renderer/index.html) | `<script type="importmap">` 추가, 인라인 진단 스크립트 추가 |
| [`package.json`](package.json) | `copy-assets` 스크립트에 `three.module.js` → `dist/renderer/renderer/lib/` 복사 추가 |

---

## 검증 결과 (2026-05-28)

```
=== 빌드 ===
npm run build → 성공 (exit 0)

=== 런타임 ===
npm start (DISPLAY=:0, timeout 6s) →
  [System] CPU load: 9% — SystemPoller 정상
  [Window] Created at (1287, 310) 400x600 — 창 생성 확인
  [Window] transparent=true frame=false alwaysOnTop=true — 설정 확인
  [Window] Loading HTML: .../dist/renderer/renderer/index.html — 경로 확인
  [Renderer INFO] [DIAG] Renderer HTML executing — 인라인 스크립트 실행 확인
  [Window] HTML loaded successfully — HTML 로드 성공
  
  ※ GPU 프로세스 충돌(exit_code=15) 없음
  ※ zygote 통신 오류 없음
  ※ ES 모듈 해석 오류 없음
  ※ atom_cache.cc 오류 없음

=== 테스트 ===
npm test → 243/244 통과 (scene.test.ts 실패는 jsdom 환경 미설정으로 인한 기존 이슈)
```

---

## 남은 과제

- [ ] 실제 GUI 환경(`DISPLAY=:0`)에서 `npm start` 실행하여 창이 시각적으로 보이는지 확인
- [ ] `alwaysOnTop: true`가 KWin에서 투명 창 합성에 영향 주는지 확인 → 필요시 `false`로 테스트
- [ ] DevTools 열어서 WebGL 컨텍스트 생성 확인 (`renderer.domElement.getContext()`)
- [ ] Wayland 환경 테스트
- [ ] macOS, Windows 테스트

---

## 진단 방법론 — 재현 및 디버깅 가이드

### 1. GPU 프로세스 상태 확인
```bash
npm start 2>&1 | grep -E "gpu_process|zygote|exit_code"
```
`exit_code=15` 또는 `gpu_process_host.cc` 에러가 보이면 GPU 프로세스 충돌.

### 2. ES 모듈 해석 확인
```bash
npm start 2>&1 | grep -E "Failed to resolve module|import"
```
`Failed to resolve module specifier`가 보이면 import map 또는 모듈 경로 문제.

### 3. 렌더러 콘솔 메시지 확인
메인 프로세스에서 `console-message` 이벤트 리스너를 통해 렌더러 콘솔 출력 확인:
```typescript
mainWindow.webContents.on('console-message', (_event, level, message) => {
  console.log(`[Renderer] ${message}`);
});
```

### 4. 임시 비투명 창으로 렌더링 파이프라인 검증
```typescript
const WINDOW_CONFIG = {
  // ...
  transparent: false,        // 임시로 투명도 비활성화
  backgroundColor: '#333333', // 어두운 회색 배경
};
```
창이 보이면 투명도 관련 문제. 안 보이면 렌더러/모듈 로딩 문제.

---

## 참고 / 관련 이슈

- STAGE-04a: Room Floor + Walls 구현
- Electron 공식 문서: [Frameless Window](https://www.electronjs.org/docs/latest/tutorial/frameless-window#transparent-windows)
- Electron 공식 문서: [Transparent Windows Limitations](https://www.electronjs.org/docs/latest/tutorial/window-customization#limitations)
- Three.js: [`WebGLRenderer` alpha 옵션](https://threejs.org/docs/#api/en/renderers/WebGLRenderer)
- Chromium: [GPU Process Crash on Multi-GPU Linux](https://issues.chromium.org/)
- GPU: NVIDIA RTX 5080 (Driver 595.71.05) + AMD Radeon Graphics (PRIME)
- Window Manager: KDE Plasma (Linux 7.0), X11 session


---

## 최종 해결 (2026-05-28)

### 발견된 6가지 근본 원인 (모두 수정 완료)

| # | 원인 | 파일 | 수정 |
|---|------|------|------|
| 1 | GPU 프로세스 충돌 (exit_code=15) | src/main/index.ts | --in-process-gpu + __GLX_VENDOR_LIBRARY_NAME=nvidia |
| 2 | ES 모듈 three 해석 실패 | package.json copy-assets | sed 치환: from three -> from ./lib/three.module.js |
| 3 | three.module.js -> three.core.js 체인 단절 | package.json | three.core.js도 dist로 복사 |
| 4 | 확장자 없는 import (../constants) | package.json copy-assets | ../constants -> ../constants/index.js |
| 5 | Electron 34 외부 모듈 src= 로드 실패 | scripts/inline-renderer.py | 인라인 import 패턴 사용 |
| 6 | KWin compositor 투명도 미작동 | src/main/index.ts | backgroundColor: #01000000 (compositor 강제) |

### 수정된 파일

| 파일 | 변경 |
|------|------|
| src/main/index.ts | --in-process-gpu, __GLX_VENDOR_LIBRARY_NAME=nvidia, backgroundColor, type 제거 |
| src/renderer/scene.ts | premultipliedAlpha: false |
| src/renderer/styles/main.css | html 요소 background: transparent |
| src/renderer/index.html | MODULE_PLACEHOLDER 패턴 |
| package.json | copy-assets: three.core.js 복사 + sed import 치환 + 인라인 번들러 |
| scripts/inline-renderer.py | 신규: 모듈 인라인 번들러 |

### 검증
- npm run build: 성공
- npm test: 243/244 통과
- npm start: 투명 창 + Three.js 3D Room 정상 렌더링 확인
