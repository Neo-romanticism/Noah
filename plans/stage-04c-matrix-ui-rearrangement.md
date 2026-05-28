# Stage 4c: Matrix UI Rearrangement — 상세 적용 계획

> **날짜**: 2026-05-28
> **기준 브랜치**: Stage 4b (Window + Lighting) 완료 직후
> **현재 테스트**: 253개 통과 (기준 ≥236)

---

## 1. 현재 코드베이스 분석

### 1.1 현재 메트릭 UI 상태 (`src/renderer/metrics.ts`)

현재 메트릭은 **모두 2D Plane/CircleGeometry**로 구성되어 있으며, z=0 평면에 2D처럼 배치되어 있다.

| 요소 | 타입 | 위치 | 설명 |
|------|------|------|------|
| CPU 바 | `PlaneGeometry(2, 0.1)` | `(0, 1.5, 0)` | 초록→노랑→주황→빨강, `scale.x`로 길이 조절 |
| RAM 바 | `PlaneGeometry(2, 0.1)` | `(0, 1.35, 0)` | 파랑→보라→분홍, `scale.x`로 길이 조절 |
| Temp 점 | `CircleGeometry(0.08, 32)` | `(1.2, 1.5, 0)` | 회색→초록→노랑→빨강 |
| Weather 평면 | `PlaneGeometry(20, 20)` | `(0, 0, -5.01)` | 창문 뒤 하늘 역할 |

**문제점**: 이 요소들은 3D 공간감이 전혀 없으며, 단순히 2D 오버레이처럼 떠 있다.

### 1.2 방 구조 (Stage 4a/b 결과)

```
        back wall (z=-5)
    ┌─────────────────────────┐  y=4
    │                         │
    │      window             │  y=1~3
    │     ┌────────┐          │
    │     │        │          │
    │     └────────┘          │
    │        floor (y=0)      │
    └─────────────────────────┘  y=0
   left (x=-5)          right (x=+5)
   (front open — camera at z=+6)
```

- Floor: 10×10, y=0
- Back wall: z=-5, y=2 (center)
- Walls 높이: 4 (y=0~4)
- Window: z=-4.99, y=1~3, x=0, 너비 3, 높이 2
- Camera: (0, 2, 6), FOV 50

### 1.3 상호작용 상태

현재 메트릭에는 **어떤 상호작용(호버, 클릭, 리사이즈)도 구현되어 있지 않다.**

---

## 2. 3D 공간 배치 설계

### 2.1 메트릭 배치 전략

메트릭을 방 공간 내에서 자연스럽게 배치하여 **Matrix 스타일의 몰입형 UI**를 구현한다.

```
         back wall (z=-5)
     ┌──────────────────────────────┐  y=4
     │                              │
     │    ┌─window─┐   [날씨 정보]   │
     │    │        │   "Sunny"      │  y=3
     │    │        │   ☀️ 아이콘     │
     │    └────────┘               │
     │                              │
     │  ┌── CPU Bar ──┐  ┌── RAM ──┐│  y=1.8
     │  │ ████████░░  │  │ ████░░  ││
     │  │ 45% 사용   │  │ 62% 사용 ││
     │  └─────────────┘  └─────────┘│
     │                    ● Temp    │  y=1.3
     │                              │
     └──────────────────────────────┘  y=0
    left (x=-5)                  right (x=+5)
```

### 2.2 최종 위치 결정

| 요소 | 위치 (x, y, z) | 기준 |
|------|---------------|------|
| **CPU 바** + 레이블 | `(-2.5, 2.0, -4.6)` | 뒷벽, 창문 왼쪽 아래 |
| **RAM 바** + 레이블 | `(2.5, 2.0, -4.6)` | 뒷벽, 창문 오른쪽 아래 |
| **온도 표시** | `(2.5, 1.3, -4.6)` | RAM 바 아래 |
| **날씨 정보** | `(0, 3.2, -4.6)` | 창문 바로 위 |

**선정 이유**:
- 뒷벽(z=-4.6)에 배치하여 카메라에서 항상 보임 (window glass z=-4.99보다 앞)
- CPU 왼쪽, RAM 오른쪽 — 직관적인 좌우 배치
- 온도는 RAM 아래 — 열 관련 상관관계 시각화
- 날씨는 창문 위 — 실제 창문과 날씨 정보 연결

### 2.3 렌더링 레이어 순서 (z-index, 카메라 기준)

