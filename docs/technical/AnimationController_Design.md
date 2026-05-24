# AnimationController Design Specification

> **Scope**: Stage 5 Avatar Animation System core architecture  
> **Status**: Approved (based on STAGE-04_Author_Review.md)  
> **Target**: `src/renderer/avatar/AnimationController.ts`

---

## 1. Design Goals

1. **Priority-based interruption**: A flinch (priority 4) must override idle (priority 1) instantly.
2. **Smooth transitions**: No snapping. Every change crossfades over 0.2–0.5s.
3. **Loop awareness**: Idle loops forever; throw plays once and auto-reverts.
4. **Placeholder compatibility**: Works with capsule avatar (no animations) without crashing.
5. **Future-proof**: Ready for FBX avatar + Mixamo clips when they arrive.

---

## 2. Architecture

```
┌─────────────────────────────────────────┐
│         AnimationController             │
├─────────────────────────────────────────┤
│ - mixer: THREE.AnimationMixer           │
│ - catalog: Map<string, AnimationClip>   │
│ - current: AnimationState | null        │
│ - queue: AnimationRequest[]             │
├─────────────────────────────────────────┤
│ + play(name, options?): void            │
│ + crossFade(to, duration?): void        │
│ + stop(name, fadeOut?): void            │
│ + update(deltaTime): void               │
│ + registerClip(name, clip): void        │
└─────────────────────────────────────────┘
```

---

## 3. Interfaces

### 3.1 AnimationRequest (internal queue item)

```typescript
interface AnimationRequest {
  name: string;           // clip name in catalog
  priority: number;       // 1 (idle) – 5 (survival)
  loop: boolean;          // true = loop until interrupted
  fadeIn: number;         // seconds
  fadeOut: number;        // seconds
  blocking: boolean;      // if true, lower priority cannot interrupt
}
```

### 3.2 AnimationState (currently playing)

```typescript
interface AnimationState {
  action: THREE.AnimationAction;
  request: AnimationRequest;
  startedAt: number;      // performance.now() timestamp
}
```

### 3.3 PlayOptions (public API)

```typescript
interface PlayOptions {
  fadeIn?: number;        // default: 0.3
  fadeOut?: number;       // default: 0.3
  loop?: boolean;         // default: true
  priority?: number;      // default: 1
  blocking?: boolean;     // default: false
}
```

---

## 4. Priority Rules

| Priority | Category | Examples | Interruptible By |
|----------|----------|----------|------------------|
| 5 | Survival / Trauma | `hostage_defensive` | Nothing (highest) |
| 4 | Reaction | `flinch`, `land`, `wake` | 5 only |
| 3 | Interaction | `drag`, `throw`, `eat` | 4–5 |
| 2 | Emotion | `happy`, `sad`, `angry` | 3–5 |
| 1 | Baseline | `idle`, `sleep` | All |

### Interruption Logic

```typescript
function canInterrupt(current: AnimationState, incoming: AnimationRequest): boolean {
  if (current.request.blocking && incoming.priority <= current.request.priority) {
    return false; // Blocking + not higher priority = reject
  }
  return incoming.priority > current.request.priority || !current.request.blocking;
}
```

---

## 5. Catalog & Registration

Animation clips are loaded lazily and registered:

```typescript
const controller = new AnimationController(avatar.mixer!);

// Register placeholder "animations" (for capsule avatar, these are no-ops)
// For FBX avatar, load actual clips:
controller.registerClip('idle',   await loadAnimationClip('assets/animations/idle.fbx'));
controller.registerClip('sleep',  await loadAnimationClip('assets/animations/sleep.fbx'));
controller.registerClip('drag',   await loadAnimationClip('assets/animations/drag.fbx'));
controller.registerClip('throw',  await loadAnimationClip('assets/animations/throw.fbx'));
controller.registerClip('land',   await loadAnimationClip('assets/animations/land.fbx'));
controller.registerClip('happy',  await loadAnimationClip('assets/animations/happy.fbx'));
controller.registerClip('sad',    await loadAnimationClip('assets/animations/sad.fbx'));
```

**Lazy loading wrapper**:

```typescript
async function loadAnimationClip(path: string): Promise<THREE.AnimationClip> {
  const mod = await import('three/examples/jsm/loaders/FBXLoader.js');
  const loader = new mod.FBXLoader();
  const obj = await loader.loadAsync(path);
  return obj.animations[0];
}
```

---

## 6. Transition Behavior

### 6.1 Same Priority Override

