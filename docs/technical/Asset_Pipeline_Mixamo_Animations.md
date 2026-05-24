# Asset Pipeline: Mixamo Animation Integration

> **Scope**: Mixamo animations → FBX → Three.js runtime (Stage 5–6)  
> **Status**: Specification / Risk Assessment  
> **Owner**: Orchestrator / Animator / Developer

---

## 1. Executive Summary

Stage 5 requires an **animation catalog**: idle, drag, throw, land, dizzy, eat, sleep, happy, sad, angry.  
Stage 6 wires these to the **emotion engine**.

Mixamo (Adobe) offers:
- 2,500+ free motion-capture animations
- Auto-rigging for humanoid characters
- FBX download with skin or without

**This document analyzes every risk and mitigation for using Mixamo in Noah's pipeline.**

---

## 2. Mixamo Download Options

When downloading from mixamo.com, two critical choices exist:

| Option | Value | Use Case |
|--------|-------|----------|
| **Format** | `FBX (.fbx)` | Required for Three.js FBXLoader |
| **Frames per Second** | `30` | Matches Three.js default; 60 is overkill and larger |
| **With Skin** | ☐ **NO** | We already have Noah's mesh. Re-skinning = double geometry |
| **Without Skin** | ✅ **YES** | Download **skeleton + animation only** (much smaller) |

**CRITICAL**: Always select **"Without Skin"**. Otherwise every animation file contains a duplicate mesh, wasting 10–30MB per clip.

---

## 3. Skeleton Compatibility: The #1 Risk

### 3.1 Mixamo Skeleton Structure

Mixamo uses a standardized humanoid skeleton:

```
Hips (root)
├── Spine
│   ├── Spine1
│   │   ├── Spine2
│   │   │   ├── Neck
│   │   │   │   ├── Head
│   │   │   │   └── ... (eyes, jaw — rarely used)
│   │   │   ├── LeftShoulder
│   │   │   │   ├── LeftArm
│   │   │   │   │   ├── LeftForeArm
│   │   │   │   │   │   ├── LeftHand
│   │   │   │   │   │   │   └── ... (fingers)
│   │   │   │   └── ...
│   │   │   └── RightShoulder
│   │   │       └── ... (mirror)
│   │   └── ...
├── LeftUpLeg
│   ├── LeftLeg
│   │   ├── LeftFoot
│   │   │   ├── LeftToeBase
│   │   │   └── LeftToe_End
│   └── ...
└── RightUpLeg
    └── ... (mirror)
```

### 3.2 Noah's Skeleton (VRM → Blender → FBX)

After the VRM pipeline, Noah's skeleton should match Mixamo naming:

| Mixamo Bone | Noah Bone (after rename) | Status |
|-------------|--------------------------|--------|
| `Hips` | `Hips` | ✅ Match |
| `Spine` | `Spine` | ✅ Match |
| `Spine1` | `Chest` | ⚠️ Single spine vs. multiple |
| `Spine2` | `UpperChest` | ⚠️ VRM has this, Mixamo may not use it |
| `Neck` | `Neck` | ✅ Match |
| `Head` | `Head` | ✅ Match |
| `LeftArm` | `LeftArm` | ✅ Match |
| `LeftForeArm` | `LeftForeArm` | ✅ Match |
| `LeftHand` | `LeftHand` | ✅ Match |
| `LeftUpLeg` | `LeftUpLeg` | ✅ Match |
| `LeftLeg` | `LeftLeg` | ✅ Match |
| `LeftFoot` | `LeftFoot` | ✅ Match |

### 3.3 Risk: Spine Hierarchy Mismatch

**Problem**: Mixamo expects `Spine → Spine1 → Spine2`. VRM has `Spine → Chest → UpperChest`.

**Impact**: If bone names don't match, Three.js `AnimationMixer` cannot find the target bone. The animation plays on "nothing" — Noah stands frozen.

**Mitigation Options**:

| Option | Description | Effort | Quality |
|--------|-------------|--------|---------|
| A. Exact Match | Rename Noah's bones to `Spine1`, `Spine2` instead of `Chest`, `UpperChest` | Low | High (direct playback) |
| B. Retargeting | Use Three.js retargeting or custom bone mapping | High | Medium (may have joint popping) |
| C. Custom Animations | Animate from scratch in Blender to match Noah's rig | Very High | Perfect |