```
z=-5.01 ─ weatherPlane (하늘 배경)
z=-5.0  ─ 뒷벽
z=-4.99 ─ 창문 프레임 + 유리
z=-4.6  ─ ★ 메트릭 UI (CPU, RAM, Temp, 날씨) — 뒷벽 앞에 부유
z=-4.5  ─ 태양광 빔 시작점
z=-4~+4 ─ 비 파티클
z= 0    ─ 바닥
```

메트릭이 뒷벽(z=-5.0)과 창문 유리(z=-4.99) **앞**에 위치하여 가려지지 않는다.

---

## 3. 메트릭 3D 변환 설계

### 3.1 CPU 로드 바 — 3D Box + Sprite 레이블 (임시 메쉬)

> ⚠️ **모든 메트릭 메쉬는 임시(placeholder)입니다.** 실제 FBX/GLTF 메쉬 파일은 Stage 5 이후 외부 에셋으로 교체 예정입니다.

**현재**: `PlaneGeometry(2, 0.1)` — 평면
**변경**: `BoxGeometry(2, 0.15, 0.1)` — 입체 막대 + Sprite 텍스트 (임시)

```typescript
interface MetricBar3D {
  /** 실제 입체 막대 메시 */
  bar: THREE.Mesh;           // BoxGeometry
  /** 배경 트랙 (어두운 색) */
  track: THREE.Mesh;         // BoxGeometry — 항상 고정 길이
  /** 레이블 (Sprite) */
  label: THREE.Sprite;       // CanvasTexture로 텍스트 렌더링
  /** 백분율 텍스트 */
  valueLabel: THREE.Sprite;
  /** 전체 Group */
  group: THREE.Group;
}
```

- **bar**: `BoxGeometry(2, 0.15, 0.1)` — `MeshStandardMaterial` (roughness 0.4, metalness 0.3)
- **track**: `BoxGeometry(2, 0.15, 0.05)` — `MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.3 })`
  - track은 항상 최대 길이 유지, 그 위에 bar가 scale.x로 채워짐
- **label**: Sprite — "CPU" 텍스트 (bar 위 y=+0.3)
- **valueLabel**: Sprite — "45%" 텍스트 (bar 오른쪽 끝)
- **색상 로직**: 현재와 동일 (4ade80 / facc15 / fb923c / ef4444)

### 3.2 RAM 사용량 바 — 3D Box + Sprite 레이블 (임시 메쉬)

CPU와 동일한 구조, 색상만 다름 (60a5fa / a78bfa / f472b6). 임시 BoxGeometry 사용.

- **bar**: `BoxGeometry(2, 0.15, 0.1)` @ `(2.5, 2.0, -4.6)`
- **label**: Sprite — "RAM"
- **valueLabel**: Sprite — "62%"

### 3.3 CPU 온도 표시 — 3D Sphere (임시 메쉬)

> ⚠️ 임시 메쉬. 추후 온도계/센서 형태의 실제 메쉬로 교체 예정.

**현재**: `CircleGeometry(0.08, 32)` — 2D 원
**변경**: `SphereGeometry(0.1, 16, 16)` — 3D 구 (임시)

```typescript
const tempSphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.1, 16, 16),
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 })
);
```

- 위치: `(2.5, 1.3, -4.6)`
- **emissive** 속성으로 발광 효과 — 온도가 높을수록 강하게 빛남
- 옆에 Sprite 레이블 "Temp: 45°C"

### 3.4 날씨 표시 — Sprite 아이콘 + 텍스트 (임시 UI)

> ⚠️ 날씨 아이콘도 임시 Sprite(이모지/텍스트). 추후 실제 3D 아이콘 메쉬 또는 고해상도 스프라이트로 교체 예정.

**현재**: `PlaneGeometry(20, 20)` — 전체 하늘 배경 (유지, z=-5.01)
**추가**: 뒷벽 창문 위에 날씨 정보 Sprite (임시)

```typescript
interface WeatherDisplay {
  icon: THREE.Sprite;     // 날씨 아이콘 텍스트 (☀️ 🌥 🌧 ⛈)
  label: THREE.Sprite;    // "Sunny" / "Cloudy" / "Rainy" / "Stormy"
  group: THREE.Group;
}
```

- 위치: `(0, 3.2, -4.6)` — 창문 위 중앙
- icon Sprite: Canvas에 이모지 또는 유니코드 문자 렌더링
- label Sprite: 날씨 이름 텍스트
- **기존 weatherPlane**(z=-5.01)은 하늘 배경으로 계속 유지

### 3.5 Sprite 텍스트 렌더러 (공용 유틸)

