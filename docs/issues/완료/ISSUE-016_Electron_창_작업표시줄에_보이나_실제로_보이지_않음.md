---
issue_id: ISSUE-016
type: 버그
priority: 높음
status: 완료
labels: [bug, electron, window, visibility, taskbar, es-modules, dev-shm]
related: [ISSUE-015]
last_updated: 2026-05-28
---

## 제목

Electron 창이 작업 표시줄에는 보이나 실제로 화면에 보이지 않는 문제

---

## 환경 정보

| 항목 | 값 |
|------|-----|
| OS | Linux 7.0 (KDE Plasma, X11) |
| Electron | `^34.5.8` |
| Node.js | v24.14.0 |
| GPU (Discrete) | NVIDIA GeForce RTX 5080 (Driver: 595.71.05) |
| GPU (Integrated) | AMD Radeon Graphics (Granite Ridge) |
| Window Manager | KDE Plasma KWin, X11 세션 |

---

## 버그 설명

Electron 앱 실행 시 작업 표시줄(taskbar)에는 창이 표시되지만, 실제 화면상에는 창이 보이지 않음. 투명도 문제가 아님 — 창 자체가 아예 보이지 않는 상태. 작업 표시줄에서 클릭해도 화면에 나타나지 않음.

ISSUE-015에서 투명도 관련 수정을 모두 완료했으나, 별개의 원인으로 동일한 증상이 재발함.

---

## 근본 원인 (2가지, 모두 수정 완료)

### 원인 1 (CRITICAL): `/dev/shm` 공유 메모리 FATAL 오류 — `--no-sandbox`

**증상:**
```
FATAL:platform_shared_memory_region_posix.cc(219)] This is frequently caused by incorrect permissions on /dev/shm.
Try 'sudo chmod 1777 /dev/shm' to fix.
```

**원인:** [`src/main/index.ts`](src/main/index.ts)의 `--no-sandbox` 플래그가 Chromium의 전체 샌드박스를 비활성화하면서 공유 메모리 네임스페이스 설정이 깨짐. `/dev/shm` 권한은 정상(1777)이었으나, 샌드박스 없는 프로세스가 PID 네임스페이스 없이 `/dev/shm`에 접근하려 해서 `No such process (3)` 오류 발생.

**수정:** `--no-sandbox` → `--disable-gpu-sandbox` + `--in-process-gpu`
- `--disable-gpu-sandbox`: GPU 샌드박스만 비활성화 (렌더러 샌드박스 유지 → 공유 메모리 정상)
- `--in-process-gpu`: 멀티 GPU(NVIDIA+AMD) 시스템에서 GPU 프로세스 충돌 방지

### 원인 2 (CRITICAL): ES 모듈 `file://` import 차단 — 렌더러 JS 미실행

**증상:**
- HTML은 로드됨 (`did-finish-load` 발생)
- 일반 `<script>`는 실행됨
- `<script type="module">import "./index.js"</script>`는 조용히 실패 (ErrorEvent 발생, 상세 정보 없음)
- 렌더러 `console.log` 메시지 전혀 없음

**원인:** Chromium은 보안 정책상 `file://` 프로토콜에서 ES 모듈의 `import`를 차단함. [`scripts/inline-renderer.py`](scripts/inline-renderer.py)가 생성한 인라인 모듈 import 패턴(`<script type="module">import "./index.js"</script>`)이 작동하지 않아 렌더러 JavaScript가 전혀 실행되지 않았음. `webSecurity: false`나 `--allow-file-access-from-files`로도 해결되지 않음.

**수정:** esbuild로 모든 렌더러 코드를 단일 IIFE 번들로 묶고 `<script src="bundle.js">`로 로드
- [`package.json`](package.json): `bundle-renderer` 스크립트 추가 (`esbuild --bundle --format=iife`)
- [`src/renderer/index.html`](src/renderer/index.html): `<script type="module">` → `<script src="bundle.js">`
- `copy-assets`에서 `three.module.js`/`three.core.js` 복사 및 sed import 경로 치환 제거 (esbuild가 해결)

---

## 수정된 파일 요약

| 파일 | 변경 |
|------|------|
| [`src/main/index.ts`](src/main/index.ts) | `--no-sandbox` → `--disable-gpu-sandbox` + `--in-process-gpu`, 진단 로깅 정리, `console-message` 리스너 개선 |
| [`package.json`](package.json) | `bundle-renderer` 스크립트 추가, `copy-assets` 간소화 (three.js 복사/sed 제거) |
| [`src/renderer/index.html`](src/renderer/index.html) | `<script type="module">import</script>` → `<script src="bundle.js">` |
| `esbuild` | 신규 devDependency |

---

## 검증 결과 (2026-05-28)

```
Noah renderer initialized. Waiting for FBX avatar...
THREE.Clock: deprecated. Please use THREE.Timer instead.
THREE.WebGLShadowMap: PCFSoftShadowMap deprecated. Using PCFShadowMap instead.
Initial NoahState: [object Object]
NoahState update: [object Object]
SystemMetrics: [object Object]
```

- 빌드 성공 (esbuild 번들 34ms, 1.2MB IIFE)
- `/dev/shm` FATAL 오류 없음
- GPU 프로세스 충돌 없음
- Three.js 씬 렌더링 시작
- IPC 상태/메트릭 통신 정상
- 투명 창 + 3D 씬 정상 표시 확인

---

## 참고 / 관련 이슈

- ISSUE-015: Electron 투명도 렌더링 버그 (해결 완료, 별개 원인)
- Electron 공식 문서: [BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)