**Recommendation**: **Option A**. Rename VRM bones during Blender export to match Mixamo exactly:

```python
# Additional renames for Mixamo compatibility
MIXAMO_EXTRA_MAP = {
    'Chest': 'Spine1',
    'UpperChest': 'Spine2',
    # If VRM lacks Spine1/Spine2, insert dummy bones or merge
}
```

**Note**: If Noah's skeleton has **fewer spine bones** than Mixamo, the animation will still play but with reduced spine flexibility. If Noah has **more bones**, extra bones remain in bind pose (acceptable).

---

## 4. Root Motion: The #2 Risk

### 4.1 What is Root Motion?

Many Mixamo animations (walk, run, jump, throw) move the `Hips` bone in world space:

```
Idle:    Hips at (0, 1, 0) for all frames
Walk:    Hips moves from (0, 1, 0) → (0, 1, 2) over 60 frames
Throw:   Hips rotates and shifts forward
```

### 4.2 Problems in Three.js

**Problem 1: Position Drift**  
If Noah plays a "walk" animation while standing in her room, she will walk **through walls** or float into the desk. The animation controls her world position.

**Problem 2: In-place vs. Root Motion**  
Mixamo offers "In Place" variants for some animations (e.g., "Walking In Place"). But many emotions (throw, dizzy, happy jump) don't have in-place versions.

**Problem 3: Return to Origin**  
After a root-motion animation ends, Noah may be 2 meters away from where she started. The next "idle" animation snaps her back or plays from the new offset.

### 4.3 Mitigation Strategies

| Strategy | Implementation | Best For |
|----------|---------------|----------|
| **A. In-Place Only** | Download only "In Place" variants from Mixamo | Walk, run cycles |
| **B. Zero Hips Translation** | Post-process: subtract Hips (X,Z) delta from every frame | All animations (code solution) |
| **C. Extract Root Motion** | Read Hips delta per frame, apply to `avatar.group.position`, zero Hips in animation | Walk, throw (most flexible) |
| **D. Animation Masking** | Animate upper body only, lock lower body | Idle variations, emotions |

**Recommendation**:
- **Idle, sleep, eat, happy, sad, angry**: Use in-place or upper-body animations. Zero Hips translation (Strategy B).
- **Walk, throw, land**: Use root motion extraction (Strategy C) so Noah physically moves in the room.

### 4.4 Code: Zero Hips Translation (Strategy B)

```typescript
function bakeAnimationInPlace(clip: THREE.AnimationClip): THREE.AnimationClip {
  const hipsTrack = clip.tracks.find((t) =>
    t.name.endsWith('.position') && t.name.includes('Hips')
  );

  if (!hipsTrack) return clip;

  // Get initial Hips Y (keep vertical, zero horizontal)
  const values = hipsTrack.values;
  const initialY = values[1]; // Y component of first keyframe

  for (let i = 0; i < values.length; i += 3) {
    values[i] = 0;     // X = 0
    values[i + 2] = 0; // Z = 0
    // Y is preserved (breathing, crouching)
  }

  return clip;
}
```

### 4.5 Code: Root Motion Extraction (Strategy C)

```typescript
function extractRootMotion(avatar: LoadedAvatar, clipName: string): void {
  const clip = THREE.AnimationClip.findByName(avatar.animations, clipName);
  if (!clip) return;

  const hipsPosTrack = clip.tracks.find((t) =>
    t.name === 'Hips.position'
  );

  if (!hipsPosTrack) return;

  // Create a new action
  const action = avatar.mixer!.clipAction(clip);

  // During mixer update, read Hips delta and apply to group
  // This requires a custom update loop
}
```

**Complexity**: High. Root motion extraction is a Stage 7+ feature. For Stage 5–6, prefer Strategy B (in-place).

---

## 5. Animation Loop & Transition Issues

### 5.1 Mixamo Loop Points

Not all Mixamo animations loop cleanly:

| Animation | Loop Quality | Notes |
|-----------|-------------|-------|
| Idle | ✅ Perfect | Designed for seamless looping |
| Walk / Run | ✅ Perfect | "In Place" variants loop well |
| Throw | ❌ Poor | Starts from idle, ends in follow-through. Snap on loop. |
| Jump | ⚠️ Fair | May have landing impact frame that stutters |
| Dizzy | ✅ Good | Usually loops |

