# Stage 5: Avatar Loading and Animation System — Detailed Implementation Plan

> **Document Type:** Technical Implementation Plan
> **Target:** Noah Desktop Companion Application
> **Estimated Duration:** 3–4 weeks (solo developer)
> **Status:** 📋 Planning Complete
> **Last Updated:** 2026-06-01

---

## 1. Executive Summary

Stage 5 brings Noah to life. While the GLB/VRM migration (STAGE-05b) successfully loads the 3D model with proper materials, the avatar is currently **a static statue** — no animations, no facial expressions, no emotional body language.

This stage implements:
- A **priority-based animation queue** that manages overlapping animation requests without popping
- A **VRM expression/blend shape controller** for facial expressions using `@pixiv/three-vrm`'s `VRMExpressionManager`
- An **animation catalog** mapping 10 triggers to specific animation clips or procedural behaviors
- A **16-emotion mapping table** translating `Emotion` type → face expression + body animation + dialog category + TTS parameters
- **Smooth transition interpolation** between animations using crossfade
- A **fallback procedural animation system** for the placeholder avatar when the VRM model fails to load
- **Animation asset pipeline** — process/import animation files into `assets/animations/`

By the end of this stage, Noah will blink, breathe (idle), react to being dragged/thrown/petted, display emotional expressions on her face, and move with natural transitions between states.

---

## 2. Current State Assessment

### ✅ Already Implemented

| Component | Status | Details |
|-----------|--------|---------|
| VRM/GLB model loading | ✅ Complete | `loadAvatar()` in `avatar.ts` using `GLTFLoader` + `@pixiv/three-vrm` |
| Placeholder avatar | ✅ Complete | `createPlaceholderAvatar()` — capsule body + sphere head + 2 dot eyes |
| Material enhancement | ✅ Complete | `enhanceMaterial()` with skin/hair/eye/mouth/clothing PBR presets |
| Scene cleanup | ✅ Complete | `removeEmbeddedLights()`, `removeGroundPlanes()`, `hideOutlineMeshes()` |
| Avatar update loop | ✅ Complete | `avatar.update(delta)` calls `vrm.update(delta)` + `mixer.update(delta)` |
| Interaction detection | ✅ Complete | Click, drag, pet detectors in `src/renderer/interaction/` |
| Shared types | ✅ Complete | 16 `Emotion` types, `InteractionEvent`, `InteractionType` all defined |
| GDD specifications | ✅ Complete | Emotion→expression mapping spec, animation→interaction mapping spec |
| Avatar unit tests | ✅ Complete | 325 lines, 12+ test cases for loading, materials, cleanup |
| GLTF pipeline tests | ✅ Complete | `gltf-pipeline.test.ts` with VRM stubs |

### ❌ Not Yet Implemented

| Component | Priority | Details |
|-----------|----------|---------|
| Animation asset files | 🔴 Critical | `assets/animations/` contains 10 `.glb` files (idle, drag, throw, land, dizzy, eat, sleep, happy, sad, angry) — Mixamo FBX → VRM-retargeted GLB pipeline complete |
| Animation controller | 🔴 Critical | No priority queue, no crossfade, no animation state machine |
| Animation catalog | 🔴 Critical | 10 trigger animations (idle, drag, throw, land, dizzy, eat, sleep, happy, sad, angry) not wired |
| VRM blend shape controller | 🔴 Critical | No integration with `VRMExpressionManager` for facial expressions |
| 16-emotion mapping | 🔴 Critical | No mapping from `Emotion` type → expression + animation + dialog + TTS |
| Transition interpolation | 🟡 High | No crossfade between animations; immediate cut would cause popping |
| Placeholder animation | 🟡 High | Placeholder has only `update() { /* no-op */ }` — no procedural animation |
| Emotion→expression presets | 🟡 High | Need preset blend shape values per emotion (joy, sadness, anger, etc.) |
| TTS parameter mapping | 🟢 Low | Emotion→TTS parameters (speed, pitch, tone) is deferred to Stage 8 |
| Dialog category mapping | 🟢 Low | Emotion→dialog category is deferred to Stage 8 |

### 📝 Known Gaps

| Gap | Impact | Resolution |
|-----|--------|------------|
| No animation files exist | Cannot test or develop animation system | Use procedural/generated animations for development; source real animations from Mixamo, VRM marketplace, or Blender |
| VRM animations may require VRM-specific format | Standard GLB animations may not map to VRM bones correctly | ✅ Mixamo FBX → Blender retargeting → GLB pipeline implemented (`scripts/blender/convert_mixamo_to_glb.py`); fall back to procedural animations |
| Placeholder avatar has no skeleton | Cannot use `AnimationMixer` with placeholder | Implement procedural animation (floating, bobbing, tilting) using direct `Object3D` manipulation |
| 16 emotions need body pose mapping | Some emotions differ only subtly in expression | Define tiered presets — 5 primary emotions get distinct poses; 11 secondary emotions share with intensity variation |

---

## 3. Detailed Objectives

### Objective 1: Animation Asset Pipeline

**Goal:** Source or generate animation files for the 10-trigger catalog and establish the pipeline for importing them into the project.

**Tasks:**
1. Audit `assets/animations/` and confirm it is empty
2. Determine animation source strategy:
   - **Option A:** Download Mixamo animations as FBX, convert to GLB via Blender (free, large library) ✅ **IMPLEMENTED**
   - **Option B:** Create simple procedural animations in Blender (full control, time-intensive)
   - **Option C:** Use VRM marketplace animations (VRM-native, may need licensing)
   - **Recommendation:** Option A (Mixamo) for body animations + procedural fallback for facial expressions
