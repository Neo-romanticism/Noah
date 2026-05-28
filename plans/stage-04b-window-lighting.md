# Stage 4b: Window + Lighting — 상세 적용 계획

> **날짜**: 2026-05-27
> **기준 브랜치**: Stage 4a 완료 직후
> **현재 테스트**: 253개 통과 (기준 ≥236)

---

## 1. 현재 코드베이스 분석

### 1.1 관련 파일 상태

| 파일 | 핵심 내용 | Stage 4b 영향 |
|------|-----------|---------------|
| `src/renderer/scene.ts` | WebGLRenderer (alpha, antialias, preserveDrawingBuffer), `shadowMap` **미활성화** | `shadowMap.enabled = true` 추가 |
| `src/renderer/room.ts` | `IRoom` 인터페이스, `createProceduralRoom()` — 바닥(y=0) + 뒷벽(z=-5, y=0~4) + 좌우벽(x=±5) | 변경 없음 (window는 독립 모듈) |
| `src/renderer/index.ts` | AmbientLight(0.6) + DirectionalLight(0.8) 하드코딩, `animate()`에서 `renderer.render()`만 호출 | 조명 제거 → lighting 모듈로 대체, weather.update() 추가 |
| `src/renderer/metrics.ts` | CPU/RAM/Temp 바(z=0 부근) + weatherPlane(z=-2, 20×20) | weatherPlane z=-2 → z=-5.01 |
| `src/shared/utils/sensory.ts` | `deriveWeather()` → sunny/cloudy/rainy/stormy, `weatherColor()` | weather.ts에서 소비 |
| `tests/renderer/scene.test.ts` | jest.mock으로 WebGLRenderer 대체 | mock에 `shadowMap` 속성 추가 |

### 1.2 방 구조 (Stage 4a 결과)

```
        back wall (z=-5)
    ┌─────────────────────────┐  y=4
    │                         │
    │        floor (y=0)      │
    │                         │
    └─────────────────────────┘  y=0
   left (x=-5)          right (x=+5)
   (front open — camera at z=+6)
```

- Floor: `PlaneGeometry(10, 10)`, y=0, `receiveShadow = true`
- Back wall: `PlaneGeometry(10, 4)`, z=-5, y=2
- Walls: `MeshStandardMaterial` (wallColor `0xC0C0C0`, roughness 0.7, metalness 0.3)

### 1.3 날씨 시스템 (Stage 3)

```typescript
deriveWeather(metrics): SystemWeather
// 'sunny'  — 셋 다 정상
// 'cloudy' — 1개 지표 경계 초과
// 'rainy'  — 2개 이상 지표 경계 초과
// 'stormy' — 임계값 초과 (cpuLoad>85, ramUsage>85, cpuTemp>85)

weatherColor(weather): string
// sunny→#87ceeb, cloudy→#b0c4de, rainy→#708090, stormy→#2f4f4f
```

---

## 2. 파일 구성

### 2.1 생성할 파일 (6개)

| # | 파일 | 목적 |
|---|------|------|
| 1 | `src/renderer/window.ts` | 창문 프레임(BoxGeometry×4) + 투명 유리(PlaneGeometry + MeshPhysicalMaterial), castShadow 설정 |
| 2 | `src/renderer/lighting.ts` | AmbientLight(0.3) + shadow-casting DirectionalLight(1.2), shadow map 설정 |
| 3 | `src/renderer/weather.ts` | 비 파티클(THREE.Points, 500개) + 태양광 빔(ConeGeometry 3겹), animate 연동 |
| 4 | `tests/renderer/window.test.ts` | 창문 구조, 위치, 재질, 그림자 속성 (~8개) |
| 5 | `tests/renderer/lighting.test.ts` | 조명 타입, shadowMap 설정 (~6개) |
| 6 | `tests/renderer/weather.test.ts` | 날씨별 가시성, 파티클 애니메이션 (~8개) |

### 2.2 수정할 파일 (3개)

| # | 파일 | 변경 사항 |
|---|------|-----------|
| 7 | `src/renderer/scene.ts` | `renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;` |
| 8 | `src/renderer/index.ts` | 하드코딩 조명 제거 → lighting/window/weather 모듈 import 및 통합, `animate()`에 `weatherFx.update()` 추가 |
| 9 | `tests/renderer/scene.test.ts` | jest.mock renderer에 `shadowMap: { enabled: false, type: 0 }` 추가 |

---

## 3. 모듈별 상세 설계

### 3.1 `src/renderer/scene.ts` — 그림자 맵 활성화