**Mitigation**: Use Blender to edit non-looping animations:
1. Import Mixamo FBX into Blender
2. Adjust keyframes to create smooth loop
3. Add "pose copy" at start/end for seamless transition
4. Re-export as FBX

### 5.2 Transition Snapping (No Blending)

Three.js `AnimationMixer` supports blending via `action.crossFadeTo()`, but:

- Crossfade duration must be manually specified
- Bones with no matching tracks snap instantly
- Adding/removing animations at runtime requires careful state management

**Stage 5 Implementation**:

```typescript
class AvatarAnimationController {
  private mixer: THREE.AnimationMixer;
  private currentAction: THREE.AnimationAction | null = null;

  play(name: string, fadeDuration: number = 0.3): void {
    const clip = THREE.AnimationClip.findByName(this.animations, name);
    if (!clip) return;

    const newAction = this.mixer.clipAction(clip);
    newAction.reset().fadeIn(fadeDuration).play();

    if (this.currentAction) {
      this.currentAction.fadeOut(fadeDuration);
    }

    this.currentAction = newAction;
  }
}
```

---

## 6. Scale & Unit Mismatch

### 6.1 The Problem

Mixamo exports FBX in **centimeters** by default (character is ~170 units tall).  
Noah's VRM pipeline exports in **meters** (character is ~1.7 units tall).

If you load a Mixamo animation (cm scale) onto Noah's skeleton (m scale):
- Arms swing 100× too far
- Hips bob up/down by meters instead of centimeters
- Character explodes into a mess of stretched polygons

### 6.2 Solutions

**Option A: Normalize Mixamo Scale in Blender**

```python
def normalize_mixamo_scale():
    """Scale Mixamo animation to meters before exporting."""
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            obj.scale = (0.01, 0.01, 0.01)
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
```

**Option B: Runtime Scale Factor**

```typescript
// In loadAvatar or animation setup
mixer = new THREE.AnimationMixer(object);
mixer.timeScale = 1.0; // Animation playback speed

// If animation was exported in cm:
// (This does NOT fix bone positions — only timing)
// You must bake scale into the FBX.
```

**Recommendation**: **Option A**. Always bake scale in Blender. Runtime should never need scale compensation for animations.

---

## 7. Facial Animation Gap

### 7.1 Mixamo Limitation

Mixamo provides **body animations only**. It does not generate:
- Blinking
- Facial expressions (smile, frown, angry brows)
- Lip sync
- Eye tracking

### 7.2 Stage 6 Requirement

GDD requires 16 emotions mapped to:
- Facial expression (VRM BlendShape / FBX Morph Target)
- Body posture (Mixamo animation)
- Dialog category
- TTS parameters

**Body + Face Integration**:

| Emotion | Body (Mixamo) | Face (BlendShape) |
|---------|---------------|-------------------|
| Happy | `Happy Idle` or `Excited` | `emotionJoy` @ 0.8 |
| Sad | `Sad Idle` or `Crying` | `emotionSad` @ 0.7 |
| Angry | `Angry` or `Yelling` | `emotionAngry` @ 0.9 |
| Scared | `Cowering` or `Fearful` | `eyeWide` + brow up |
| Tired | `Exhausted` or `Sleepy` | `eyeBlink` @ 0.5 (half-closed) |

**Implementation**:

```typescript
function setEmotion(avatar: LoadedAvatar, emotion: Emotion): void {
  // 1. Body animation
  const bodyAnim = EMOTION_BODY_MAP[emotion];
  animationController.play(bodyAnim);

  // 2. Face BlendShape
  const faceMesh = avatar.group.getObjectByName('Face') as THREE.Mesh;
  const targetName = EMOTION_FACE_MAP[emotion];

  if (faceMesh?.morphTargetDictionary?.[targetName] !== undefined) {
    const index = faceMesh.morphTargetDictionary[targetName];
    // Animate influence over time (not instant)
    gsap.to(faceMesh.morphTargetInfluences!, {
      [index]: 0.8,
      duration: 0.5,
    });
  }
}
```

---

## 8. File Size & Memory Budget

### 8.1 Per-Animation Size

| Source | Size (Without Skin) | Size (With Skin) |
|--------|---------------------|------------------|
| Mixamo Idle (60 frames) | ~100 KB | ~8 MB |
| Mixamo Walk (120 frames) | ~150 KB | ~12 MB |
| Mixamo Complex (throw, 90 frames) | ~200 KB | ~15 MB |

