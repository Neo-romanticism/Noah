# Asset Pipeline: VRM → Blender → FBX

> **Scope**: Avatar creation pipeline from VRM source to FBX runtime asset  
> **Status**: Specification / Pre-production  
> **Owner**: Orchestrator / Technical Artist / Character Artist

---

## 1. Pipeline Overview

```
┌─────────┐    ┌────────────┐    ┌─────────────┐    ┌──────────┐    ┌─────────┐
│  VRM    │───►│  Blender   │───►│  Clean /    │───►│   FBX    │───►│ Three.js│
│ Source  │    │  Import    │    │  Retarget   │    │  Export  │    │ Runtime │
└─────────┘    └────────────┘    └─────────────┘    └──────────┘    └─────────┘
     │               │                  │                 │               │
     │               │                  │                 │               │
  VRoid Studio    VRM Addon         Bone rename       Y-up /          FBXLoader
  (or custom)     for Blender       + Scale fix       cm→m            + Mixer
```

### Why This Pipeline?

- **VRM**: Industry-standard VTuber format. Easy to generate (VRoid Studio), rich BlendShape data.
- **Blender**: Universal DCC hub. Can import VRM, clean skeleton, preview animations.
- **FBX**: Three.js has mature `FBXLoader` with skeletal animation support.

**Alternative considered**: Load VRM directly in Three.js via `@pixiv/three-vrm`.  
**Rejected because**: Adds heavy dependency (500KB+), VRM spec complexity (SpringBone, MToon shader) is overkill for Noah's needs. FBX gives us simpler control.

---

## 2. VRM Source Requirements

### 2.1 Recommended Tool: VRoid Studio

- **Pros**: Free, procedural character generation, exports VRM 1.0, built-in BlendShapes ( emotions, lip sync )
- **Cons**: Generic look (can be customized), limited clothing options without external tools
- **Export settings**:
  - Format: `VRM 1.0`
  - BlendShape Normals: `Keep` (or `Split` if issues occur)
  - Reduce BlendShapes to **essential** set:
    - `A`, `I`, `U`, `E`, `O` (vowels)
    - `Blink`, `Blink_L`, `Blink_R`
    - `Joy`, `Angry`, `Sorrow`, `Fun` (emotions)
    - `LookUp`, `LookDown`, `LookLeft`, `LookRight`

### 2.2 Custom VRM (if VRoid is insufficient)

If a unique art style is required:

1. Model in Blender/ZBrush/Maya
2. Rig to **VRM Standard Skeleton**:
   - `J_Bip_C_Hips` (root)
   - `J_Bip_C_Spine`, `J_Bip_C_Chest`, `J_Bip_C_UpperChest`
   - `J_Bip_L_UpperLeg` … `J_Bip_L_ToeBase`
   - `J_Bip_L_UpperArm` … `J_Bip_L_Hand` + fingers
3. Export via UniVRM (Unity) or VRM Addon for Blender

---

## 3. Blender Import & Setup

### 3.1 Required Add-on: VRM Addon for Blender

- **Install**: `Edit → Preferences → Add-ons → Install from Disk`
- **Download**: https://github.com/vrm-c/UniVRM/releases (Blender add-on `.zip`)
- **Supported versions**: Blender 3.6 LTS, 4.0, 4.1+

### 3.2 Import Steps

1. **File → Import → VRM (.vrm)**
2. In import options:
   - ✅ Extract images into folder (for texture access)
   - ✅ Make New Material (Principled BSDF conversion)
   - ☐ Convert MToon to Principled BSDF (do this manually for control)

### 3.3 Post-Import Cleanup Checklist