`debug-labels.ts`의 `makeLabelSprite` 패턴을 재사용하여 공용 텍스트 Sprite 팩토리 생성.

```typescript
// src/renderer/text-sprite.ts
export function createTextSprite(
  text: string,
  options?: {
    fontSize?: number;      // default 48
    color?: string;         // default '#ffffff'
    bgColor?: string;       // default 'transparent'
    padding?: number;       // default 10
    scale?: number;         // default 1.0
  }
): THREE.Sprite;
```

---

## 4. 상호작용 시스템 설계

### 4.1 Raycaster 기반 호버

```typescript
// src/renderer/interaction.ts
export interface InteractionManager {
  /** 매 프레임 호출 — raycaster로 마우스 위치의 메시 감지 */
  update(pointer: THREE.Vector2): void;
  /** 호버 가능한 메트릭 등록 */
  add(target: THREE.Object3D, callback: HoverCallback): void;
  /** 등록 해제 */
  remove(target: THREE.Object3D): void;
  dispose(): void;
}
```

**구현 상세**:
- `THREE.Raycaster`로 카메라 → 마우스 포인터 광선 발사
- 등록된 메트릭 메시와 교차 검사
- 교차 시: `onHoverStart` / `onHoverEnd` 콜백 호출
- `cursor: pointer` 스타일로 DOM 커서 변경

### 4.2 호버 효과

| 효과 | 구현 |
|------|------|
| **글로우** | bar material에 `emissive` 색상 추가, 호버 시 `emissiveIntensity` 0→0.5 |
| **스케일** | 호버 시 group.scale `(1, 1, 1)` → `(1.05, 1.05, 1.05)` |
| **커서 변경** | `renderer.domElement.style.cursor = 'pointer'` |
| **툴팁** | 호버 시 상세 정보 Sprite 표시 (예: "CPU Load: 45% - Warm") |

### 4.3 리사이즈 기능

메트릭 바를 드래그하여 크기 조절:

```typescript
// interaction.ts 내
function onPointerDown(event: PointerEvent): void {
  // 호버 중인 메트릭이 있으면 리사이즈 모드 진입
  // bar의 우측 가장자리 10px 이내에서만 활성화
}

function onPointerMove(event: PointerEvent): void {
  if (resizing) {
    // 마우스 위치에 따라 bar 길이 조절
    // 최소 0.3, 최대 3.0 스케일
    // 실제 메트릭 값은 변경되지 않고 시각적 표현만 조절
  }
}
```

- **리사이즈 핸들**: 바 우측 끝에 작은 3D 핸들(BoxGeometry) 표시
- 호버 시에만 핸들 visible
- 드래그로 바 길이 조절 (시각적 스케일링만, 실제 데이터는 영향 없음)

### 4.4 애니메이션

```typescript
// 부드러운 전환을 위한 유틸
function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color;
function lerpScale(obj: THREE.Object3D, target: THREE.Vector3, speed: number): void;
```

- 호버 진입/이탈 시 150ms ease-out 전환
- 리사이즈 중 실시간 업데이트 (throttle 16ms = 60fps)

---

## 5. 파일 구성

### 5.1 생성할 파일 (4개)

| # | 파일 | 목적 |
|---|------|------|
| 1 | `src/renderer/text-sprite.ts` | 공용 Canvas→Sprite 텍스트 렌더러 |
| 2 | `src/renderer/metrics-3d.ts` | 3D 메트릭 UI (CPU/RAM/Temp bars → BoxGeometry + Sphere) |
| 3 | `src/renderer/interaction.ts` | Raycaster 호버 + 리사이즈 시스템 |
| 4 | `tests/renderer/text-sprite.test.ts` | 텍스트 Sprite 단위 테스트 |
| 5 | `tests/renderer/metrics-3d.test.ts` | 3D 메트릭 구조/위치/업데이트 테스트 |
| 6 | `tests/renderer/interaction.test.ts` | Raycaster 호버 콜백 테스트 |

### 5.2 수정할 파일 (4개)

| # | 파일 | 변경 사항 |
|---|------|-----------|
| 7 | `src/renderer/metrics.ts` | 기존 2D 메트릭 → 새로운 3D 메트릭으로 교체 (weatherPlane 유지) |
| 8 | `src/renderer/index.ts` | `addMetricsToScene` 호출 유지 (내부 구현만 변경), 필요시 interaction 연결 |
| 9 | `tests/renderer/metrics.test.ts` | **신규 생성** (기존 metrics.ts에 대한 테스트가 없음) |
| 10 | `tests/renderer/weather.test.ts` | weatherPlane 위치 변경 검증 (기존 테스트 유지) |