If `play('happy')` is called while `happy` is already playing:
- **Ignore** (no restart) to prevent looping glitches.
- Exception: If the current clip is near its end (< 0.5s remaining), allow restart.

### 6.2 Auto-Revert After One-Shot

Non-looping clips automatically revert to `idle`:

```typescript
action.clampWhenFinished = true;
action.loop = THREE.LoopOnce;

// When finished:
mixer.addEventListener('finished', (e) => {
  if (e.action === current.action && !current.request.loop) {
    this.play('idle', { fadeIn: 0.5, priority: 1 });
  }
});
```

### 6.3 Crossfade Timing

| From → To | fadeOut | fadeIn | Reason |
|-----------|---------|--------|--------|
| idle → emotion | 0.3s | 0.3s | Smooth shift |
| emotion → reaction | 0.1s | 0.1s | Urgent, faster |
| reaction → idle | 0.5s | 0.5s | Calm recovery |
| any → survival | 0.0s | 0.2s | Immediate |

---

## 7. Placeholder Compatibility

When `avatar.mixer` is `null` (placeholder capsule), the controller degrades gracefully:

```typescript
class AnimationController {
  private mixer: THREE.AnimationMixer | null;

  play(name: string, options?: PlayOptions): void {
    if (!this.mixer) {
      console.debug(`[AnimCtrl] Placeholder mode: '${name}' requested but no mixer.`);
      return; // Silent no-op
    }
    // ... normal logic
  }
}
```

This ensures Stage 5 code works before FBX avatar is ready.

---

## 8. Stage 6 Integration Points

The Emotion Engine (Stage 6) will call:

```typescript
// emotion-controller bridge (future Stage 6)
function onEmotionChange(emotion: Emotion): void {
  const mapping = EMOTION_ANIMATION_MAP[emotion];
  animController.play(mapping.bodyClip, {
    priority: mapping.priority,
    loop: mapping.loop,
    fadeIn: 0.3,
  });
}
```

**Mapping table (preliminary)**:

| Emotion | Body Clip | Priority | Loop | Face BlendShape |
|---------|-----------|----------|------|-----------------|
| happy | `happy` | 2 | true | `emotionJoy` @ 0.8 |
| sad | `sad` | 2 | true | `emotionSad` @ 0.7 |
| angry | `angry` | 2 | true | `emotionAngry` @ 0.9 |
| scared | — (placeholder) | 2 | true | `emotionScared` @ 0.8 |
| tired | `sleep` | 1 | true | `eyeHalfClosed` @ 0.5 |
| excited | `happy` | 2 | true | `emotionJoy` @ 0.6 |
| bored | `idle` | 1 | true | neutral |
| lonely | `sad` | 2 | true | `emotionSad` @ 0.5 |

---

## 9. File Structure

```
src/renderer/avatar/
├── index.ts                     # Existing: loadAvatar, createPlaceholderAvatar
├── AnimationController.ts       # NEW: Core animation system
├── FaceController.ts            # NEW: Morph target wrapper (Stage 5 infra)
└── animation-catalog.ts         # NEW: Clip names, paths, emotion mappings
```

---

## 10. Testing Strategy

| Test | Description | Mock |
|------|-------------|------|
| Priority override | High priority interrupts low | Fake mixer with 2 actions |
| Blocking | Blocking action rejects equal priority | Fake action with `blocking=true` |
| Placeholder | No crash when mixer is null | `mixer = null` |
| Crossfade timing | fadeIn/fadeOut values respected | Spy on `action.fadeIn()` |
| Auto-revert | One-shot returns to idle | Trigger `finished` event |
| Catalog registration | `registerClip` stores clip | Check internal Map size |

---

## 11. Action Items

| Priority | Task | File | Owner |
|----------|------|------|-------|
| P0 | Implement `AnimationController` class | `AnimationController.ts` | Developer |
| P0 | Implement placeholder no-op mode | `AnimationController.ts` | Developer |
| P1 | Implement lazy clip loader | `animation-catalog.ts` | Developer |
| P1 | Add `FaceController` (morph target wrapper) | `FaceController.ts` | Developer |
| P1 | Write unit tests for priority queue | `tests/renderer/animation-controller.test.ts` | Developer |
| P2 | Download Mixamo test clips | `assets/animations/` | Animator |
| P2 | Verify FBX clips load into controller | Manual test | Developer |

---

*Design approved based on STAGE-04_Author_Review.md (2026-05-24).*
*Ready for implementation.*