3. Create `scripts/blender/convert_animations.py` — batch converter:
   - Import FBX animation
   - Retarget to Noah's armature
   - Export as GLB with animation only (no mesh)
4. Create animation manifest `assets/animations/manifest.json`:
   ```json
   {
     "idle": { "file": "idle.glb", "loop": true, "priority": 0, "blendIn": 0.3 },
     "drag": { "file": "drag.glb", "loop": true, "priority": 2, "blendIn": 0.15 },
     "throw": { "file": "throw.glb", "loop": false, "priority": 3, "blendIn": 0.1 },
     ...
   }
   ```
5. Generate or source placeholder animations for development:

   | Animation | Source Strategy | Priority |
   |-----------|----------------|----------|
   | `idle` | Mixamo "Idle" → GLB ✅ | 🔴 Critical |
   | `drag` | Mixamo "Drag" → GLB ✅ | 🟡 High |
   | `throw` | Mixamo "Throw" → GLB ✅ | 🟡 High |
   | `land` | Mixamo "Land" → GLB ✅ | 🟡 High |
   | `dizzy` | Mixamo "Dizzy" → GLB ✅ | 🟢 Medium |
   | `eat` | Mixamo "Eat" → GLB ✅ | 🟢 Medium |
   | `sleep` | Mixamo "Sleep" → GLB ✅ | 🟢 Medium |
   | `happy` | Mixamo "Happy" → GLB ✅ | 🟢 Medium |
   | `sad` | Mixamo "Sad" → GLB ✅ | 🟢 Medium |
   | `angry` | Mixamo "Angry" → GLB ✅ | 🟢 Medium |

6. Update `copy-assets` in `package.json` to include `assets/animations/`:

   Current:
   ```bash
   cp assets/models/noah.glb dist/renderer/renderer/models/
   ```

   After:
   ```bash
   mkdir -p dist/renderer/renderer/models dist/renderer/renderer/animations && \
   cp assets/models/noah.glb dist/renderer/renderer/models/ && \
   cp assets/animations/*.glb assets/animations/manifest.json dist/renderer/renderer/animations/
   ```

7. Path resolution convention: manifest.json uses relative paths resolved at runtime.
   - `loadAnimationManifest('./animations/manifest.json')` resolves to `dist/renderer/renderer/animations/manifest.json`
   - Each entry's `file` field in manifest (e.g., `"file": "idle.glb"`) is relative to the manifest's directory
   - `loadAnimationClips()` prepends the base path: `${basePath}/${entry.file}`
   - This mirrors the existing model path convention (`./models/noah.glb` in `index.ts`)

**Success Criteria:**
- [ ] `assets/animations/` contains at least `idle.glb` (or procedural fallback for all)
- [ ] `manifest.json` defines all 10 animations with correct looping and priority
- [ ] `copy-assets` copies animation files to dist
- [ ] Animations load without error in `GLTFLoader`

---

### Objective 2: Animation Controller (Priority Queue + State Machine)

**Goal:** Build an animation system that manages multiple simultaneous animation requests, resolves conflicts by priority, and transitions smoothly between states.

**Tasks:**

**2.1 Create `src/renderer/animation/types.ts` — Animation domain types**

```typescript
export type AnimationTrigger =
  | 'idle' | 'drag' | 'throw' | 'land' | 'dizzy'
  | 'eat' | 'sleep' | 'happy' | 'sad' | 'angry';

export interface AnimationClipData {
  trigger: AnimationTrigger;
  clip: THREE.AnimationClip;
  loop: boolean;
  priority: number;     // 0 (lowest) - 10 (highest)
  blendIn: number;      // crossfade duration in seconds
  blendOut: number;
}

export interface AnimationRequest {
  trigger: AnimationTrigger;
  priority: number;
  blendIn: number;
  onComplete?: () => void;
}
```

**2.2 Create `src/renderer/animation/controller.ts` — Priority animation controller**

Core logic:
```
Current state: running animation with priority P_c
New request: priority P_r

if P_r > P_c:
    Crossfade: current → new (blendIn seconds)
    Set current = new animation
elif P_r == P_c:
    Queue request (FIFO within same priority)
else:
    Reject request (or queue if current finishes)
```

```typescript
export class AnimationController {
  private mixer: THREE.AnimationMixer;
  private currentAction: THREE.AnimationAction | null = null;
  private currentPriority: number = -1;
  private queue: AnimationRequest[] = [];
  private clips: Map<AnimationTrigger, AnimationClipData> = new Map();

  constructor(root: THREE.Object3D, animations: THREE.AnimationClip[]);

  registerClip(data: AnimationClipData): void;
  play(request: AnimationRequest): boolean;     // returns true if accepted
  stop(trigger: AnimationTrigger): void;
  stopAll(): void;
  update(delta: number): void;                   // called each frame
  getCurrentTrigger(): AnimationTrigger | null;
  getQueuedCount(): number;
  dispose(): void;
}
```

Key behaviors:
- On new higher-priority request: crossfade via `AnimationAction.crossFadeFrom()`
- On animation end (non-looping): crossfade back to highest-priority looping animation (usually `idle`)
- Queue processing: after current animation ends, dequeue next if priority ≥ current
- `idle` always runs at priority 0 and is the default fallback

