# Stage 4/5/6: Parallel Implementation Plan

> **Document Type**: Director-Mandated Parallel Implementation Plan  
> **Date**: 2026-05-24  
> **Status**: Approved for Execution  
> **Scope**: Renderer Scene (4) + Avatar Animation (5) + Emotion/Needs (6) — concurrent development

---

## 1. Why Parallel?

**Director's Assessment**: Stage 4/5/6 are not sequential dependencies. They are **interdependent subsystems** that must co-evolve:

- **Stage 4 (Renderer)**: Provides the visual stage. Without Stage 5/6, it's an empty dollhouse.
- **Stage 5 (Avatar)**: Needs Stage 4's scene to render in. Needs Stage 6's emotion signals to animate.
- **Stage 6 (Emotion)**: Needs Stage 5's animation system to express emotions. Needs Stage 4's renderer to display state.

**Sequential risk**: If we finish Stage 4 completely before starting Stage 5, we build a room that Noah cannot inhabit. If we finish Stage 5 before Stage 6, we have an animated puppet with no soul.

**Parallel approach**: Build all three streams simultaneously, with daily integration checkpoints.

---

## 2. Work Streams

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PARALLEL WORK STREAMS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STREAM A: Renderer (Stage 4)        STREAM B: Avatar (Stage 5)            │
│  ───────────────────────────         ───────────────────────────            │
│  Owner: Frontend Developer           Owner: Graphics Developer             │
│                                                                             │
│  [A1] Scene init (✅)               [B1] AnimationController               │
│  [A2] Room geometry (✅)            [B2] Animation catalog (6 clips)       │
│  [A3] Lighting (✅)                 [B3] Crossfade transitions             │
│  [A4] Dynamic window (✅)           [B4] Priority queue                    │
│  [A5] Camera (✅)                   [B5] Placeholder avatar (✅)           │
│  [A6] Resize (✅)                   [B6] FBXLoader pipeline (✅)           │
│                                                                             │
│  STREAM C: Emotion (Stage 6)         STREAM D: Needs (Stage 6)             │
│  ───────────────────────────         ───────────────────────────            │
│  Owner: Systems Developer            Owner: Systems Developer              │
│                                                                             │
│  [C1] State machine (✅ exists)     [D1] Real-time decay ticker          │
│  [C2] Emotion → animation map       [D2] Hunger personality shift          │
│  [C3] Emotion → BlendShape map      [D3] Fatigue → sleep trigger           │
│  [C4] 16 emotion triggers           [D4] Discomfort mechanic               │
│  [C5] Trauma special rules          [D5] Ignore detection thresholds       │
│  [C6] Expression override (defer)   [D6] Absence/return (✅)               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Daily Integration Checkpoints

Every day at the end of development, the following integration points must be verified:

### Checkpoint 1: Renderer ↔ Avatar
```typescript
// Does the avatar render in the room?
// Does the avatar cast shadows on room geometry?
// Does the avatar respond to window resize?
```

### Checkpoint 2: Avatar ↔ Emotion
```typescript
// Does emotion change trigger animation change?
// Does animation transition smoothly (no snapping)?
// Does placeholder avatar have fallback animations?
```

### Checkpoint 3: Emotion ↔ Needs
```typescript
// Does hunger increase trigger 'hungry' emotion?
// Does fatigue > 80 trigger 'tired' + sleep animation?
// Does trauma modify other emotion thresholds?
```

### Checkpoint 4: Needs ↔ Renderer
```typescript
// Does system weather affect window color?
// Does high CPU load affect avatar animation (dizzy)?
// Does discomfort count spawn visual objects?
```

---

## 4. Phase Breakdown

### Phase 1: Skeleton (Days 1–3)

**Goal**: All streams have a runnable skeleton that compiles and passes basic tests.

| Stream | Task | Deliverable | Acceptance |
|--------|------|-------------|------------|
| B | `AnimationController` class | `src/renderer/avatar/AnimationController.ts` | Can play/stop a clip on placeholder avatar |
| C | Emotion mapping table | `src/shared/emotionMapping.ts` | 16 emotions → animation name + priority |
| D | `NeedDecayTicker` class | `src/main/needs/NeedDecayTicker.ts` | Hunger increases by +1 per minute |

**Integration**: `renderer/index.ts` wires `onStateUpdate` → `animationController.play()`

### Phase 2: Muscle (Days 4–7)

**Goal**: All streams have functional implementations with crossfade, priority, and threshold logic.

| Stream | Task | Deliverable | Acceptance |
|--------|------|-------------|------------|
| B | Priority queue + crossfade | `AnimationQueue` class | Higher priority interrupts lower; 0.3s crossfade |
| C | Trauma special rules | `src/shared/utils/emotion.ts` updates | Trauma ≥50: scared; ≥80: traumatized; no passive decay |
| D | Ignore detection | `SessionTracker` extension | 1/5/15/60/240 min thresholds; affection decay |

**Integration**: `main/index.ts` wires `SessionTracker` → `stateManager.modify()` → `state:update` → renderer

### Phase 3: Skin (Days 8–10)

**Goal**: All streams are polished, tested, and documented.

| Stream | Task | Deliverable | Acceptance |
|--------|------|-------------|------------|
| B | Animation catalog complete | 6 clips with smooth transitions | All emotion transitions tested |
| C | Full emotion test suite | `tests/shared/emotion.test.ts` | 100% emotion trigger coverage |
| D | Needs test suite | `tests/main/needs.test.ts` | Decay rates, thresholds, ignore timing |

**Integration**: Full system test — start app, wait 5 minutes, verify emotion change

---

