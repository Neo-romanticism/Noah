# Asset Pipeline Technical Index

> **Project**: Noah Desktop Companion  
> **Scope**: All 3D asset pipelines from DCC tools to Three.js runtime  
> **Documents**: 3 technical specifications + this index  
> **Last Updated**: 2026-05-24

---

## Document Map

```
docs/technical/
├── Asset_Pipeline_Index.md                          ← You are here
├── Asset_Pipeline_Room_Mesh_Replacement.md          # Room geometry strategy
├── Asset_Pipeline_VRM_Blender_FBX.md                # Avatar creation pipeline
└── Asset_Pipeline_Mixamo_Animations.md              # Animation integration risks
```

---

## Quick Reference by Stage

| Stage | Primary Concern | Key Document | Decision Required |
|-------|----------------|--------------|-------------------|
| **4** (Now) | Renderer scaffolding ready, no external assets | Room Replacement | Keep `procedural` default; prepare `external-glb` toggle |
| **5** | Avatar + Animation system | VRM→Blender→FBX, Mixamo | Confirm skeleton naming; download test anims |
| **6** | Emotion → Animation mapping | Mixamo Animations | Build emotion-to-body/face mapping table |
| **7** | Interaction (drag/throw/walk) | Mixamo Animations | Root motion extraction for walk; in-place for emotions |
| **11** | Multi-room progression | Room Replacement | `garden_room.glb`, `gaming_room.glb` production |
| **14** | Final asset integration | All three | Designer handoff; full pipeline validation |

---

## Executive Summaries

### 1. Room Mesh Replacement

**Problem**: Stage 4 uses procedural Three.js geometry (`BoxGeometry`, `PlaneGeometry`). Designers cannot easily edit these.

**Solution**: `buildRoom()` factory pattern. Switch between `procedural` / `external-glb` / `external-fbx` with one line.

**Key Insight**: Use **GLB** (not FBX) for static rooms. GLB is smaller, loads faster, and has native PBR support in Three.js.

**Critical Path**:
1. Document Blender node naming convention (`BED`, `DESK`, `WINDOW_SKY`)
2. Implement `buildRoomFromGLB()` wrapper
3. Ship `room_manifest.json` for dynamic material overrides
4. Stage 14: Designer exports `.glb`, developer changes one line

**Read full doc**: [Asset_Pipeline_Room_Mesh_Replacement.md](./Asset_Pipeline_Room_Mesh_Replacement.md)

---

### 2. VRM → Blender → FBX Avatar Pipeline

**Problem**: Noah's avatar starts as VRM (VRoid Studio), but Three.js runtime needs FBX with clean skeleton.

**Solution**: Blender as the conversion hub. VRM Addon imports → bone rename → scale normalize → FBX export.

**Key Insight**: The **Y-up / Z-up coordinate system** is the #1 silent bug source. Blender's default viewport is Z-up; artists must NOT rotate the model to compensate. Use Y-up viewport mode instead.

**Critical Path**:
1. Install VRM Addon for Blender
2. Generate VRM in VRoid Studio (or custom)
3. Run Blender scripts: `setup_y_up.py` → `rename_bones.py` → `normalize_scale.py` → `export_fbx.py`
4. Validate in Three.js: no rotation, scale=(1,1,1), Hips at origin

**Read full doc**: [Asset_Pipeline_VRM_Blender_FBX.md](./Asset_Pipeline_VRM_Blender_FBX.md)

---

### 3. Mixamo Animation Integration

**Problem**: Stage 5 needs 10+ animations. Stage 6 needs emotion mapping. Mixamo is free but has hidden traps.

**Solution**: Download "Without Skin" only. Rename Noah's skeleton to match Mixamo. Use in-place animations or zero Hips translation.

**Key Insight**: Mixamo provides **body only**. Facial expressions (BlendShape) must be driven separately by the emotion engine. Every emotion = body animation clip + face morph target.

**Top Risks**:
| Risk | Severity | Quick Fix |
|------|----------|-----------|
| Skeleton mismatch | 🔴 High | Rename `Chest` → `Spine1`, `UpperChest` → `Spine2` |
| Root motion drift | 🟡 Medium | Use "In Place" variants or zero Hips X/Z |
| Scale explosion | 🔴 High | Bake `0.01` scale in Blender before export |
| Missing facial anim | 🟡 Medium | Maintain separate VRM BlendShape system |
| File size bloat | 🟡 Medium | Always download **Without Skin** |

