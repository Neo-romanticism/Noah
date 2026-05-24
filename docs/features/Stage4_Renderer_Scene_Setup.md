# Stage 4: Three.js Renderer and Scene Setup — Implementation Report

> **Status**: ✅ Complete  
> **Date**: 2026-05-24  
> **Tests**: 252 passed (236 existing + 16 new)  
> **Build**: `npm run build` clean

---

## 1. Executive Summary

Stage 4 transforms Noah from a flat system-metrics overlay into a **3D living space**. The renderer now displays Noah's room (bed, desk, floor, walls, window) with proper lighting and shadows, a placeholder avatar that will be replaced by an FBX model, and integrates all Stage 3 system-awareness UI elements into this 3D environment.

### Key Achievements

| Metric | Before (Stage 3) | After (Stage 4) |
|--------|-----------------|-----------------|
| Renderer modules | 1 (`index.ts`) | 9 (scene, room×5, avatar, ui, index) |
| Lines in `renderer/index.ts` | 139 | 87 (-37%) |
| 3D objects in scene | 4 (bgPlane, cpuBar, ramBar, tempDot) | 20+ (room + avatar + UI) |
| Test coverage | 236 tests | 252 tests (+16) |
| Shadow support | ❌ None | ✅ Directional + Ambient + Fill |

---

## 2. Architecture Overview

```
src/renderer/
├── index.ts          # Orchestrator: scene → room → avatar → UI → IPC → animate
├── scene/
│   └── index.ts      # SceneContext, createScene(), setupLighting(), handleResize()
├── room/
│   ├── index.ts      # buildRoom(): assembles all room elements
│   ├── floor.ts      # createFloor(): wooden floor plane
│   ├── walls.ts      # createWalls(): back (with window hole), left, right
│   ├── bed.ts        # createBed(): frame, mattress, pillow, blanket, headboard
│   ├── desk.ts       # createDesk(): top, legs, mini PC monitor with glow
│   └── window.ts     # createWindow(): frame, cross bars, sill
├── avatar/
│   └── index.ts      # loadAvatar(), createPlaceholderAvatar(), updateAvatar()
└── ui/
    └── metrics.ts    # createMetricsUI(), updateMetricsUI() (Stage 3 extraction)
```

### Design Principles

1. **Separation of Concerns**: Each file has a single responsibility. `index.ts` is purely an orchestrator.
2. **Composability**: Room elements are independent functions returning `THREE.Group` or `THREE.Mesh`. They can be repositioned or reused.
3. **Graceful Degradation**: FBX avatar loading fails? Placeholder appears instantly. No model file? Build still passes.
4. **GDD Compliance**: Camera angle, room scale, and element placement follow `gdd/core/world.md` specifications.

---

## 3. Slice-by-Slice Implementation Detail

### Slice 1: Scene Architecture Refactoring

**File**: `src/renderer/scene/index.ts`

#### `createScene(container)`

Creates the foundational Three.js context:

```typescript
const scene = new THREE.Scene();
scene.background = null; // Transparent overlay

const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
camera.position.set(0, 1.2, 3.5);
camera.lookAt(0, 0.3, 0); // Look at center of room, slightly elevated

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

**Key decisions**:
- **Camera position `(0, 1.2, 3.5)`**: Slightly above and back from the room center. Provides a "dollhouse" view where user can see into the room.
- **LookAt `(0, 0.3, 0)`**: Targets slightly above floor level (where Noah stands), not the geometric center.
- **ShadowMap enabled**: `PCFSoftShadowMap` for soft, realistic shadows without performance cost.

#### `setupLighting(scene)`

Three-light setup (classic 3-point lighting adapted for indoor):

| Light | Type | Color | Intensity | Position | Purpose |
|-------|------|-------|-----------|----------|---------|
| Ambient | `AmbientLight` | 0xffffff | 0.5 | — | Base fill, prevents pure black shadows |
| Key | `DirectionalLight` | 0xffffff | 0.8 | (5, 8, 5) | Main light source, casts shadows |
| Fill | `DirectionalLight` | 0xb0c4de | 0.3 | (-3, 4, -2) | Cool blue fill from opposite side |

**Key decisions**:
- Key light `castShadow = true` with `shadow.mapSize = 1024×1024`. Sufficient for desktop companion scale.
- Fill light adds dimensionality without competing with the key light.

#### `handleResize(ctx)`

Standard responsive handler updating camera aspect and renderer size on window resize.

---

### Slice 2: Room Geometry Construction

**File**: `src/renderer/room/index.ts` — `buildRoom()`

#### Floor (`floor.ts`)

```typescript
const geometry = new THREE.PlaneGeometry(6, 4);
const material = new THREE.MeshStandardMaterial({
  color: 0x8b7355,  // Warm wood brown
  roughness: 0.8,
  metalness: 0.1,
});
```

- **Size**: 6×4 units — large enough for bed + desk + walking space.
- **Material**: `MeshStandardMaterial` with high roughness (matte wood feel).
- **Shadow**: `receiveShadow = true`.

#### Walls (`walls.ts`)

Back wall is constructed from **4 pieces** to create a window hole:

```
┌─────────┬─────────┐
│  left   │  right  │  ← top section (above window)
├─────────┼─────────┤
│         │         │
│ window  │  hole   │  ← window opening
│         │         │
├─────────┼─────────┤
│  left   │  right  │  ← bottom section (below window)
└─────────┴─────────┘
```

- **Back wall**: 4 `PlaneGeometry` pieces (left, right, top, bottom of window hole).
- **Left/Right walls**: Single `PlaneGeometry` each, rotated 90° on Y-axis.
- **Material**: Off-white `0xf5f0e8` (cozy bedroom feel).

#### Bed (`bed.ts`)

5-component bed:

| Component | Geometry | Material | Position (relative) |
|-----------|----------|----------|---------------------|
| Frame | `BoxGeometry(1.2, 0.2, 1.8)` | Dark wood `0x5c4033` | y=0.1 |
| Mattress | `BoxGeometry(1.1, 0.15, 1.7)` | White `0xffffff` | y=0.275 |
| Pillow | `BoxGeometry(0.7, 0.1, 0.35)` | Off-white `0xf0f0f0` | y=0.375, z=-0.6 |
| Blanket | `BoxGeometry(1.15, 0.08, 1.1)` | Cornflower blue `0x6495ed` | y=0.34, z=0.2 |
| Headboard | `BoxGeometry(1.2, 0.6, 0.08)` | Dark wood `0x5c4033` | y=0.4, z=-0.9 |

**GDD compliance**: "Bed (where Noah sleeps)" — positioned at `(-1.2, -0.5, -0.5)` in room space.

#### Desk (`desk.ts`)

8-component desk with mini PC monitor:

| Component | Geometry | Material |
|-----------|----------|----------|
| Desktop | `BoxGeometry(1.0, 0.06, 0.6)` | Wood `0x8b6914` |
| 4 Legs | `BoxGeometry(0.05, 0.5, 0.05)` | Metal `0x4a4a4a` |
| Monitor base | `BoxGeometry(0.15, 0.02, 0.12)` | Dark plastic `0x333333` |
| Monitor stand | `BoxGeometry(0.03, 0.12, 0.03)` | Dark plastic |
| Monitor screen | `BoxGeometry(0.3, 0.2, 0.02)` | Dark bezel `0x1a1a2e` |
| Screen glow | `PlaneGeometry(0.26, 0.16)` | Blue glow `0x4a90d9` (MeshBasicMaterial) |

**GDD compliance**: "Desk (with miniature PC monitor)" — positioned at `(1.0, -0.5, -0.3)`.

**Monitor glow**: `MeshBasicMaterial` creates an emissive screen effect without requiring actual emission (simpler, performs better).

---

### Slice 3: Dynamic Window Element

**File**: `src/renderer/room/window.ts` + `src/renderer/room/index.ts`

#### Window Frame

Constructed from 7 pieces:

| Piece | Geometry | Purpose |
|-------|----------|---------|
| Top frame | `BoxGeometry(1.8, 0.06, 0.08)` | Upper border |
| Bottom frame | `BoxGeometry(1.8, 0.06, 0.08)` | Lower border |
| Left frame | `BoxGeometry(0.06, 1.4, 0.08)` | Left border |
| Right frame | `BoxGeometry(0.06, 1.4, 0.08)` | Right border |
| Vertical bar | `BoxGeometry(0.04, 1.4, 0.048)` | Middle vertical |
| Horizontal bar | `BoxGeometry(1.8, 0.04, 0.048)` | Middle horizontal |
| Window sill | `BoxGeometry(2.0, 0.06, 0.2)` | Extended sill |

#### Weather-Reactive Sky (`windowLight`)

Behind the window frame, a `PlaneGeometry(1.6, 1.2)` with `MeshBasicMaterial` acts as the "sky":

```typescript
// In room/index.ts
const skyGeo = new THREE.PlaneGeometry(1.6, 1.2);
const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb });
const skyPlane = new THREE.Mesh(skyGeo, skyMat);
skyPlane.position.set(0, 0, -0.06); // Slightly behind window frame
windowGroup.add(skyPlane);
```

**Weather color mapping** (from `sensory.ts`):

| Weather | Color | Hex | System Condition |
|---------|-------|-----|------------------|
| sunny | Sky blue | `#87ceeb` | All metrics comfortable |
| cloudy | Light steel blue | `#b0c4de` | 1 metric elevated |
| rainy | Slate gray | `#708090` | 2 metrics elevated |
| stormy | Dark slate gray | `#2f4f4f` | Critical load/temp/RAM |