**2.3 Crossfade interpolation**
- Use `AnimationAction.crossFadeFrom(existingAction, blendIn, true)` for transitions
- Set `loop = THREE.LoopOnce` for non-looping animations with `clampWhenFinished = true`
- On non-looping completion: emit event, automatically transition to `idle` or next queued

**Success Criteria:**
- [ ] Priority system: high-priority animation interrupts low-priority
- [ ] Same-priority requests queue FIFO
- [ ] Lower-priority requests are rejected or queued
- [ ] Crossfade transitions are smooth (no popping)
- [ ] Non-looping animations return to idle on completion
- [ ] `update(delta)` drives the mixer and processes queue

---

### Objective 3: Animation Catalog with Manifest Loading

**Goal:** Load and register all animation clips from `assets/animations/` using the manifest, making them available to the controller.

**Tasks:**

**3.1 Create `src/renderer/animation/loader.ts` — Animation loader**

```typescript
export async function loadAnimationManifest(
  manifestPath: string
): Promise<AnimationManifest>;

export async function loadAnimationClips(
  manifest: AnimationManifest,
  basePath: string
): Promise<AnimationClipData[]>;
```

Implementation:
- Fetch and parse `manifest.json`
- For each entry, load the GLB file via `GLTFLoader` and extract `.animations[0]`
- If loading fails: log warning and use procedural fallback
- Return array of `AnimationClipData` for registration with `AnimationController`

**3.2 Create `src/renderer/animation/placeholder.ts` — Procedural animation controller for placeholder avatar**

For the fallback avatar (when VRM is unavailable), a `PlaceholderAnimController` implements the same `AnimationController` interface but drives motion via direct `Object3D` manipulation instead of `AnimationMixer`:

```typescript
export class PlaceholderAnimController implements AnimationController {
  constructor(
    private parts: { body: THREE.Mesh; head: THREE.Mesh; leftEye: THREE.Mesh; rightEye: THREE.Mesh },
    private group: THREE.Group,
  );

  play(request: AnimationRequest): boolean;
  stop(trigger: AnimationTrigger): void;
  stopAll(): void;
  update(delta: number): void;
  getCurrentTrigger(): AnimationTrigger | null;
  dispose(): void;
}
```

(Full procedural behavior specification for all 10 triggers is detailed in Objective 7.)

**Success Criteria:**
- [ ] `loadAnimationManifest()` parses `manifest.json` correctly
- [ ] `loadAnimationClips()` returns `AnimationClipData[]` for valid entries
- [ ] Missing/broken animation files log warning and do not crash
- [ ] `PlaceholderAnimController` implements the same interface as `AnimationController`
- [ ] Placeholder animations drive position/rotation/scale changes via direct `Object3D` manipulation
- [ ] VRM animations load via `loadAnimationClips()` and register with `AnimationController`

---

### Objective 4: VRM Blend Shape / Expression Controller

**Goal:** Hook into `@pixiv/three-vrm`'s `VRMExpressionManager` to control Noah's facial expressions.

**Tasks:**

**4.1 Create `src/renderer/animation/expression.ts` — Expression controller**

```typescript
export interface ExpressionState {
  current: Emotion;
  intensity: number;        // 0.0 - 1.0
  target: Emotion | null;   // transitioning to
  transitionProgress: number;
}

export class ExpressionController {
  private vrm: any;  // VRM instance from @pixiv/three-vrm
  private currentExpressions: Map<string, number> = new Map();  // expression name → weight

  constructor(vrm: any);
  setExpression(emotion: Emotion, intensity?: number): void;
  blendToExpression(emotion: Emotion, duration: number): void;
  update(delta: number): void;  // drives interpolation
  reset(): void;
  dispose(): void;
}
```

Uses `VRMExpressionManager.setValue(expressionName, weight)` and `VRMExpressionManager.update()`:
- `happy` → `VRMExpressionPresetName.Happy`
- `sad` → `VRMExpressionPresetName.Sad`
- `angry` → `VRMExpressionPresetName.Angry`
- `scared` → `VRMExpressionPresetName.Fear`
- etc.

**4.2 Emotion→VRM Expression Preset Mapping**

```
happy     → preset: happy,   intensity: 0.8
sad       → preset: sad,     intensity: 0.7
angry     → preset: angry,   intensity: 0.8
scared    → preset: fear,    intensity: 0.7
playful   → preset: happy,   intensity: 0.5 + eyebrow raise
tired     → preset: relaxed, intensity: 0.3 + blink slow
hungry    → preset: neutral, intensity: 0.0 (no expression, but mouth open)
sick      → preset: fear,    intensity: 0.3 + pale
traumatized → preset: fear,  intensity: 0.9 + wide eyes
submissive  → preset: sad,   intensity: 0.4 + look down
excited   → preset: happy,   intensity: 1.0 + blink fast
bored     → preset: neutral, intensity: 0.0 + droopy eyes
lonely    → preset: sad,     intensity: 0.5
grateful  → preset: happy,   intensity: 0.6 + soft eyes
jealous   → preset: angry,   intensity: 0.4 + narrowed eyes
hostage   → preset: neutral, intensity: 0.0 + blank stare
```

**4.4 Update ordering requirement**

The `ExpressionController.update()` must call VRM expression methods in the correct order relative to `AnimationController.update()`:

```
AnimationController.update(delta)    // 1. Update body animation mixer
ExpressionController.update(delta)   // 2. Update blend shape interpolation
vrm.update(delta)                    // 3. VRM's own update (applies expressions to model)
```

This ordering ensures:
- Body animation (mixer) applies bone transforms first
- Blend shape interpolation calculates target weights second
- VRM's `vrm.update()` applies both to the rendered model last