```typescript
// 기존 renderer 설정 바로 아래에 추가 (line 33 이후)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

- `PCFSoftShadowMap`: Percentage-Closer Filtering — 부드러운 그림자
- Electron `premultipliedAlpha: false`와 호환성 문제 없음

### 3.2 `src/renderer/window.ts` — 창문 메시

#### 창문 레이아웃

```
뒷벽 (z=-5.0)
┌──────────────────────────────────┐  y=4 (천장)
│                                  │
│   ┌────────────────────────┐     │  y=3
│   │                        │     │
│   │   유리 (투명, z=-4.99)  │     │  창문 영역
│   │   너비 3, 높이 2        │     │  중앙 x=0
│   │                        │     │
│   └────────────────────────┘     │  y=1
│                                  │
└──────────────────────────────────┘  y=0 (바닥)
```

#### 인터페이스

```typescript
export interface IWindow {
  readonly group: THREE.Group;
  /** 투명 유리 패널 */
  getGlass(): THREE.Mesh;
  /** 프레임 바 4개 (top, bottom, left, right) */
  getFrames(): THREE.Mesh[];
  /** GPU 리소스 정리 */
  dispose(): void;
}

export function createWindow(
  width?: number,   // default 3
  height?: number,  // default 2
  yOffset?: number, // default 2 (center of 1-3 range)
): IWindow;
```

#### 구현 상세

- **프레임**: 4개의 `BoxGeometry` 바
  - top: `BoxGeometry(3, 0.1, 0.1)` @ `(0, 3, -4.99)`
  - bottom: `BoxGeometry(3, 0.1, 0.1)` @ `(0, 1, -4.99)`
  - left: `BoxGeometry(0.1, 2, 0.1)` @ `(-1.5, 2, -4.99)`
  - right: `BoxGeometry(0.1, 2, 0.1)` @ `(1.5, 2, -4.99)`
  - 재질: `MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.5, metalness: 0.8 })`
  - 각 프레임 바: `castShadow = true`, `receiveShadow = false`
- **유리**: `PlaneGeometry(3, 2)` @ `(0, 2, -4.99)`
  - 재질: `MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.1 })`
  - `castShadow = false`, `receiveShadow = false`
- **Group**: 모든 메시를 하나의 Group으로 묶어 export

### 3.3 `src/renderer/lighting.ts` — 그림자 조명 시스템

#### 인터페이스

```typescript
export interface LightingSetup {
  ambient: THREE.AmbientLight;
  sun: THREE.DirectionalLight;
  dispose(): void;
}

export function createLighting(): LightingSetup;
```

#### 구현 상세

| 속성 | AmbientLight | DirectionalLight (sun) |
|------|-------------|----------------------|
| color | `0xffffff` | `0xffffff` |
| intensity | **0.3** (기존 0.6→낮춤) | **1.2** (기존 0.8→높임) |
| position | N/A | `(3, 6, -2)` — 창문 뒤 위쪽 |
| castShadow | N/A | `true` |
| shadow.mapSize | N/A | `1024 × 1024` |
| shadow.camera.near | N/A | `0.5` |
| shadow.camera.far | N/A | `50` |
| shadow.camera.left/right | N/A | `-8 / 8` |
| shadow.camera.top/bottom | N/A | `8 / -8` |
| shadow.bias | N/A | `-0.0005` |
| shadow.normalBias | N/A | `0.02` |

- **조도 배분 근거**: Ambient를 낮추고 Directional을 높이면 창문 그림자가 더 선명하게 드러남
- **shadow camera frustum**: 16×16 크기로 방 전체(10×10) + 창문 영역을 충분히 커버

### 3.4 `src/renderer/weather.ts` — 날씨 이펙트

#### 인터페이스

```typescript
import type { SystemWeather } from '../shared/types/index.js';

export interface WeatherEffects {
  rain: THREE.Points;
  sunBeams: THREE.Group;
  /** 매 프레임 호출 — 파티클 위치 업데이트 + 가시성 전환 */
  update(weather: SystemWeather, delta: number): void;
  dispose(): void;
}