---

## 6. 모듈별 상세 설계

### 6.1 `src/renderer/text-sprite.ts` — 텍스트 Sprite 팩토리

```typescript
export interface TextSpriteOptions {
  fontSize?: number;     // default 48
  color?: string;        // default '#ffffff'
  bgColor?: string;      // default 'transparent' (rgba(0,0,0,0.5) for readability)
  padding?: number;      // default 16
  scale?: number;        // default 1.0
  fontFamily?: string;   // default '"Consolas", "Courier New", monospace'
  bold?: boolean;        // default true
  dropShadow?: boolean;  // default true
}

export function createTextSprite(
  text: string,
  options?: TextSpriteOptions
): THREE.Sprite {
  const opts = { ...DEFAULT_OPTS, ...options };
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // 1. 텍스트 크기 측정
  ctx.font = `${opts.bold ? 'bold ' : ''}${opts.fontSize}px ${opts.fontFamily}`;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width + opts.padding * 2;
  const textHeight = opts.fontSize * 1.5 + opts.padding * 2;

  canvas.width = textWidth;
  canvas.height = textHeight;

  // 2. 배경
  if (opts.bgColor !== 'transparent') {
    ctx.fillStyle = opts.bgColor;
    ctx.roundRect ? ctx.roundRect(0, 0, textWidth, textHeight, 6) : ctx.fillRect(0, 0, textWidth, textHeight);
    ctx.fill();
  }

  // 3. 텍스트
  ctx.font = `${opts.bold ? 'bold ' : ''}${opts.fontSize}px ${opts.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (opts.dropShadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
  }

  ctx.fillStyle = opts.color;
  ctx.fillText(text, textWidth / 2, textHeight / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const sprite = new THREE.Sprite(material);
  const aspect = textWidth / textHeight;
  sprite.scale.set(opts.scale * aspect, opts.scale, 1);

  return sprite;
}
```

### 6.2 `src/renderer/metrics-3d.ts` — 3D 메트릭

```typescript
import * as THREE from 'three';
import type { SystemMetrics } from '../shared/types/index.js';
import { ramUsageColor, cpuTempColor, deriveWeather, weatherColor } from '../shared/utils/sensory.js';
import { createTextSprite } from './text-sprite.js';

// ── 상수 ──────────────────────────────────────────────────────
const CPU_POS = new THREE.Vector3(-2.5, 2.0, -4.6);
const RAM_POS = new THREE.Vector3(2.5, 2.0, -4.6);
const TEMP_POS = new THREE.Vector3(2.5, 1.3, -4.6);
const WEATHER_POS = new THREE.Vector3(0, 3.2, -4.6);

const BAR_WIDTH = 2.0;
const BAR_HEIGHT = 0.15;
const BAR_DEPTH = 0.1;

// ── 3D Metric Bar ────────────────────────────────────────────
export interface MetricBar3D {
  group: THREE.Group;
  bar: THREE.Mesh;
  track: THREE.Mesh;
  label: THREE.Sprite;
  valueLabel: THREE.Sprite;
  /** 호버 상태 업데이트 */
  setHovered(hovered: boolean): void;
  /** 메트릭 값 업데이트 (0-100) */
  update(value: number, color: THREE.Color | string): void;
}

export function createMetricBar3D(
  name: string,
  position: THREE.Vector3,
  color: number | string,
): MetricBar3D {
  const group = new THREE.Group();
  group.position.copy(position);

  // Track (배경 — 항상 최대 길이)
  const trackMat = new THREE.MeshBasicMaterial({
    color: 0x333333,
    transparent: true,
    opacity: 0.3,
  });
  const track = new THREE.Mesh(
    new THREE.BoxGeometry(BAR_WIDTH, BAR_HEIGHT, BAR_DEPTH * 0.5),
    trackMat,
  );
  group.add(track);

  // Bar (활성 — scale.x로 길이 조절)
  const barMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.3,
    emissive: color,
    emissiveIntensity: 0,
  });
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(BAR_WIDTH, BAR_HEIGHT, BAR_DEPTH),
    barMat,
  );
  bar.position.z = 0.05; // track보다 약간 앞에
  group.add(bar);

  // Label (이름)
  const label = createTextSprite(name, {
    fontSize: 36,
    color: '#cccccc',
    scale: 0.4,
    bgColor: 'transparent',
  });
  label.position.set(0, BAR_HEIGHT / 2 + 0.25, 0);
  group.add(label);

  // Value label (백분율)
  const valueLabel = createTextSprite('0%', {
    fontSize: 32,
    color: '#ffffff',
    scale: 0.35,
    bgColor: 'rgba(0,0,0,0.3)',
  });
  valueLabel.position.set(BAR_WIDTH / 2 + 0.3, 0, 0);
  group.add(valueLabel);

  return {
    group,
    bar,
    track,
    label,
    valueLabel,
    setHovered(hovered: boolean) {
      const mat = bar.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = hovered ? 0.5 : 0;
      group.scale.set(
        hovered ? 1.05 : 1,
        hovered ? 1.05 : 1,
        hovered ? 1.05 : 1,
      );
    },
    update(value: number, color: THREE.Color | string) {
      const mat = bar.material as THREE.MeshStandardMaterial;
      const c = color instanceof THREE.Color ? color : new THREE.Color(color);
      mat.color.copy(c);
      mat.emissive.copy(c);

      // scale.x: 0.1 ~ 1.0 (최소 10%는 표시)
      bar.scale.x = Math.max(0.1, value / 100);

      // valueLabel 업데이트
      const spriteMat = valueLabel.material as THREE.SpriteMaterial;
      const oldTexture = spriteMat.map;
      const newSprite = createTextSprite(`${Math.round(value)}%`, {
        fontSize: 32,
        color: '#ffffff',
        scale: 0.35,
        bgColor: 'rgba(0,0,0,0.3)',
      });
      spriteMat.map = (newSprite.material as THREE.SpriteMaterial).map;
      spriteMat.needsUpdate = true;
      oldTexture?.dispose();
    },
  };
}