The `AnimationSystem.update(delta)` method enforces this order. Testing must verify that the VRM's built-in blink/expression animation does not fight the custom `ExpressionController`.

**4.5 Blink controller**
- Automatic periodic blinking via a simple timer (every 2-4 seconds, ~150ms closure)
- Use `VRMExpressionPresetName.Blink` with weight 1.0
- Blink timer pauses during `angry`, `excited`, `scared` expressions

**Success Criteria:**
- [ ] `setExpression(emotion)` changes VRM face within 1 frame
- [ ] `blendToExpression(emotion, 0.3)` transitions smoothly over 300ms
- [ ] All 16 emotions produce visibly different (or appropriately similar) expressions
- [ ] Blinking occurs naturally every 2-4 seconds
- [ ] No errors logged from VRM expression API

---

### Objective 5: 16-Emotion Mapping Integration

**Goal:** Connect the Emotion Engine (Stage 6) output to the animation system, creating a unified mapping of emotion → expression + body animation + dialog + TTS.

**Tasks:**

**5.1 Create `src/renderer/animation/emotion-mapper.ts` — Emotion→animation mapper**

```typescript
export interface EmotionAnimationMap {
  expression: Emotion;          // blend shape to apply
  expressionIntensity: number;
  bodyAnimation: AnimationTrigger;
  bodyIntensity: number;        // 0.0-1.0, scales animation influence
  dialogCategory: string;       // used by Stage 8
  ttsParams: {                  // used by Stage 8
    speed: number;              // 0.5-2.0
    pitch: number;              // 0.5-2.0
    tone: number;               // 0.0-1.0
  };
}

const EMOTION_ANIMATION_MAP: Record<Emotion, EmotionAnimationMap> = {
  happy:  { expression: 'happy',  expressionIntensity: 0.8, bodyAnimation: 'happy',  bodyIntensity: 0.6, dialogCategory: 'happy',  ttsParams: { speed: 1.1, pitch: 1.2, tone: 0.8 } },
  sad:    { expression: 'sad',    expressionIntensity: 0.7, bodyAnimation: 'sad',    bodyIntensity: 0.5, dialogCategory: 'sad',    ttsParams: { speed: 0.8, pitch: 0.7, tone: 0.3 } },
  angry:  { expression: 'angry',  expressionIntensity: 0.8, bodyAnimation: 'angry',  bodyIntensity: 0.7, dialogCategory: 'angry',  ttsParams: { speed: 1.3, pitch: 0.9, tone: 0.1 } },
  scared: { expression: 'scared', expressionIntensity: 0.7, bodyAnimation: 'dizzy', bodyIntensity: 0.4, dialogCategory: 'scared', ttsParams: { speed: 1.2, pitch: 1.4, tone: 0.2 } },
  // ... remaining 12 emotions
};
```

**5.2 Create `src/renderer/animation/index.ts` — Animation system public API**

```typescript
export class AnimationSystem {
  private controller: AnimationController;
  private expressionCtrl: ExpressionController | null;
  private mapper: EmotionMapper;

  constructor(avatar: IAvatar, manifestPath: string);
  async initialize(): Promise<void>;

  // Called by interaction system (Stage 7)
  playInteraction(interaction: InteractionType): void;

  // Called by emotion engine (Stage 6)
  setEmotion(emotion: Emotion, intensity?: number): void;

  // Called each frame
  update(delta: number): void;

  dispose(): void;
}
```

**5.3 Wire `AnimationSystem` into `src/renderer/index.ts`**

Replace current avatar initialization:

```typescript
// Before:
let avatar: IAvatar;
avatar = await loadAvatar({ ... });
scene.add(avatar.group);

// After:
let avatar: IAvatar;
let animationSystem: AnimationSystem;

avatar = await loadAvatar({ ... });
scene.add(avatar.group);

animationSystem = new AnimationSystem(avatar, './animations/manifest.json');
await animationSystem.initialize();
```

**5.4 Interaction → Animation event bridge**

The `InteractionManager` currently has no mechanism to notify external systems. Add a callback registry:

```typescript
// src/renderer/interaction/index.ts — additions to InteractionManager interface
export interface InteractionEventCallbacks {
  onDragStart?: (position: THREE.Vector2) => void;
  onDragMove?: (position: THREE.Vector2, velocity: THREE.Vector2) => void;
  onDragEnd?: (velocity: THREE.Vector2) => void;
  onPetStart?: () => void;
  onPetMove?: () => void;
  onPetEnd?: () => void;
  onClick?: () => void;
}

// Register animation callbacks after InteractionManager creation
const interaction = createInteractionManager(camera, domElement);
interaction.setEventCallbacks({
  onDragStart: () => animationSystem.playInteraction('drag'),
  onDragEnd: (velocity) => {
    const speed = velocity.length();
    animationSystem.playInteraction(speed > 5 ? 'throw' : 'land');
  },
  onPetStart: () => animationSystem.playInteraction('happy'),
});
```

The `AnimationSystem.playInteraction()` method then maps `InteractionType` to the appropriate `AnimationTrigger` and calls `AnimationController.play()`, handling the `InteractionType → AnimationTrigger` transformation internally.

**Success Criteria:**
- [ ] `EMOTION_ANIMATION_MAP` defines all 16 emotions with unique or tiered mappings
- [ ] `AnimationSystem.setEmotion(emotion)` triggers both expression change and body animation
- [ ] `AnimationSystem.playInteraction(type)` triggers the correct animation (e.g., `drag` → avatar tilts)
- [ ] `update(delta)` drives both expression controller and animation controller
- [ ] Placeholder avatar falls back to procedural animations