| Check | Description | Why |
|-------|-------------|-----|
| ☑ Scale | Model height ≈ 1.5–1.7 units (meters) | VRM often imports at 1.0 or 100x depending on addon version |
| ☑ Rotation | Hips bone should point +Y (up), facing -Z (Three.js forward) | Critical for animation compatibility |
| ☑ Bone visibility | Ensure all 55 VRM bones are present | Missing fingers = broken hand gestures |
| ☑ Mesh seams | Check for split normals at UV seams | Can cause lighting artifacts |
| ☑ Texture paths | Verify PNG/PSD files are linked | Orphaned textures = pink material in Three.js |

---

## 4. The Y-Up / Z-Up Problem

This is the **#1 source of silent bugs** in DCC → Game Engine pipelines.

### 4.1 Coordinate System Reference

| System | Up Axis | Forward Axis | Right Axis | Notes |
|--------|---------|--------------|------------|-------|
| Three.js | +Y | -Z | +X | OpenGL convention |
| Blender (default) | +Z | -Y | +X | Internal math |
| Blender (export) | +Y | -Z | +X | When "+Y Up" is checked |
| FBX SDK | Configurable | Configurable | +X | Usually +Y Up in game engines |
| VRM | +Y | -Z | +X | Same as Three.js (glTF heritage) |
| Mixamo | +Y | -Z | +X | Same as Three.js |

### 4.2 The Trap

Blender's **viewport** uses Z-up. If you rotate the model in Blender to "look correct" in the viewport, you are applying a **-90° X rotation** that will bake into the FBX export unless you compensate.

**Incorrect workflow**:
```
1. Import VRM (Y-up)
2. Model looks "lying down" in Blender viewport
3. Artist rotates model +90° X to stand up
4. Export FBX with "+Y Up" checked
5. Result: Model imports into Three.js with baked -90° rotation
6. Skeleton animations don't match mesh orientation
```

**Correct workflow**:
```
1. Import VRM (Y-up)
2. Switch Blender viewport to Y-up orientation:
   - View → Viewport → View Axis → Y Up
   - OR: Use Blender 4.x "Orientation" dropdown in top-right
3. Model stands upright WITHOUT manual rotation
4. Export FBX with "+Y Up" checked
5. Result: Clean identity rotation in Three.js
```

### 4.3 Blender Python Script: Orientation Setup

Save as `scripts/blender/setup_y_up.py` in the project:

```python
import bpy

def ensure_y_up_workspace():
    """
    Configure Blender for Y-up game-engine workflow.
    Run once per Blender session before working on Noah assets.
    """
    # 1. Set viewport orientation to Y-up (Blender 4.0+)
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    # Y-up, -Z forward
                    space.shading.type = 'MATERIAL'
                    # Note: Blender 4.x uses 'VIEWPORT' orientation
                    # There is no direct API for Y-up viewport in older versions
                    # Workaround: Rotate the default cube to show orientation

    # 2. Clear any object rotation (reset to identity)
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            obj.rotation_euler = (0, 0, 0)
            # If model was previously rotated to compensate for Z-up viewport:
            # obj.rotation_euler = (1.5708, 0, 0)  # +90° X (WRONG — remove this)

    # 3. Set unit scale to meters (matches Three.js)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1.0

    # 4. Set frame rate to 30fps (Three.js default, Mixamo standard)
    bpy.context.scene.render.fps = 30

    print("[Noah Pipeline] Blender configured: Y-up, meters, 30fps")

if __name__ == "__main__":
    ensure_y_up_workspace()
```

---

## 5. Skeleton Preparation for FBX Export

### 5.1 Bone Naming Strategy

VRM uses Japanese-style naming. For FBX → Three.js clarity, **rename bones to English**:

| VRM Name | FBX Export Name | Purpose |
|----------|-----------------|---------|
| `J_Bip_C_Hips` | `Hips` | Root motion bone |
| `J_Bip_C_Spine` | `Spine` | Lower back |
| `J_Bip_C_Chest` | `Chest` | Upper torso |
| `J_Bip_C_UpperChest` | `UpperChest` | Shoulder base |
| `J_Bip_L_UpperLeg` | `LeftUpLeg` | Left thigh |
| `J_Bip_L_LowerLeg` | `LeftLeg` | Left shin |
| `J_Bip_L_Foot` | `LeftFoot` | Left ankle |
| `J_Bip_L_ToeBase` | `LeftToeBase` | Left toes |
| `J_Bip_L_UpperArm` | `LeftArm` | Left upper arm |
| `J_Bip_L_LowerArm` | `LeftForeArm` | Left elbow |
| `J_Bip_L_Hand` | `LeftHand` | Left wrist |
| `J_Bip_C_Neck` | `Neck` | Neck |
| `J_Bip_C_Head` | `Head` | Head |

**Why rename?**: Mixamo animations use `Hips`, `LeftUpLeg`, etc. If we ever use Mixamo clips (Stage 6+), bone names must match.

### 5.2 Blender Python: Auto-Rename Script

```python
import bpy

VRM_TO_FBX_MAP = {
    'J_Bip_C_Hips': 'Hips',
    'J_Bip_C_Spine': 'Spine',
    'J_Bip_C_Chest': 'Chest',
    'J_Bip_C_UpperChest': 'UpperChest',
    'J_Bip_C_Neck': 'Neck',
    'J_Bip_C_Head': 'Head',
    'J_Bip_L_UpperLeg': 'LeftUpLeg',
    'J_Bip_L_LowerLeg': 'LeftLeg',
    'J_Bip_L_Foot': 'LeftFoot',
    'J_Bip_L_ToeBase': 'LeftToeBase',
    'J_Bip_R_UpperLeg': 'RightUpLeg',
    'J_Bip_R_LowerLeg': 'RightLeg',
    'J_Bip_R_Foot': 'RightFoot',
    'J_Bip_R_ToeBase': 'RightToeBase',
    'J_Bip_L_UpperArm': 'LeftArm',
    'J_Bip_L_LowerArm': 'LeftForeArm',
    'J_Bip_L_Hand': 'LeftHand',
    'J_Bip_R_UpperArm': 'RightArm',
    'J_Bip_R_LowerArm': 'RightForeArm',
    'J_Bip_R_Hand': 'RightHand',
}

def rename_vrm_bones():
    """Rename VRM bones to FBX/Mixamo compatible names."""
    armature = next((obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE'), None)
    if not armature:
        print("[Noah Pipeline] No armature found!")
        return

    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='EDIT')

    for bone in armature.data.edit_bones:
        if bone.name in VRM_TO_FBX_MAP:
            old_name = bone.name
            bone.name = VRM_TO_FBX_MAP[old_name]
            print(f"[Noah Pipeline] Renamed: {old_name} → {bone.name}")

    bpy.ops.object.mode_set(mode='OBJECT')
    print("[Noah Pipeline] Bone rename complete.")

if __name__ == "__main__":
    rename_vrm_bones()
```

### 5.3 Scale Normalization

VRM units are meters (1 unit = 1 meter). However, some Blender VRM addons import at **0.01 scale** (cm legacy) or **100 scale** (decimal error).

**Target**: Noah's height in Three.js should be approximately **1.5 world units**.

```python
def normalize_avatar_scale(target_height: float = 1.5):
    """
    Scale avatar so that Hips-to-Head distance equals target_height * 0.85
    (head is ~15% of total height).
    """
    armature = next((obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE'), None)
    if not armature:
        return

    # Get head and hips world positions
    hips = armature.pose.bones.get('Hips') or armature.pose.bones.get('J_Bip_C_Hips')
    head = armature.pose.bones.get('Head') or armature.pose.bones.get('J_Bip_C_Head')

    if not hips or not head:
        print("[Noah Pipeline] Hips or Head bone not found!")
        return

    # Apply scale to armature object (not bones)
    current_height = (head.head - hips.head).length
    scale_factor = (target_height * 0.85) / current_height

    armature.scale *= scale_factor
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    print(f"[Noah Pipeline] Scaled avatar by {scale_factor:.4f} to height ~{target_height}m")
```