### 8.2 Recommended Catalog (Stage 5)

| Animation | Frames | Size (est.) | Priority |
|-----------|--------|-------------|----------|
| idle | 120 | 150 KB | P0 |
| idle_variation_1 | 120 | 150 KB | P1 |
| sleep | 60 | 100 KB | P0 |
| eat | 90 | 180 KB | P1 |
| drag | 60 | 120 KB | P0 |
| throw | 60 | 120 KB | P0 |
| land | 30 | 80 KB | P0 |
| dizzy | 120 | 150 KB | P1 |
| happy | 90 | 150 KB | P1 |
| sad | 90 | 150 KB | P1 |
| angry | 90 | 150 KB | P1 |
| walk | 60 | 120 KB | P2 (Stage 7) |
| wave | 60 | 120 KB | P2 |

**Total catalog**: ~1.8 MB (without skin) + shared mesh ~15 MB = **~17 MB VRAM**.

### 8.3 Loading Strategy

```typescript
// Lazy-load animations on demand
const ANIMATION_CATALOG: Record<string, string> = {
  idle: './assets/animations/noah_idle.fbx',
  sleep: './assets/animations/noah_sleep.fbx',
  // ...
};

async function loadAnimation(name: string): Promise<THREE.AnimationClip> {
  const loader = new FBXLoader();
  const obj = await loader.loadAsync(ANIMATION_CATALOG[name]);
  return obj.animations[0];
}
```

---

## 9. Priority System (Stage 5 Integration)

GDD requires "priority-based queue management."

### 9.1 Priority Rules

| Priority | Animation | Interruptible? | Example |
|----------|-----------|----------------|---------|
| 5 (Highest) | Survival / Trauma | ❌ No | Hostage mode defensive pose |
| 4 | Reaction | ❌ No | Flinch from hit, land from throw |
| 3 | Interaction | ✅ By 4+ | Drag, throw, eat |
| 2 | Emotion | ✅ By 3+ | Happy, sad, angry |
| 1 | Idle / Sleep | ✅ By all | Idle loop, sleep breathing |

### 9.2 Queue Behavior

```typescript
interface AnimationRequest {
  name: string;
  priority: number;
  duration: number; // 0 = infinite (loop)
  blocking: boolean; // can it be interrupted?
}

class AnimationQueue {
  private queue: AnimationRequest[] = [];
  private current: AnimationRequest | null = null;

  push(req: AnimationRequest): void {
    if (!this.current || req.priority > this.current.priority || !this.current.blocking) {
      this.play(req);
    } else {
      this.queue.push(req);
      this.queue.sort((a, b) => b.priority - a.priority);
    }
  }

  onAnimationEnd(): void {
    const next = this.queue.shift();
    if (next) this.play(next);
  }
}
```

---

## 10. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Skeleton mismatch | High | High | Rename bones to Mixamo standard in Blender |
| Root motion drift | Medium | Medium | Use in-place animations or zero hips translation |
| Scale explosion (cm vs m) | Medium | High | Bake 0.01 scale in Blender before export |
| Facial animation missing | Certain | Medium | Maintain separate BlendShape system |
| Non-looping animations | Medium | Low | Edit loop points in Blender |
| File size bloat (with skin) | High (if wrong) | Medium | Always download "Without Skin" |
| Transition popping | Medium | Medium | Use crossFade with 0.2–0.5s duration |
| Animation priority conflicts | Medium | Medium | Implement strict priority queue |

---

## 11. Action Items

| Priority | Task | Owner | Stage |
|----------|------|-------|-------|
| P0 | Verify Noah skeleton matches Mixamo after VRM pipeline | Developer | 4→5 |
| P0 | Download 3 test animations (idle, throw, happy) from Mixamo | Animator | 5 |
| P0 | Test-load Mixamo anims on Noah FBX in Three.js | Developer | 5 |
| P1 | Implement `AnimationController` with priority queue | Developer | 5 |
| P1 | Document "Without Skin" policy for all animators | Orchestrator | 5 |
| P1 | Create Blender template for fixing non-looping anims | Tech Artist | 5 |
| P2 | Build emotion-to-animation mapping table | Designer | 6 |
| P2 | Integrate BlendShape emotions with body animations | Developer | 6 |
| P2 | Add root motion extraction for walk animations | Developer | 7 |

---

*Prepared by Orchestrator for Stage 5–6 animation pipeline risk assessment.*