// ── Temperature Sphere ────────────────────────────────────────
export interface TempDisplay3D {
  group: THREE.Group;
  sphere: THREE.Mesh;
  label: THREE.Sprite;
  update(temp: number): void;
}

export function createTempDisplay3D(position: THREE.Vector3): TempDisplay3D {
  const group = new THREE.Group();
  group.position.copy(position);

  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    emissive: 0x9ca3af,
    emissiveIntensity: 0.2,
    roughness: 0.3,
    metalness: 0.5,
  });
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16),
    sphereMat,
  );
  group.add(sphere);

  const label = createTextSprite('Temp: --°C', {
    fontSize: 28,
    color: '#aaaaaa',
    scale: 0.3,
    bgColor: 'transparent',
  });
  label.position.set(0.25, 0, 0);
  group.add(label);

  return {
    group,
    sphere,
    label,
    update(temp: number) {
      const color = cpuTempColor(temp);
      const c = new THREE.Color(color);
      sphereMat.color.copy(c);
      sphereMat.emissive.copy(c);
      sphereMat.emissiveIntensity = temp > 60 ? 0.5 : 0.2;

      // 레이블 업데이트
      const spriteMat = label.material as THREE.SpriteMaterial;
      const oldMap = spriteMat.map;
      const newSprite = createTextSprite(`Temp: ${Math.round(temp)}°C`, {
        fontSize: 28, color: '#aaaaaa', scale: 0.3, bgColor: 'transparent',
      });
      spriteMat.map = (newSprite.material as THREE.SpriteMaterial).map;
      spriteMat.needsUpdate = true;
      oldMap?.dispose();
    },
  };
}

// ── Weather Display ───────────────────────────────────────────
export interface WeatherDisplay3D {
  group: THREE.Group;
  icon: THREE.Sprite;
  label: THREE.Sprite;
  update(weather: string): void;
}

const WEATHER_ICONS: Record<string, string> = {
  sunny: '☀️',
  cloudy: '🌥',
  rainy: '🌧',
  stormy: '⛈',
};