**Critical Path**:
1. Verify Noah skeleton matches Mixamo naming
2. Download 3 test animations (idle, throw, happy)
3. Test in Three.js with crossfade
4. Build `AnimationController` with priority queue
5. Map 16 emotions → (body clip, face BlendShape, dialog, TTS)

**Read full doc**: [Asset_Pipeline_Mixamo_Animations.md](./Asset_Pipeline_Mixamo_Animations.md)

---

## Cross-Cutting Concerns

### Coordinate Systems

All pipelines must agree on **Y-up, -Z-forward, meter units**:

| Tool | Up | Forward | Unit | Action |
|------|-----|---------|------|--------|
| Three.js | +Y | -Z | meter | Runtime target |
| Blender (export) | +Y | -Z | meter | Check export settings |
| VRM | +Y | -Z | meter | Native match |
| Mixamo | +Y | -Z | centimeter | Scale by 0.01 in Blender |

### File Format Decision Matrix

| Asset Type | Format | Loader | Why |
|------------|--------|--------|-----|
| Static room mesh | GLB | `GLTFLoader` | Small, fast, PBR |
| Avatar mesh + skeleton | FBX | `FBXLoader` | Skeletal animation support |
| Avatar animation (body) | FBX | `FBXLoader` | Mixamo native format |
| Avatar expression | Shape keys inside FBX | `Mesh.morphTargetInfluences` | From VRM BlendShapes |
| Environment texture | PNG/WebP | `TextureLoader` | Transparent background compat |

### Blender Script Inventory

Save these in `scripts/blender/`:

| Script | Purpose | Doc Reference |
|--------|---------|---------------|
| `setup_y_up.py` | Configure Blender for Y-up game workflow | VRM→Blender→FBX §4.3 |
| `rename_bones.py` | Rename VRM bones to Mixamo-compatible names | VRM→Blender→FBX §5.2 |
| `normalize_scale.py` | Scale avatar to ~1.5m target height | VRM→Blender→FBX §5.3 |
| `export_fbx.py` | Standardized FBX export for Noah | VRM→Blender→FBX §6.2 |
| `fix_loop.py` | Adjust keyframes for seamless animation looping | Mixamo §5.1 |
| `zero_hips_translation.py` | Bake animation in-place | Mixamo §4.4 |

---

## Decisions (Confirmed in STAGE-04_Author_Review.md)

| # | Decision | Confirmed Choice | Rationale |
|---|----------|------------------|-----------|
| 1 | Avatar Creation Tool | **VRoid Studio** | Fast MVP, VRM pipeline compatible |
| 2 | Room Art Style | **Low-poly Stylized** (current) | Consistency, easy asset swap via `buildRoomFromGLB()` |
| 3 | Animation Budget | **Mixamo (P0) + Custom Keyframe (P2)** | Free 6 clips immediately, custom for drag/throw |
| 4 | Toon Shading | **PBR (Stage 5–13)** | Realistic, VRM→FBX MToon loss handled gracefully |
| 5 | BlendShape Count | **Reduced Set (12)** | 7 emotions + 5 vowels, balanced complexity |

*All decisions approved by Author on 2026-05-24. See `docs/guides/tasks/STAGE-04_Author_Review.md`.*

---

## Glossary

| Term | Definition |
|------|------------|
| **VRM** | VTuber-ready 3D avatar format (glTF 2.0 based) |
| **GLB** | Binary glTF — single-file 3D format with PBR materials |
| **FBX** | Filmbox format — Autodesk standard for mesh + animation |
| **Mixamo** | Adobe's free mocap animation library |
| **BlendShape** | Mesh deformation target (called Morph Target in Three.js) |
| **MToon** | VRM's cel-shaded material shader |
| **Root Motion** | Animation that moves the character's root bone in world space |
| **Retargeting** | Applying animation from one skeleton to another |
| **In-Place** | Animation where character runs but stays at origin |

---

## Next Steps for Orchestrator

1. **Review this index with the team** (Designer, Animator, Developer)
2. **Make the 5 Open Decisions** above
3. **Create `scripts/blender/` folder** and populate with 6 Python scripts
4. **Produce first test asset**: VRoid → Blender → FBX → Three.js validation
5. **Update Stage 5 task document** with confirmed animation catalog

---

*Index maintained by Orchestrator. For details, see linked technical documents.*