## 5. File Inventory

### New Files (Phase 1)

| File | Stream | Purpose |
|------|--------|---------|
| `src/renderer/avatar/AnimationController.ts` | B | Animation playback controller |
| `src/renderer/avatar/AnimationQueue.ts` | B | Priority-based animation queue |
| `src/shared/emotionMapping.ts` | C | Emotion → animation/BlendShape/dialog mapping |
| `src/main/needs/NeedDecayTicker.ts` | D | Real-time parameter decay |
| `src/main/needs/IgnoreDetector.ts` | D | Ignore threshold detection |

### Modified Files (Phase 1–3)

| File | Streams | Changes |
|------|---------|---------|
| `src/renderer/index.ts` | A, B, C | Wire animation controller to state updates |
| `src/renderer/avatar/index.ts` | B | Export AnimationController, integrate with LoadedAvatar |
| `src/main/index.ts` | C, D | Wire NeedDecayTicker, IgnoreDetector to services |
| `src/main/state/index.ts` | C, D | Add `tick()` for decay, `setEmotion()` override |
| `src/shared/utils/index.ts` | C | Refine `resolveEmotion` with context |
| `src/shared/constants/index.ts` | D | Add decay rates, ignore thresholds |

---

## 6. Testing Strategy

### Stream B (Avatar) Tests

```typescript
// tests/renderer/animation.test.ts
describe('AnimationController', () => {
  test('play starts an animation', () => { ... });
  test('crossFade blends between clips', () => { ... });
  test('priority queue interrupts lower priority', () => { ... });
  test('blocking animation prevents interruption', () => { ... });
  test('loop animation repeats indefinitely', () => { ... });
});
```

### Stream C (Emotion) Tests

```typescript
// tests/shared/emotion.test.ts
describe('resolveEmotion', () => {
  test('trauma >= 80 → traumatized', () => { ... });
  test('trauma >= 50 → scared', () => { ... });
  test('hunger >= 80 → hungry', () => { ... });
  test('fatigue >= 80 → tired', () => { ... });
  test('affection <= 10 && morality <= 10 → hostage', () => { ... });
  test('affection <= 30 → sad', () => { ... });
  test('affection <= 50 → bored', () => { ... });
  test('affection <= 80 → happy', () => { ... });
  test('affection > 80 → excited', () => { ... });
});
```

### Stream D (Needs) Tests

```typescript
// tests/main/needs.test.ts
describe('NeedDecayTicker', () => {
  test('hunger increases by 1 per minute', () => { ... });
  test('fatigue increases by 1 per minute when awake', () => { ... });
  test('fatigue does not increase when sleeping', () => { ... });
  test('affection decays after 5 minutes of no interaction', () => { ... });
});

describe('IgnoreDetector', () => {
  test('1 minute → attention prompt', () => { ... });
  test('5 minutes → neglect onset', () => { ... });
  test('15 minutes → hurt response', () => { ... });
  test('1 hour → abandonment', () => { ... });
  test('4 hours → absence protocol', () => { ... });
});
```

### Integration Tests

```typescript
// tests/integration/emotion-animation.test.ts
describe('Emotion → Animation Integration', () => {
  test('happy emotion plays happy animation', async () => { ... });
  test('sad emotion plays sad animation', async () => { ... });
  test('trauma >= 80 plays traumatized pose', async () => { ... });
});

// tests/integration/needs-emotion.test.ts
describe('Needs → Emotion Integration', () => {
  test('hunger 80+ triggers hungry emotion', async () => { ... });
  test('fatigue 80+ triggers tired + sleep', async () => { ... });
  test('ignore 5min triggers sad emotion', async () => { ... });
});
```

---

## 7. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AnimationController too complex | Medium | High | Start simple: play/stop only, add crossfade in Phase 2 |
| Placeholder avatar limits testing | High | Medium | Test with placeholder; FBX integration is Stage 14 |
| Decay ticker drifts | Medium | Medium | Use `Date.now()` delta, not setInterval accumulation |
| Emotion mapping incomplete | Medium | Medium | Start with 8 core emotions, add 8 edge cases later |
| Cross-stream merge conflicts | Medium | High | Daily integration checkpoints; small PRs |
| Performance degradation | Low | High | Profile render loop daily; target 60fps |

---

## 8. Success Criteria

At the end of Phase 3, the following must be true:

1. **Visual**: Noah (placeholder avatar) is visible in her room, reacting to system metrics
2. **Animation**: Avatar plays different animations based on emotion (minimum 6 clips)
3. **Emotion**: 16 emotions are deterministically resolvable from state parameters
4. **Needs**: Hunger/fatigue/affection decay over time; ignore detection triggers responses
5. **Integration**: State change → emotion update → animation change happens within 1 frame
6. **Tests**: 300+ tests passing, including 20+ new integration tests
7. **Build**: `npm run build` clean, `npm test` all green

---

## 9. Daily Standup Template

```markdown
## Daily Standup — [Date]

### Stream A (Renderer)
- Yesterday: ...
- Today: ...
- Blockers: ...

### Stream B (Avatar)
- Yesterday: ...
- Today: ...
- Blockers: ...

### Stream C (Emotion)
- Yesterday: ...
- Today: ...
- Blockers: ...

### Stream D (Needs)
- Yesterday: ...
- Today: ...
- Blockers: ...

### Integration Checkpoint
- [ ] Renderer ↔ Avatar
- [ ] Avatar ↔ Emotion
- [ ] Emotion ↔ Needs
- [ ] Needs ↔ Renderer
```

---

*Plan approved by Director.*  
*Execute immediately. Do not wait for sequential stage completion.*