export function createWeatherDisplay3D(position: THREE.Vector3): WeatherDisplay3D {
  const group = new THREE.Group();
  group.position.copy(position);

  const icon = createTextSprite('☀️', { fontSize: 56, scale: 0.5, bgColor: 'transparent' });
  group.add(icon);

  const label = createTextSprite('Sunny', {
    fontSize: 32,
    color: '#87ceeb',
    scale: 0.35,
    bgColor: 'transparent',
  });
  label.position.set(0, -0.35, 0);
  group.add(label);

  return {
    group,
    icon,
    label,
    update(weather: string) {
      const w = weather as keyof typeof WEATHER_ICONS;
      const iconChar = WEATHER_ICONS[w] || '☀️';
      const weatherName = w.charAt(0).toUpperCase() + w.slice(1);

      // 아이콘 업데이트
      const iconMat = icon.material as THREE.SpriteMaterial;
      const oldIconMap = iconMat.map;
      const newIcon = createTextSprite(iconChar, { fontSize: 56, scale: 0.5, bgColor: 'transparent' });
      iconMat.map = (newIcon.material as THREE.SpriteMaterial).map;
      iconMat.needsUpdate = true;
      oldIconMap?.dispose();

      // 레이블 업데이트
      const labelMat = label.material as THREE.SpriteMaterial;
      const oldLabelMap = labelMat.map;
      const weatherColor = w === 'sunny' ? '#87ceeb' : w === 'cloudy' ? '#b0c4de' : w === 'rainy' ? '#708090' : '#2f4f4f';
      const newLabel = createTextSprite(weatherName, { fontSize: 32, color: weatherColor, scale: 0.35, bgColor: 'transparent' });
      labelMat.map = (newLabel.material as THREE.SpriteMaterial).map;
      labelMat.needsUpdate = true;
      oldLabelMap?.dispose();
    },
  };
}
```

### 6.3 `src/renderer/interaction.ts` — 호버/리사이즈 시스템

```typescript
import * as THREE from 'three';

export type HoverCallback = (target: THREE.Object3D, entered: boolean) => void;

export interface InteractionManager {
  /** 매 프레임 호출 */
  update(pointer: THREE.Vector2): void;
  add(target: THREE.Object3D, callbacks: {
    onHover?: HoverCallback;
    onResize?: (delta: number) => void;
  }): void;
  remove(target: THREE.Object3D): void;
  dispose(): void;
}

export function createInteractionManager(
  camera: THREE.Camera,
  domElement: HTMLElement,
): InteractionManager {
  const raycaster = new THREE.Raycaster();
  const targets = new Map<THREE.Object3D, {
    onHover?: HoverCallback;
    onResize?: (delta: number) => void;
  }>();
  let hoveredTarget: THREE.Object3D | null = null;
  let isResizing = false;
  let resizeTarget: THREE.Object3D | null = null;

  // Pointer events
  domElement.addEventListener('pointermove', (event: PointerEvent) => {
    // ... raycaster intersection check
  });

  domElement.addEventListener('pointerdown', (event: PointerEvent) => {
    // ... resize start (if near edge)
  });

  domElement.addEventListener('pointerup', () => {
    // ... resize end
  });

  return {
    update(pointer: THREE.Vector2) {
      raycaster.setFromCamera(pointer, camera);
      const meshes: THREE.Object3D[] = [];
      targets.forEach((_, target) => meshes.push(target));
      const intersects = raycaster.intersectObjects(meshes);

      // ... hover state management
    },
    add(target, callbacks) { targets.set(target, callbacks); },
    remove(target) { targets.delete(target); },
    dispose() {
      targets.clear();
      hoveredTarget = null;
      isResizing = false;
    },
  };
}
```

### 6.4 `src/renderer/metrics.ts` — 수정 (2D → 3D 교체)

```typescript
import * as THREE from 'three';
import type { SystemMetrics } from '../shared/types/index.js';
import {
  ramUsageColor,
  cpuTempColor,
  deriveWeather,
  weatherColor,
} from '../shared/utils/sensory.js';
import {
  createMetricBar3D,
  createTempDisplay3D,
  createWeatherDisplay3D,
  CPU_POS,
  RAM_POS,
  TEMP_POS,
  WEATHER_POS,
} from './metrics-3d.js';

// ── 3D Metrics ────────────────────────────────────────────────

const cpuMetric = createMetricBar3D('CPU', CPU_POS, 0x4ade80);
const ramMetric = createMetricBar3D('RAM', RAM_POS, 0x60a5fa);
const tempDisplay = createTempDisplay3D(TEMP_POS);
const weatherDisplay = createWeatherDisplay3D(WEATHER_POS);

// ── Weather background plane (유지 — 창문 뒤 하늘) ─────────────
const weatherMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb });
const weatherPlane = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), weatherMat);
weatherPlane.position.set(0, 0, -5.01);

// ── Public API ─────────────────────────────────────────────────

export function addMetricsToScene(scene: THREE.Scene): void {
  scene.add(cpuMetric.group);
  scene.add(ramMetric.group);
  scene.add(tempDisplay.group);
  scene.add(weatherDisplay.group);
  scene.add(weatherPlane);
}