---

### Objective 6: Expression Override (Pre-Deception System)

**Goal:** Implement the GDD spec for conscious expression override — Noah can "act" a different emotion than she feels.

**Tasks:**

1. Add `overrideExpression(emotion: Emotion, duration?: number): void` to `AnimationSystem`
2. When override is active:
   - Expression controller shows the override emotion, not the true emotion
   - Body animation uses the true emotion with reduced intensity (subtle leakage)
   - After `duration` expires (or `clearOverride()` called), blend back to true emotion
3. Override state is tracked in the animation system:
   ```typescript
   interface OverrideState {
     fakeEmotion: Emotion;
     trueEmotion: Emotion;
     remaining: number;       // seconds remaining, -1 = indefinite
     leakIntensity: number;   // how much true emotion leaks into body language (0.0-0.3)
   }
   ```

**Success Criteria:**
- [ ] `overrideExpression(sad, 5000)` shows sad face for 5 seconds
- [ ] Body language subtly reveals true emotion (leakIntensity > 0)
- [ ] After duration, face blends back to true emotion
- [ ] `clearOverride()` immediately restores true expression

---

### Objective 7: Placeholder Avatar Procedural Animation

**Goal:** Make the placeholder avatar (capsule + spheres) move with procedural animations when VRM is unavailable.

**Tasks:**

1. Implement procedural animation via direct `Object3D` manipulation in `update()`:

   The placeholder avatar's `THREE.Group` is a flat hierarchy (no skeleton), so `AnimationMixer` + `AnimationClip` property tracks cannot resolve object paths. Instead, use a **state machine in `update()`** that modifies `position`, `rotation`, and `scale` directly each frame.

   ```typescript
   interface ProceduralAnimState {
     trigger: AnimationTrigger;
     elapsed: number;       // seconds since trigger started
     duration: number;      // duration of the current animation
     intensity: number;     // 0.0-1.0 for transitions
   }

   export function createPlaceholderAvatar(): IAvatar {
     const group = new THREE.Group();
     const body = new THREE.Mesh(/* capsule */);
     const head = new THREE.Mesh(/* sphere */);
     const leftEye = new THREE.Mesh(/* sphere */);
     const rightEye = new THREE.Mesh(/* sphere */);

     // Store references for direct manipulation
     const parts = { body, head, leftEye, rightEye };

     // Animation state
     const state: ProceduralAnimState = {
       trigger: 'idle',
       elapsed: 0,
       duration: Infinity,
       intensity: 1,
     };

     return {
       group,
       mixer: null,           // no AnimationMixer — direct manipulation instead
       animations: [],
       animationController: new PlaceholderAnimController(parts, state),
       // update() driven entirely by PlaceholderAnimController, not mixer
       update(delta: number) {
         /* delegate to PlaceholderAnimController which modifies parts directly */
       },
       dispose() { /* ... */ },
     };
   }
   ```

2. Procedural behavior implementations (each modifies `parts` directly):

   | Trigger | Implementation | Duration |
   |---------|---------------|----------|
   | `idle` | `body.position.y = 0.35 + sin(time * 2) * 0.005` (breathing float); `head.rotation.z = sin(time * 1.5) * 0.02` (gentle sway) | Looping |
   | `drag` | `group.rotation.y = lerp(group.rotation.y, targetAngle, 0.1)` — tilt toward drag direction | Looping |
   | `throw` | `group.rotation.y += delta * 12` (720°/s spin); `body.position.y += 0.5 * delta` (rise) | 0.5s |
   | `land` | `body.scale.y = 0.8 + sin(t / 0.3 * PI) * 0.2` (squash + stretch, 1 full cycle) | 0.3s |
   | `dizzy` | `head.rotation.z = sin(time * 20) * 0.3` (rapid wobble); `body.position.x = sin(time * 15) * 0.01` | Looping |
   | `eat` | `head.scale.set(1, 1 + sin(time * 10) * 0.1, 1)` (head bob); `head.position.y = 0.72 + sin(time * 8) * 0.005` | Looping |
   | `sleep` | Rotate group 90° over X (`group.rotation.x → PI/2`); dim body material color to 50% | Looping |
   | `happy` | `group.position.y = 0 + abs(sin(time * 6)) * 0.02` (bounces); `head.rotation.z = sin(time * 4) * 0.1` | Looping |
   | `sad` | `head.position.y = 0.70 + sin(time * 1.5) * 0.003` (droop); `head.rotation.x = 0.15` (tilt forward) | Looping |
   | `angry` | `group.position.x = sin(time * 30) * 0.005` (rapid shake); `head.rotation.z = sin(time * 25) * 0.05` | Looping |

3. Transition between triggers:
   - Store `targetTrigger` and `currentTrigger` in the state
   - On trigger change: reset `elapsed = 0`, crossfade `intensity` from 0 → 1 over `blendIn` seconds
   - Use `intensity` to lerp between the previous animation output and the new one
   - This prevents popping without needing `AnimationMixer`

4. `IAvatar` interface — `animationController` is a required field (not optional):

   ```typescript
   export interface IAvatar {
     group: THREE.Group;
     mixer: THREE.AnimationMixer | null;
     animations: THREE.AnimationClip[];
     animationController: AnimationController;   // required — VRM + placeholder both have one
     vrm?: any;
     update(delta: number): void;
     dispose(): void;
   }
   ```

   Both `loadAvatar()` (VRM path) and `createPlaceholderAvatar()` now return objects with a populated `animationController`. The renderer entry point never needs to null-check it.