export function createWeatherEffects(): WeatherEffects;
```

#### 비 파티클 (Rain)

| 속성 | 값 |
|------|-----|
| 타입 | `THREE.Points` |
| 파티클 수 | **500개** (상수 `RAIN_PARTICLE_COUNT`) |
| 영역 | x: -4~4, y: 0~4, z: -4~4 (방 내부 + 전방 오픈 공간) |
| 지오메트리 | `BufferGeometry` — position attribute + velocity array |
| 재질 | `PointsMaterial({ color: 0x87ceeb, size: 0.05, transparent: true, opacity: 0.6 })` |
| 애니메이션 | 매 프레임 y -= `fallSpeed * delta`, y < 0 이면 y = 4 + random offset |
| 가시성 | `weather === 'rainy' \|\| weather === 'stormy'` |

```typescript
const RAIN_PARTICLE_COUNT = 500;
const RAIN_FALL_SPEED = 3; // units per second
const RAIN_AREA = { xMin: -4, xMax: 4, yMin: 0, yMax: 4, zMin: -4, zMax: 4 };
```

#### 태양광 빔 (Sun Beam)

| 속성 | 값 |
|------|-----|
| 타입 | `THREE.Group` (3개의 ConeGeometry 겹침) |
| 원점 | 창문 위치 `(0, 2, -4.5)` |
| 방향 | 바닥을 향해 아래로, z축으로 약간 전진 |
| Cone 1 | `radiusTop: 0.02, radiusBottom: 1.5, height: 4, opacity: 0.04` |
| Cone 2 | `radiusTop: 0.01, radiusBottom: 1.0, height: 3.5, opacity: 0.06` |
| Cone 3 | `radiusTop: 0.0, radiusBottom: 0.5, height: 3, opacity: 0.08` |
| 재질 | `MeshBasicMaterial({ color: 0xfffde6, transparent: true, depthWrite: false })` |
| 회전 | ConeGeometry 기본 축이 Y이므로 X축으로 회전하여 Z 방향 정렬 |
| 가시성 | `weather === 'sunny'` |

- **겹침 효과**: 서로 다른 반경/길이의 cone을 겹쳐 volumetric light 근사
- **depthWrite: false**: 다른 오브젝트를 가리지 않도록

### 3.5 `src/renderer/index.ts` — 통합

```typescript
import { createLighting } from './lighting.js';
import { createWindow } from './window.js';
import { createWeatherEffects } from './weather.js';
import type { SystemWeather } from '../shared/types/index.js';

// ── 조명 (기존 하드코딩 AmbientLight + DirectionalLight 제거) ──
const lighting = createLighting();
scene.add(lighting.ambient);
scene.add(lighting.sun);

// ── 창문 ──────────────────────────────────────────────────────────
const windowObj = createWindow();
scene.add(windowObj.group);

// ── 날씨 이펙트 ───────────────────────────────────────────────────
const weatherFx = createWeatherEffects();
scene.add(weatherFx.rain);
scene.add(weatherFx.sunBeams);

// ── 날씨 상태 추적 ────────────────────────────────────────────────
let currentWeather: SystemWeather = 'sunny';

noah.onSystemMetrics((metrics: SystemMetrics) => {
  console.log('SystemMetrics:', metrics);
  updateAllMetrics(metrics);
  currentWeather = deriveWeather(metrics);
});

// ── Renderer ─────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  weatherFx.update(currentWeather, clock.getDelta());
  renderer.render(scene, camera);
}
animate();
```

### 3.6 `src/renderer/metrics.ts` — weatherPlane 재배치

```typescript
// 변경 전 (line 66)
weatherPlane.position.set(0, 0, -2);

// 변경 후
weatherPlane.position.set(0, 0, -5.01); // 창문 뒤에서 하늘 역할
```

---

## 4. 렌더링 레이어 순서 (z-index)

```
z=-5.01 ─ weatherPlane (metrics.ts, 창문 뒤 하늘)
z=-5.0  ─ 뒷벽 (room.ts back wall)
z=-4.99 ─ 창문 프레임 + 유리 (window.ts)
z=-4.5  ─ 태양광 빔 시작점 (weather.ts sunBeams)
z=-4~+4 ─ 비 파티클 영역 (weather.ts rain)
z= 0    ─ 바닥 + CPU/RAM/Temp 바 (metrics.ts)
```

메트릭 바(z=0)는 창문(z=-4.99)보다 카메라에 훨씬 가까우므로 가려지지 않는다.

---

## 5. 테스트 계획

### 5.1 `tests/renderer/window.test.ts` (~8 tests)

```
Window
  createWindow()
    ✓ should return an IWindow with a THREE.Group
    ✓ group should contain 5 children (4 frames + 1 glass)
  Glass
    ✓ should use PlaneGeometry with MeshPhysicalMaterial
    ✓ should be transparent (opacity < 0.5)
    ✓ should be positioned at z ≈ -4.99, y = 2
  Frames
    ✓ should have 4 frame meshes using BoxGeometry
    ✓ each frame should castShadow = true
    ✓ frames should use MeshStandardMaterial with metalness > 0.5