export function updateAllMetrics(metrics: SystemMetrics): void {
  // CPU
  const cpuColor = metrics.cpuLoad <= 30 ? 0x4ade80
    : metrics.cpuLoad <= 60 ? 0xfacc15
    : metrics.cpuLoad <= 85 ? 0xfb923c
    : 0xef4444;
  cpuMetric.update(metrics.cpuLoad, cpuColor);

  // RAM
  ramMetric.update(metrics.ramUsage, ramUsageColor(metrics.ramUsage));

  // Temp
  tempDisplay.update(metrics.cpuTemp);

  // Weather
  const weather = deriveWeather(metrics);
  weatherDisplay.update(weather);
  weatherMat.color.set(weatherColor(weather));
}

export { cpuMetric, ramMetric, tempDisplay, weatherDisplay, weatherPlane };
```

### 6.5 `src/renderer/index.ts` — 수정 (interaction 연결)

```typescript
import { createInteractionManager } from './interaction.js';
import { cpuMetric, ramMetric, tempDisplay } from './metrics.js';

// ── Interaction ───────────────────────────────────────────────
const interaction = createInteractionManager(camera, renderer.domElement);
interaction.add(cpuMetric.bar, {
  onHover: (target, entered) => cpuMetric.setHovered(entered),
});
interaction.add(ramMetric.bar, {
  onHover: (target, entered) => ramMetric.setHovered(entered),
});

// animate() 내에 interaction.update() 추가
function animate(): void {
  requestAnimationFrame(animate);
  weatherFx.update(currentWeather, clock.getDelta());
  interaction.update(mouse);  // ← 추가
  renderer.render(scene, camera);
}
```

---

## 7. 테스트 계획

### 7.1 `tests/renderer/text-sprite.test.ts` (~5 tests)

```
TextSprite
  createTextSprite()
    ✓ should return a THREE.Sprite instance
    ✓ should create sprite with correct text rendered on canvas
    ✓ should apply custom color option
    ✓ should apply custom fontSize that changes canvas size
    ✓ should create sprite with sizeAttenuation = true
```

### 7.2 `tests/renderer/metrics-3d.test.ts` (~10 tests)

```
Metrics 3D
  createMetricBar3D()
    ✓ should return group with bar, track, label, valueLabel
    ✓ bar should use BoxGeometry
    ✓ bar material should be MeshStandardMaterial
    ✓ update() should change bar scale.x based on value
    ✓ update() should change bar color
    ✓ setHovered(true) should increase emissiveIntensity
  createTempDisplay3D()
    ✓ should return group with sphere and label
    ✓ sphere should use SphereGeometry
    ✓ update() should change sphere color based on temp
  createWeatherDisplay3D()
    ✓ should show correct icon for each weather type
```

### 7.3 `tests/renderer/interaction.test.ts` (~6 tests)

```
Interaction
  createInteractionManager()
    ✓ should return interaction manager with update/add/remove
    ✓ add() should register target for raycasting
    ✓ remove() should unregister target
    ✓ update() should detect hover on registered objects
    ✓ update() should fire onHover callback on enter/leave
    ✓ should set cursor style on hover
```

### 7.4 기존 테스트 수정

| 파일 | 변경 |
|------|------|
| `tests/renderer/metrics.test.ts` | **신규 생성** — 3D 메트릭 API 테스트 (~5 tests) |
| `tests/renderer/weather.test.ts` | weatherPlane 위치 검증 유지 (변경 없음) |

### 7.5 예상 테스트 수 변화

| 모듈 | 기존 | 신규 | 합계 |
|------|------|------|------|
| text-sprite.test.ts | - | +5 | 5 |
| metrics-3d.test.ts | - | +10 | 10 |
| metrics.test.ts | - | +5 | 5 |
| interaction.test.ts | - | +6 | 6 |
| 기존 모듈 | 253 | 변경 없음 | 253 |
| **총계** | **253** | **+26** | **~279** |

→ 기준 ≥236을 43개 초과 예상.

---

## 8. 작업 순서

```
 1. text-sprite.ts        — 공용 텍스트 Sprite 팩토리 (신규)
 2. text-sprite.test.ts   — 텍스트 Sprite 테스트
 3. metrics-3d.ts         — 3D 메트릭 UI 모듈 (신규)
 4. metrics-3d.test.ts    — 3D 메트릭 테스트
 5. metrics.ts            — 기존 2D 메트릭 → 3D 교체 (weatherPlane 유지)
 6. metrics.test.ts       — metrics.ts API 테스트 (신규)
 7. interaction.ts        — Raycaster 호버 + 리사이즈 시스템 (신규)
 8. interaction.test.ts   — 상호작용 테스트
 9. index.ts              — interaction 연결, animate()에 update() 추가