5. Create `PlaceholderAnimController` implementing the same interface as `AnimationController` so the `AnimationSystem` treats them uniformly:

   ```typescript
   class PlaceholderAnimController implements AnimationController {
     play(request: AnimationRequest): boolean;
     stop(trigger: AnimationTrigger): void;
     stopAll(): void;
     update(delta: number): void;
     // ...
   }
   ```

**Success Criteria:**
- [ ] Placeholder avatar's `update(delta)` drives visible motion without `AnimationMixer`
- [ ] Idle breathing animation plays continuously (Y float ±0.005)
- [ ] Triggering `drag` causes capsule to tilt toward drag direction
- [ ] Triggering `throw` causes capsule to spin and rise
- [ ] Triggering `land` causes capsule to squash/stretch
- [ ] All 10 triggers produce visible, distinguishable motions
- [ ] Transitions between triggers are smooth (no popping)
- [ ] `dispose()` cleans up state references

---

### Objective 8: Tests

**Tasks:**

1. **Animation Controller Tests** (`tests/renderer/animation/controller.test.ts`):
   - Priority queue ordering (high priority interrupts, low priority rejected)
   - Crossfade timing and completion
   - Non-looping animation returns to idle
   - Queue draining on dispose

2. **Expression Controller Tests** (`tests/renderer/animation/expression.test.ts`):
   - `setExpression()` sets correct VRM expression weight
   - `blendToExpression()` interpolates over given duration
   - Blink controller adds periodic blinks

3. **Emotion Mapper Tests** (`tests/renderer/animation/emotion-mapper.test.ts`):
   - All 16 emotions map to valid expression + body animation + TTS params
   - Intensity clamping (0.0-1.0)
   - Default fallback for unknown emotion

4. **Placeholder Animation Tests** (`tests/renderer/animation/placeholder.test.ts`):
   - `PlaceholderAnimController.play()` starts correct procedural animation
   - Each trigger produces correct position/rotation/scale modifications
   - Transition blending prevents popping between triggers
   - Placeholder avatar's `update()` drives motion without AnimationMixer

5. **Animation Loader Tests** (`tests/renderer/animation/loader.test.ts`):
   - Manifest parsing with valid JSON
   - Error handling for missing manifest
   - Fallback on missing animation file

6. **Integration Test** (`tests/renderer/avatar.test.ts` — extend existing):
   - `loadAvatar()` returns animation controller when VRM has animations
   - Placeholder avatar has animation controller with procedural clips

**Success Criteria:**
- [ ] All new test suites pass
- [ ] Existing tests still pass (no regressions)
- [ ] Coverage for animation domain > 80%

---

## 4. File Structure

### New Files to Create

```
src/
└── renderer/
    └── animation/
        ├── index.ts              # AnimationSystem — public API, orchestrates controller + expression + mapper
        ├── types.ts              # AnimationTrigger, AnimationClipData, AnimationRequest types
        ├── controller.ts         # AnimationController — priority queue, crossfade, state machine
        ├── loader.ts             # loadAnimationManifest(), loadAnimationClips()
        ├── expression.ts         # ExpressionController — VRMExpressionManager wrapper
        ├── emotion-mapper.ts     # EMOTION_ANIMATION_MAP, EmotionMapper class
        └── placeholder.ts        # PlaceholderAnimController — direct Object3D manipulation for capsule avatar

assets/
└── animations/
    ├── manifest.json             # Animation catalog definition
    ├── idle.glb                  # Idle breathing animation
    ├── drag.glb                  # Drag response (tilt)
    ├── throw.glb                 # Throw spin animation
    ├── land.glb                  # Landing animation
    ├── dizzy.glb                 # Dizzy wobble
    ├── eat.glb                   # Eating animation
    ├── sleep.glb                 # Sleeping animation
    ├── happy.glb                 # Happy/dance animation
    ├── sad.glb                   # Sad/cry animation
    └── angry.glb                 # Angry animation

scripts/
└── blender/
    └── convert_animations.py     # Batch FBX→GLB animation converter

tests/
└── renderer/
    └── animation/
        ├── controller.test.ts    # Priority queue + crossfade tests
        ├── expression.test.ts    # VRM expression tests
        ├── emotion-mapper.test.ts # 16-emotion mapping tests
        ├── placeholder.test.ts   # Procedural clip tests
        └── loader.test.ts        # Manifest + file loading tests
```

### Existing Files to Modify

| File | Changes |
|------|---------|
| `src/renderer/avatar.ts` | Extend `IAvatar` with required `animationController: AnimationController` field; update `createPlaceholderAvatar()` to return `PlaceholderAnimController` via direct `Object3D` manipulation; add `animationController` to `loadAvatar()` return with VRM `AnimationController` |
| `src/renderer/index.ts` | Add `AnimationSystem` initialization after avatar load; wire `animate()` to update animation system; connect interaction system callbacks to animation system |
| `src/renderer/interaction/index.ts` | Add `setEventCallbacks()` to `InteractionManager` interface with `onDragStart`, `onDragEnd`, `onPetStart`, `onClick` hooks for animation system |
| `package.json` | Update `copy-assets` to copy `assets/animations/` → `dist/renderer/renderer/animations/` |
| `tests/renderer/avatar.test.ts` | Extend placeholder avatar tests to verify `animationController` is non-null; add procedural animation state tests |