**Update flow**:

```
SystemPoller → IPC 'system:metrics' → renderer/index.ts
    → deriveWeather(metrics) → weatherColor(weather)
    → room.windowLight.material.color.set(winColor)
```

**GDD compliance**: "Window: Shows time of day, can show system load as 'weather'" — implemented as dynamic sky color.

---

### Slice 4: FBXLoader Avatar Pipeline

**File**: `src/renderer/avatar/index.ts`

#### Dynamic FBXLoader Import

```typescript
let FBXLoaderModule: typeof import('three/examples/jsm/loaders/FBXLoader.js') | null = null;

async function getFBXLoader() {
  if (FBXLoaderModule) return FBXLoaderModule;
  FBXLoaderModule = await import('three/examples/jsm/loaders/FBXLoader.js');
  return FBXLoaderModule;
}
```

**Why dynamic import?**
- `three/examples/jsm/loaders/FBXLoader.js` is a large module.
- If imported statically, webpack/tsc may fail if the path resolution differs between versions.
- Dynamic import allows the app to start even if FBXLoader has issues — the fallback placeholder avatar ensures Noah is always visible.

#### `loadAvatar(scene, config)`

```typescript
export async function loadAvatar(
  scene: THREE.Scene,
  config: AvatarConfig
): Promise<LoadedAvatar | null>
```

**Flow**:
1. Dynamically import FBXLoader.
2. Load `.fbx` file via `FBXLoader.load()`.
3. Apply scale (default: 0.01 — FBX models are often in centimeters).
4. Apply position (default: `(0, -0.5, 0)` — standing on floor).
5. Create `AnimationMixer` if animations exist.
6. Enable `castShadow`/`receiveShadow` on all meshes via `traverse()`.
7. Add to scene.
8. Return `LoadedAvatar` object.

**On failure**: Returns `null`. Caller (`renderer/index.ts`) falls back to placeholder.

#### `createPlaceholderAvatar(scene)`

When no FBX model is available, a stylized capsule avatar appears:

```
    ◯        ← Head (Sphere, 0.12 radius, skin color)
   / \
  |   |      ← Body (Capsule, 0.15 radius, 0.4 height, pink)
  |   |
   \ /
   · ·       ← Eyes (2 small spheres, dark gray)
```

| Component | Geometry | Material | Position |
|-----------|----------|----------|----------|
| Body | `CapsuleGeometry(0.15, 0.4, 4, 8)` | Pink `0xffb6c1` | y=0.35 |
| Head | `SphereGeometry(0.12, 16, 16)` | Skin `0xffe4c4` | y=0.72 |
| Left eye | `SphereGeometry(0.02, 8, 8)` | Dark `0x333333` | (-0.04, 0.74, 0.1) |
| Right eye | `SphereGeometry(0.02, 8, 8)` | Dark `0x333333` | (0.04, 0.74, 0.1) |

**Design rationale**:
- **Capsule body**: Simple, recognizable humanoid shape. `CapsuleGeometry` (Three.js r133+) gives rounded edges.
- **Pink color**: Distinctive, friendly, non-realistic (clearly "digital being").
- **Eyes**: Two dots provide minimal but effective facial recognition — users instinctively see a face.

#### `updateAvatar(avatar, deltaTime)`

Called every frame in the animation loop. Updates `AnimationMixer` if present:

```typescript
export function updateAvatar(avatar: LoadedAvatar, deltaTime: number): void {
  if (avatar.mixer) {
    avatar.mixer.update(deltaTime);
  }
}
```

**Future integration**: When FBX animations are loaded (idle, sleep, walk, etc.), this function will drive them.

---

### Slice 5: Stage 3 UI Integration

**File**: `src/renderer/ui/metrics.ts`

#### Extraction Rationale

Stage 3's system metrics UI (CPU bar, RAM bar, temp dot, bg plane) was inline in `renderer/index.ts`. Stage 4 extracts it to a dedicated module because:

1. **Separation**: 3D room construction and 2D UI overlay are different concerns.
2. **Reusability**: Metrics UI can be tested independently.
3. **Positioning**: In Stage 3, bars were at `y=1.5, 1.35` (center screen). In Stage 4, they're repositioned to `y=1.6, 1.48` (above the room, clearly visible).

#### `createMetricsUI()`

Returns a `MetricsUI` object with all elements grouped:

```typescript
export interface MetricsUI {
  cpuBar: THREE.Mesh;      // PlaneGeometry(1.2, 0.08)
  ramBar: THREE.Mesh;      // PlaneGeometry(1.2, 0.08)
  tempDot: THREE.Mesh;     // CircleGeometry(0.06, 32)
  bgPlane: THREE.Mesh;     // PlaneGeometry(20, 20) — weather background
  group: THREE.Group;      // All elements grouped
}
```

#### `updateMetricsUI(ui, metrics)`

Pure function that updates all visual elements based on `SystemMetrics`:

```typescript
export function updateMetricsUI(ui: MetricsUI, metrics: SystemMetrics): void {
  // CPU bar: color (green→yellow→orange→red) + scale (0.5–2.0×)
  // RAM bar: color (blue→purple→pink) + scale
  // Temp dot: color (gray→green→yellow→red)
  // Background: weather color (sunny→stormy)
}
```

**Positioning in 3D space**:

| Element | Position | Z-depth | Purpose |
|---------|----------|---------|---------|
| bgPlane | (0, 0, -2) | Behind room | Weather sky background |
| cpuBar | (0, 1.6, 0.5) | In front of room | CPU load visualization |
| ramBar | (0, 1.48, 0.5) | In front of room | RAM usage visualization |
| tempDot | (0.8, 1.6, 0.5) | In front of room | Temperature indicator |

---

## 4. Renderer Entry Point (`index.ts`)

The main orchestrator is now clean and declarative:

```typescript
// 1. Scene
const ctx = createScene(container);
setupLighting(ctx.scene);
handleResize(ctx);

// 2. Room
const room = buildRoom(ctx);

// 3. Metrics UI (Stage 3)
const metricsUI = createMetricsUI();
ctx.scene.add(metricsUI.group);

// 4. Avatar (async — FBX or placeholder)
let avatar: LoadedAvatar | null = null;
void initAvatar(); // async, non-blocking

// 5. IPC
noah.onSystemMetrics((metrics) => {
  updateMetricsUI(metricsUI, metrics);
  const weather = deriveWeather(metrics);
  (room.windowLight.material as THREE.MeshBasicMaterial)
    .color.set(weatherColor(weather));
});

// 6. Animation loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (avatar) updateAvatar(avatar, delta);
  ctx.renderer.render(ctx.scene, ctx.camera);
}
animate();
```

**Line count reduction**: 139 → 87 lines (-37%). All implementation detail moved to modules.

---

## 5. Testing Strategy

### New Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `tests/renderer/room.test.ts` | 6 | Bed, desk, floor, walls, window, materials |
| `tests/renderer/avatar.test.ts` | 5 | Placeholder creation, meshes, position, shadows, update |
| `tests/renderer/metrics-ui.test.ts` | 5 | Creation, CPU color, RAM scale, weather background |

### Test Environment

- **`jest-environment-jsdom`**: Required for DOM APIs (`document.getElementById`, `window.innerWidth`).
- **`canvas`**: Required for Three.js `WebGLRenderer` (provides `HTMLCanvasElement.getContext('webgl')` mock).
- **Note**: Room and avatar tests use `THREE.Scene` directly (no WebGLRenderer), avoiding WebGL context issues.

### Test Patterns