10. npm test              — 전체 테스트 확인 (≥236)
11. npm run build         — 빌드 확인
```

---

## 9. 완료 기준 (Acceptance Criteria 매핑)

| # | 기준 | 구현 확인 포인트 |
|---|------|-----------------|
| 1 | Metrics visible in 3D scene | CPU/RAM/Temp/Weather가 뒷벽(z=-4.6)에 3D 객체로 표시됨 |
| 2 | Positioned appropriately relative to room | CPU 왼쪽(-2.5), RAM 오른쪽(2.5), Temp RAM 아래, Weather 창문 위 |
| 3 | Interactive (hover/resize) | Raycaster 호버 감지 → glow/scale 효과, 우측 핸들 드래그 리사이즈 |
| 4 | `npm test` ≥ 236 passed | 예상 ~279 |
| 5 | `npm run build` clean | TypeScript 컴파일 + import 경로 오류 없음 |

---

## 10. 위험 요소 및 완화

| 위험 | 영향 | 완화 |
|------|------|------|
| Canvas→Sprite 텍스트가 번져 보임 (저해상도) | UI 가독성 저하 | `canvas` 크기를 텍스트에 맞게 동적 조절, `devicePixelRatio` 고려 |
| Sprite가 항상 카메라를 바라보는 특성 | 3D 입체감 저하 | Sprite는 필수적인 레이블에만 사용, bar 자체는 BoxGeometry로 입체감 유지 |
| Raycaster가 Sprite와 교차 감지 못함 | 호버 미작동 | `THREE.Sprite`는 raycaster 교차 대상에서 제외 — bar Mesh에만 등록 |
| CanvasTexture 메모리 누수 | 반복 업데이트 시 GPU 메모리 증가 | `oldTexture?.dispose()`로 이전 텍스처 정리 |
| 리사이즈 중 메트릭 실제 값 변경 우려 | 데이터 오표시 | 리사이즈는 `bar.scale.x`만 변경, 실제 `update()` 호출 시 리셋 |
| Sprite 텍스트 업데이트 시 CanvasTexture 재생성 비용 | 잦은 업데이트 시 성능 저하 | 값이 실제로 변경되었을 때만 텍스처 재생성 (변경 감지 로직) |

---

## 11. 임시 메쉬 명세 (Temporary Mesh Specification)

현재 Stage 4c에서 사용하는 모든 메트릭 메쉬는 **임시(placeholder)**입니다. 아래 표는 향후 교체 대상입니다.

| 메트릭 | 현재 (임시) | 향후 (실제 에셋) | 예상 시기 |
|--------|------------|-----------------|-----------|
| CPU 바 | `BoxGeometry` + `MeshStandardMaterial` | FBX/GLTF 메쉬 — 서버 랙/회로판 형태 | Stage 5+ |
| RAM 바 | `BoxGeometry` + `MeshStandardMaterial` | FBX/GLTF 메쉬 — 메모리 칩/모듈 형태 | Stage 5+ |
| Temp 구 | `SphereGeometry` + `MeshStandardMaterial` | FBX/GLTF 메쉬 — 온도계/센서 형태 | Stage 5+ |
| 날씨 아이콘 | `Sprite` + Canvas 이모지 | 고해상도 Sprite 시트 또는 3D 아이콘 메쉬 | Stage 5+ |
| 날씨 레이블 | `Sprite` + Canvas 텍스트 | 동일 구조 유지, 폰트/디자인 개선 가능 | Stage 4d+ |

**임시 메쉬 사용 이유**:
1. 3D 공간 배치와 상호작용 로직을 먼저 검증
2. 실제 에셋 제작/수급 전까지 기능 개발 진행
3. 메쉬 교체 시 `metrics-3d.ts` 낭비 생성자만 교체하면 됨 — 위치/상호작용 로직은 그대로 유지

---

## 12. 향후 확장 (Stage 4d+)

- **Stage 4d (Atmosphere Effects)**: 메트릭 주변에 글로우 파티클, 먼지 효과
- **Stage 5a (FBX Avatar)**: 메트릭이 아바타 주변에 호버링 형태로 재배치 가능
- **애니메이션 메트릭**: CPU 바가 실시간으로 진동하는 효과 (load 변동 반영)
- **메쉬 에셋 통합**: FBX/GLTF 로더로 임시 BoxGeometry/SphereGeometry 교체