---

## 5. Dependency Graph

```
STAGE-04 (Renderer/Scene) ──────────────────────────────────────────┐
STAGE-05b (VRM/GLB Migration) ──────────────────────────────────────┤
                                                                     ▼
                                                            STAGE-05
                                                            ┌───────┴────────┐
                                                            │                │
                                                     ┌──────▼────┐   ┌─────▼─────┐
                                                     │ Obj. 1    │   │ Obj. 4    │
                                                     │ Animation │   │ VRM Blend │
                                                     │ Assets    │   │ Shapes    │
                                                     └──────┬────┘   └─────┬─────┘
                                                            │              │
                                                     ┌──────▼──────────────▼─────┐
                                                     │ Obj. 2                    │
                                                     │ Animation Controller      │
                                                     │ (Priority Queue +        │
                                                     │  State Machine)          │
                                                     └──────┬───────────────────┘
                                                            │
                                              ┌──────────────┼──────────────┐
                                              │              │              │
                                        ┌─────▼─────┐  ┌────▼────┐  ┌─────▼─────┐
                                        │ Obj. 3    │  │ Obj. 5  │  │ Obj. 7    │
                                        │ Catalog   │  │ Emotion │  │ Placeholder│
                                        │ Loader    │  │ Mapping │  │ Procedural│
                                        └─────┬─────┘  └────┬────┘  └─────┬─────┘
                                              │              │              │
                                        ┌─────▼──────────────▼──────────────▼─────┐
                                        │ Obj. 6: Expression Override (Deception) │
                                        └─────┬───────────────────────────────────┘
                                              │
                                        ┌─────▼─────┐
                                        │ Obj. 8    │
                                        │ Tests     │
                                        └───────────┘
                                              │
                                              ▼
                                     STAGE-06 (Emotion Engine)
                                     STAGE-07 (User Interaction)
                                     STAGE-08 (Dialog System)
```

**Build Order:**
1. Types (`types.ts`) — no dependencies
2. Animation controller (`controller.ts`) — depends on types
3. Placeholder procedural (`placeholder.ts`) — depends on types; direct `Object3D` manipulation (no `AnimationMixer`)
4. Animation loader (`loader.ts`) — depends on types + controller
5. VRM expression controller (`expression.ts`) — depends on VRM runtime
6. Emotion mapper (`emotion-mapper.ts`) — depends on types + GDD spec
7. Animation system (`index.ts`) — depends on 2, 3, 4, 5, 6
8. Wire into `index.ts` and `avatar.ts` — depends on 7
9. Tests — can be written in parallel with implementation
10. Animation assets — can be developed in parallel with implementation

---

## 6. Timeline Estimate

| Phase | Days | Focus | Deliverables | Dependencies |
|-------|------|-------|-------------|--------------|
| **Phase 1** | 1–2 | Types, interfaces, and architecture | `types.ts`, `controller.ts` skeleton, `placeholder.ts` skeleton, `loader.ts` skeleton, `expression.ts` skeleton, `emotion-mapper.ts` skeleton; all compiling | None |
| **Phase 2** | 3–4 | Animation controller core | Priority queue logic, crossfade, state machine, idle fallback, `PlaceholderAnimController` (direct Object3D manipulation), tests | Phase 1 |
| **Phase 3** | 5–6 | Placeholder procedural animations | All 10 procedural trigger implementations with direct `Object3D` manipulation; transition blending; `PlaceholderAnimController` tests | Phase 1, Phase 2 |
| **Phase 4** | 7–8 | Animation assets + loader | Blender conversion script, Mixamo downloads, `manifest.json`, `loadAnimationClips()`, `copy-assets` update, tests | Phase 1, Phase 2 |
| **Phase 5** | 9–10 | VRM expression controller | `VRMExpressionManager` integration, blink timer, 16-emotion preset map, blend interpolation, update ordering, tests | Phase 1 |
| **Phase 6** | 11–13 | Emotion mapping + AnimationSystem + interaction bridge | `EMOTION_ANIMATION_MAP` (all 16 emotions), `AnimationSystem` public API, `InteractionManager` callback hooks, override/deception system, wiring into `index.ts` and `avatar.ts`, integration tests | Phase 2, 3, 4, 5 |
| **Phase 7** | 14–15 | Integration & Polish | Connect interactions → animations, emotion engine → expressions, verify full pipeline, tune crossfade durations, VRM/mixer update ordering, PBR + animation visual quality pass | Phase 6 |
| **Phase 8** | 16 | Testing & Bugfix | Full test suite, edge cases (rapid triggers, no animations loaded, VRM load failure, placeholder fallback), `npm run build` + `npm test` clean | Phase 7 |

**Total: ~16 working days (3-4 weeks)**
- **Phase 1:** 2 days
- **Phase 2-3:** 4 days (controller + expression)
- **Phase 4-5:** 4 days (assets + placeholder)
- **Phase 6:** 3 days (mapping + integration)
- **Phase 7-8:** 3 days (polish + testing)

---