---

## 6. FBX Export Settings

### 6.1 Blender FBX Export UI Settings

**File → Export → FBX (.fbx)**

| Section | Setting | Value | Reason |
|---------|---------|-------|--------|
| Include | Selected Objects | ☐ (export all) | Ensure skeleton + mesh |
| Include | Active Collection Only | ☐ | Export full scene |
| Transform | Scale All | ✅ | Normalize scale |
| Transform | Apply Scalings | `FBX Units Scale` | Consistent with Three.js |
| Transform | Forward | `-Z Forward` | Matches Three.js |
| Transform | Up | `Y Up` | **CRITICAL** |
| Transform | Apply Unit | ✅ | Meters |
| Transform | Apply Transform | ✅ | Bake rotation/scale |
| Geometry | Apply Modifiers | ✅ | Final mesh state |
| Geometry | Use Modifiers Render Setting | ✅ | Use render subdiv |
| Armature | Add Leaf Bones | ☐ | Cleaner skeleton |
| Armature | Primary Bone Axis | `Y Axis` | Mixamo compatible |
| Armature | Secondary Bone Axis | `X Axis` | Standard |
| Armature | Deform Bones Only | ☐ | Keep all bones for control |
| Animation | Bake Animation | ✅ (if modifiers/IK used) | Bake constraints to keyframes |
| Animation | Key All Bones | ☐ | Smaller file |
| Animation | NLA Strips | ☐ | Simpler export |
| Animation | All Actions | ☐ | Export only current action |

### 6.2 Automated Export Script

```python
import bpy
import os

def export_noah_fbx(output_path: str):
    """
    Export Noah avatar to FBX with standardized settings.
    Run after: import VRM → rename bones → normalize scale.
    """
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Deselect all
    bpy.ops.object.select_all(action='DESELECT')

    # Select armature and all mesh objects
    for obj in bpy.context.scene.objects:
        if obj.type in {'ARMATURE', 'MESH'}:
            obj.select_set(True)

    # Export
    bpy.ops.export_scene.fbx(
        filepath=output_path,
        use_selection=True,
        global_scale=1.0,
        apply_unit_scale=True,
        apply_scale_options='FBX_SCALE_UNITS',
        axis_forward='-Z',
        axis_up='Y',
        bake_space_transform=True,
        use_mesh_modifiers=True,
        use_armature_deform_only=False,
        add_leaf_bones=False,
        primary_bone_axis='Y',
        secondary_bone_axis='X',
        bake_anim=True,
        bake_anim_use_all_bones=False,
        bake_anim_use_nla_strips=False,
        bake_anim_use_all_actions=False,
        bake_anim_force_startend_keying=True,
    )

    print(f"[Noah Pipeline] Exported: {output_path}")

# Usage:
# export_noah_fbx('/path/to/noah-project/assets/models/noah.fbx')
```

---

## 7. BlendShape / Morph Target Preservation

### 7.1 VRM BlendShape → FBX Morph Target

VRM BlendShapes are **preserved** during FBX export as long as:

1. The mesh has **shape keys** in Blender (imported from VRM)
2. `Apply Modifiers` is checked (shape keys survive)
3. The mesh is not split by materials during export

### 7.2 Three.js Runtime Access

```typescript
// After FBXLoader loads the avatar
const mesh = avatar.group.getObjectByName('Face') as THREE.Mesh;
const morphTargets = mesh.morphTargetDictionary; // { 'Joy': 0, 'Blink': 1, ... }

// Set emotion
if (morphTargets && morphTargets['Joy'] !== undefined) {
  mesh.morphTargetInfluences![morphTargets['Joy']] = 0.8;
}
```

### 7.3 BlendShape Naming Convention

Export from Blender with these shape key names (cleaned from VRM defaults):