```typescript
// Room component test
const bed = createBed();
const meshes = bed.children.filter((c) => (c as THREE.Mesh).isMesh);
expect(meshes.length).toBe(5); // frame, mattress, pillow, blanket, headboard

// Metrics UI test
const ui = createMetricsUI();
updateMetricsUI(ui, { cpuLoad: 95, ramUsage: 90, cpuTemp: 90, uptime: 0, processes: [] });
expect((ui.cpuBar.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xef4444);
```

---

## 6. GDD Compliance Checklist

| GDD Requirement | Implementation | Status |
|-----------------|----------------|--------|
| "Small, cozy" room | 6×4 floor, 2.5m walls | ✅ |
| "Bed (where Noah sleeps)" | 5-component bed at `(-1.2, -0.5, -0.5)` | ✅ |
| "Desk (with miniature PC monitor)" | Desk + glowing monitor at `(1.0, -0.5, -0.3)` | ✅ |
| "Window (shows abstract outside)" | Window frame + weather-reactive sky plane | ✅ |
| "Fixed, slight angle" camera | `(0, 1.2, 3.5)` looking at `(0, 0.3, 0)` | ✅ |
| "Desktop-sized, not screen-filling" | Room fits in 400×600 window, camera distance 3.5 | ✅ |
| "Warm but digital" aesthetic | Wood tones + off-white walls + blue glow | ✅ |

---

## 7. Known Limitations & Future Work

### Current Limitations

1. **No FBX model included**: `assets/models/` is empty. Placeholder avatar is always used until an FBX file is added.
2. **No animation states**: Placeholder avatar is static. FBX `AnimationMixer` is prepared but no clips are played.
3. **No interaction**: Click/drag on room elements or avatar is not yet implemented.
4. **Window is static**: The window frame doesn't open/close. No curtains or blinds.
5. **Single room**: Only "Default" room exists. Garden/Gaming/Minimal rooms (Level 20/35/50) are future work.

### Stage 5 Integration Points

The following are intentionally prepared for Stage 5:

| Stage 5 Feature | Stage 4 Preparation |
|-----------------|---------------------|
| FBX animation playback | `LoadedAvatar.mixer` + `LoadedAvatar.animations` ready |
| Avatar emotion states | `noah.onStateUpdate()` callback exists, ready to drive animation selection |
| Click/drag interaction | `renderer.domElement` is accessible; raycasting can be added |
| Walk to bed/desk/window | Room objects have known positions; pathfinding can be added |
| Time-of-day lighting | `windowLight` color system can be extended with actual time |

---

## 8. Build & Test Verification

```bash
# Build
$ npm run build
> tsc:main ✓
> tsc:renderer ✓
> copy-assets ✓

# Tests
$ npm test
> Test Suites: 12 passed, 12 total
> Tests:       252 passed, 252 total
```

### Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `jest-environment-jsdom` | ^29.x | DOM environment for renderer tests |
| `canvas` | ^2.x | Node.js canvas implementation for WebGL mocking |

---

## 9. File Change Summary

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Added `jest-environment-jsdom`, `canvas` to devDependencies |
| `src/renderer/index.ts` | Complete rewrite: modular orchestrator (-52 lines) |

### New Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/renderer/scene/index.ts` | 55 | Scene, camera, renderer, lighting, resize |
| `src/renderer/room/index.ts` | 48 | Room builder (assembles all elements) |
| `src/renderer/room/floor.ts` | 15 | Floor mesh |
| `src/renderer/room/walls.ts` | 46 | Wall meshes (with window hole) |
| `src/renderer/room/bed.ts` | 55 | Bed components |
| `src/renderer/room/desk.ts` | 61 | Desk + monitor components |
| `src/renderer/room/window.ts` | 56 | Window frame |
| `src/renderer/avatar/index.ts` | 149 | FBX loader + placeholder avatar |
| `src/renderer/ui/metrics.ts` | 91 | Stage 3 metrics UI (extracted) |
| `tests/renderer/room.test.ts` | 77 | Room component tests |
| `tests/renderer/avatar.test.ts` | 55 | Avatar system tests |
| `tests/renderer/metrics-ui.test.ts` | 71 | Metrics UI tests |

**Total new code**: ~789 lines (TypeScript + tests)  
**Total modified code**: ~102 lines (`package.json` + `renderer/index.ts`)

---

*Document written by Kimi Code CLI*  
*For questions or corrections, see `TODO.md` or `gdd/core/world.md`*