## 7. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Animation assets not available (Mixamo retargeting fails) | Medium | High | Develop full procedural animation fallback first; visual quality lower but pipeline works |
| VRM `VRMExpressionManager` not available or API mismatch | Low | High | PoC with `@pixiv/three-vrm` expression API in Stage 05b; fallback to manual blend shape manipulation via morph targets |
| Crossfade artifacts (mesh tearing, bone snapping) | Medium | Medium | Use `AnimationAction.crossFadeFrom()` with correct duration; test on target hardware early |
| Priority queue causes visible "popping" on interrupt | Medium | Medium | Always complete crossfade before showing new animation; use blendIn duration proportional to priority difference |
| Performance: too many blend shapes + animations = frame drops | Low | Medium | Limit active blend shapes to 2 per frame; use `VRMExpressionManager` built-in performance optimizations; profile early |
| `file://` GLB animation loading fails in Electron | Low | High | Use same `window.noah.readFile()` bridge from Stage 05b (already implemented for model loading) |
| 16 emotions are too granular — some have no visible difference | Medium | Low | Tiered system: 5 primary emotions get distinct expressions; 11 secondary share with intensity scaling |
| Animation system conflicts with VRM's own update loop | Medium | Medium | Test with `vrm.update()` before/after mixer update; may need to disable VRM's built-in animation if using custom mixer |
| Placeholder flat `THREE.Group` cannot use `AnimationMixer` with `AnimationClip` property tracks | Medium | High | Placeholder procedural animations must manipulate `Object3D` directly in `update()`, not via `AnimationMixer` + `AnimationClip` |
| `InteractionManager` has no event emission hooks for animation system | Medium | High | Add callback registry (`onDragStart`, `onDragEnd`, etc.) to `InteractionManager` before the animation wiring phase |

---

## 8. Verification Checklist

### Animation Controller
- [ ] Priority queue: higher priority always preempts lower (e.g., `throw` priority 3 > `idle` priority 0)
- [ ] Equal priority requests queue FIFO and play sequentially
- [ ] Crossfade transitions have no visible popping
- [ ] Non-looping animations complete and return to `idle` (or next queued animation)
- [ ] `stopAll()` immediately halts all animations and resets to idle
- [ ] Controller works identically for VRM model and placeholder

### VRM Expression Controller
- [ ] `setExpression('happy')` immediately shows happy face
- [ ] `blendToExpression('sad', 0.5)` smoothly transitions over 500ms
- [ ] All 16 emotions produce valid `VRMExpressionPresetName` values
- [ ] Automatic blinking occurs every 2–4 seconds (blink weight 1.0 for ~150ms)
- [ ] Expression override shows fake emotion while true emotion leaks subtly in body language

### Emotion Mapping
- [ ] All 16 `Emotion` types have entries in `EMOTION_ANIMATION_MAP`
- [ ] Each entry has valid expression, body animation, dialog category, and TTS params
- [ ] Expression intensity is clamped to [0.0, 1.0]
- [ ] Body animation intensity scales animation influence appropriately

### Placeholder Avatar
- [ ] Placeholder avatar now has non-null `mixer` and non-empty `animations`
- [ ] Idle breathing plays continuously (Y oscillation)
- [ ] All 10 triggers produce visibly different motions
- [ ] `dispose()` cleans up mixer and procedural clips

### Animation Assets
- [ ] `assets/animations/manifest.json` is valid JSON
- [ ] All 10 entries have correct `loop`, `priority`, `blendIn` values
- [ ] `copy-assets` copies animation files to dist directory
- [ ] Animation files load without errors via `GLTFLoader`
- [ ] Missing animation files fall back to procedural animation with console warning

### Integration
- [ ] `npm run build` completes without errors
- [ ] `npm test` passes all suites (new + existing)
- [ ] Avatar with animations renders correctly in Electron window
- [ ] Interaction events (drag, throw, pet) trigger corresponding animations
- [ ] Emotion changes from Stage 6 trigger expression + body animation updates

---

## 9. Definition of Done

Stage 5 is complete when:

1. ✅ **Animation controller** with priority queue, crossfade transitions, and state machine is implemented and tested
2. ✅ **Animation catalog** defines all 10 triggers (idle, drag, throw, land, dizzy, eat, sleep, happy, sad, angry) with correct looping, priority, and blend settings
3. ✅ **VRM expression controller** controls facial expressions via `VRMExpressionManager` for all 16 emotions
4. ✅ **16-emotion mapping** (→ face expression + body animation + dialog category + TTS params) is defined and functional
5. ✅ **Expression override** (conscious deception) system is implemented
6. ✅ **Placeholder avatar** has procedural animations for all 10 triggers, rendering the capsule avatar alive
7. ✅ **Animation assets** are sourced/created for at least the `idle` animation; remaining animations have procedural fallback
8. ✅ **Animation system** is wired into the renderer entry point and responds to interaction events
9. ✅ **All tests pass** — existing (363) + new animation tests
10. ✅ **Build pipeline** produces working output (`npm run build` clean)
11. ✅ **Visual verification** — avatar shows smooth animations, expressions change with emotion, transitions are fluid

---

## 10. Next Steps (Stage 6 & 7 Preview)

After Stage 5 completion:

**Stage 6 — Emotion Engine and Needs System:**
- Parameter decay loops (hunger, fatigue, affection)
- Emotion state machine with deterministic transition rules
- Ignore detection engine (1min/5min/15min/1hr/4hr+ thresholds)
- Discomfort (waste) mechanic
- Trauma special rules (no passive decay, active healing required)
- Expression override integration with animation system

**Stage 7 — User Interaction System:**
- Full drag/throw/petting/click/feed/clean/sleep/play interactions
- Physics-based drag with momentum and landing detection
- Interaction cooldown management
- Emotional consequence system linking interactions to state changes
- Survival behavior (anti-termination resistance) placeholder

---

*A still Noah is just a doll. A moving Noah is alive. Every animation is a sentence. Every expression a confession.*