| VRM BlendShape | Shape Key Name | Runtime Use |
|----------------|----------------|-------------|
| `Blink` | `eyeBlink` | Idle blinking |
| `Joy` | `emotionJoy` | Happy state |
| `Angry` | `emotionAngry` | Angry state |
| `Sorrow` | `emotionSad` | Sad state |
| `A` | `vowelA` | Lip sync |
| `I` | `vowelI` | Lip sync |

**Note**: Shape key names may have `.001`, `.002` suffixes if duplicates exist. Clean these in Blender before export.

---

## 8. Material Conversion: MToon → Standard

### 8.1 The Problem

VRM uses **MToon** shader (cel-shaded, rim light, outline). Three.js does not have a native MToon implementation.

### 8.2 Blender Conversion

In Blender, MToon materials are converted to **Principled BSDF** during VRM import. However, some properties are lost:

| MToon Property | Principled BSDF Equivalent | Lost? |
|----------------|---------------------------|-------|
| Base color | Base Color | ❌ Preserved |
| Shade color | — | ✅ Lost (use roughness instead) |
| Rim color | Emission (approximate) | ⚠️ Approximated |
| Outline | — | ✅ Lost (geometry-based in VRM) |
| Normal map | Normal | ❌ Preserved |

### 8.3 Three.js Material Strategy

```typescript
// After FBX load, upgrade materials to PBR
object.traverse((child) => {
  if ((child as THREE.Mesh).isMesh) {
    const mesh = child as THREE.Mesh;
    const oldMat = mesh.material as THREE.MeshStandardMaterial;

    // If material name contains 'Face', reduce roughness for skin
    if (mesh.name.includes('Face')) {
      oldMat.roughness = 0.4;
      oldMat.metalness = 0.0;
    }

    // If material name contains 'Hair', add slight metalness
    if (mesh.name.includes('Hair')) {
      oldMat.roughness = 0.3;
      oldMat.metalness = 0.1;
    }
  }
});
```

**Future**: If cel-shaded look is desired, implement a custom `MeshToonMaterial` shader in Three.js (Stage 14+).

---

## 9. Validation Checklist

Before committing `noah.fbx` to the repo:

```markdown
- [ ] File size < 50MB (target: < 20MB)
- [ ] Triangle count < 50,000 (target: < 20,000)
- [ ] Single armature root (named `Armature` or `Noah_Rig`)
- [ ] Hips bone at scene origin (0, 0, 0) in bind pose
- [ ] No -90° X rotation on mesh or armature
- [ ] Scale is (1, 1, 1) on all objects (applied)
- [ ] All textures are embedded or in `assets/models/` folder
- [ ] Shape keys present and named cleanly (no `.001` suffixes)
- [ ] One animation clip (idle) baked at 30fps for testing
- [ ] Imports cleanly into Three.js FBXLoader (test with placeholder replacement)
```

---

## 10. Action Items

| Priority | Task | Owner | Output |
|----------|------|-------|--------|
| P0 | Install VRM Addon for Blender | Tech Artist | Working Blender env |
| P0 | Create `scripts/blender/` folder in repo | Developer | `setup_y_up.py`, `rename_bones.py`, `export_fbx.py` |
| P1 | Generate first VRM (VRoid Studio) | Character Artist | `noah_v1.vrm` |
| P1 | Run full pipeline: VRM → Blender → FBX | Tech Artist | `noah.fbx` |
| P1 | Test `noah.fbx` in Three.js runtime | Developer | Verified load + render |
| P2 | Document BlendShape naming standard | Tech Artist | `docs/technical/BlendShape_Naming.md` |
| P2 | Implement material upgrade logic in `loadAvatar()` | Developer | Code PR |
| P3 | Add outline / toon shader (optional) | Developer | Custom shader (Stage 14) |

---

*Prepared by Orchestrator for Stage 4 avatar pipeline planning.*