```

### 5.2 `tests/renderer/lighting.test.ts` (~6 tests)

```
Lighting
  createLighting()
    ✓ should return ambient and sun lights
    ✓ ambient should have intensity 0.3
    ✓ sun should be DirectionalLight with castShadow = true
    ✓ sun shadow mapSize should be 1024x1024
    ✓ sun shadow camera should have near=0.5, far=50
  dispose()
    ✓ should not throw
```

### 5.3 `tests/renderer/weather.test.ts` (~8 tests)

```
Weather Effects
  createWeatherEffects()
    ✓ should return rain Points and sunBeams Group
  Rain
    ✓ should use PointsMaterial
    ✓ should have RAIN_PARTICLE_COUNT particles (default 500)
    ✓ should be visible when weather is 'rainy' or 'stormy'
    ✓ should be invisible when weather is 'sunny' or 'cloudy'
  Sun beams
    ✓ should be visible when weather is 'sunny'
    ✓ should be invisible when weather is not 'sunny'
  update()
    ✓ should modify particle positions (y decreases over time)
```

### 5.4 `tests/renderer/scene.test.ts` (수정)

기존 mock renderer에 `shadowMap` 속성 추가:

```typescript
const renderer = {
  // ... existing props ...
  shadowMap: {
    enabled: false,
    type: 0, // BasicShadowMap
  },
} as unknown as THREE.WebGLRenderer;
```

---

## 6. 예상 테스트 수 변화

| 모듈 | 기존 | 신규 | 합계 |
|------|------|------|------|
| scene.test.ts | 4 | +0~1 | 5 |
| room.test.ts | 7 | 변경 없음 | 7 |
| **window.test.ts** | - | +8 | 8 |
| **lighting.test.ts** | - | +6 | 6 |
| **weather.test.ts** | - | +8 | 8 |
| 기타 모듈 | 242 | 변경 없음 | 242 |
| **총계** | **253** | **+22~23** | **~275** |

→ 기준 ≥236을 39개 초과 예상.

---

## 7. 위험 요소 및 완화

| 위험 | 영향 | 완화 |
|------|------|------|
| shadowMap + Electron 투명창 호환성 | 그림자 렌더링 깨짐 | `PCFSoftShadowMap` 사용, `premultipliedAlpha: false` 유지. 문제 발생 시 `BasicShadowMap`으로 폴백 |
| 비 파티클 500개 프레임 드랍 | 저사양 PC에서 버벅임 | `RAIN_PARTICLE_COUNT` 상수화, delta 기반 업데이트로 프레임 독립적 |
| 날씨 배경 plane이 창문 프레임에 가려짐 | 날씨 시각화 소실 | weatherPlane을 z=-5.01로 창문 뒤 배치 |
| 기존 조명보다 어두워짐 | 방 내부가 칙칙 | Ambient 0.6→0.3 감소를 Directional 0.8→1.2 증가로 보상 |

---

## 8. 작업 순서

```
1. scene.ts          — shadowMap.enabled + PCFSoftShadowMap (1줄)
2. lighting.ts       — 조명 모듈 신규 생성
3. lighting.test.ts  — 조명 테스트
4. window.ts         — 창문 모듈 신규 생성
5. window.test.ts    — 창문 테스트
6. weather.ts        — 날씨 이펙트 모듈 신규 생성
7. weather.test.ts   — 날씨 이펙트 테스트
8. index.ts          — 통합 (조명/창문/날씨 연결, animate 수정)
9. metrics.ts        — weatherPlane z=-5.01
10. scene.test.ts     — mock에 shadowMap 추가
11. npm test          — 전체 테스트 확인
12. npm run build     — 빌드 확인
```

---

## 9. 완료 기준 (Acceptance Criteria 매핑)

| # | 기준 | 구현 확인 포인트 |
|---|------|-----------------|
| 1 | Window mesh added to back wall | `window.ts` — z=-4.99, y=1~3, 너비 3, 4개 프레임 + 유리 |
| 2 | Shadow-casting lights configured | `lighting.ts` — DirectionalLight castShadow, renderer shadowMap on |
| 3 | Weather particle system visible | `weather.ts` — rain(rainy/stormy), sunBeams(sunny) |
| 4 | Stage 3 metrics remain visible | 메트릭 바 z=0, 카메라 z=6 → 시야 확보, weatherPlane z=-5.01 |
| 5 | `npm test` ≥ 236 passed | 예상 ~275 |
| 6 | `npm run build` clean | TypeScript 컴파일 + copy-assets 오류 없음 |
