#!/usr/bin/env python3
"""
Mixamo FBX → VRM-retargeted GLB Animation Converter
====================================================

Converts Mixamo FBX animation files to GLB format with bones retargeted
to VRM's J_Bip_* naming convention.

Usage:
    blender --background --python scripts/blender/convert_mixamo_to_glb.py

Requirements:
    - Blender 3.0+ (tested with Blender 5.1)
    - VRM file with J_Bip_* bone structure for reference

Input: Mixamo FBX files from ~/Downloads/
Output: GLB animation files in assets/animations/
"""

import bpy
import sys
import os
import json

# ── Configuration ──────────────────────────────────────────────────

VRM_PATH = os.path.abspath("assets/models/Noah3.vrm")
OUTPUT_DIR = os.path.abspath("assets/animations")
DOWNLOADS_DIR = os.path.expanduser("~/Downloads")

# Mixamo bone → VRM bone mapping
# Based on noa project's retargeting + VRM 1.0 humanoid spec
MIXAMO_TO_VRM = {
    # Spine / Head
    "mixamorig:Hips":              "J_Bip_C_Hips",
    "mixamorig:Spine":             "J_Bip_C_Spine",
    "mixamorig:Spine1":            "J_Bip_C_Chest",
    "mixamorig:Spine2":            "J_Bip_C_UpperChest",
    "mixamorig:Neck":              "J_Bip_C_Neck",
    "mixamorig:Head":              "J_Bip_C_Head",
    "mixamorig:HeadTop_End":       None,  # End bone, skip

    # Right Arm
    "mixamorig:RightShoulder":     "J_Bip_R_Shoulder",
    "mixamorig:RightArm":          "J_Bip_R_UpperArm",
    "mixamorig:RightForeArm":      "J_Bip_R_LowerArm",
    "mixamorig:RightHand":         "J_Bip_R_Hand",

    # Right Fingers
    "mixamorig:RightHandThumb1":   "J_Bip_R_Thumb1",
    "mixamorig:RightHandThumb2":   "J_Bip_R_Thumb2",
    "mixamorig:RightHandThumb3":   "J_Bip_R_Thumb3",
    "mixamorig:RightHandThumb4":   None,  # End bone
    "mixamorig:RightHandIndex1":   "J_Bip_R_Index1",
    "mixamorig:RightHandIndex2":   "J_Bip_R_Index2",
    "mixamorig:RightHandIndex3":   "J_Bip_R_Index3",
    "mixamorig:RightHandIndex4":   None,  # End bone
    "mixamorig:RightHandMiddle1":  "J_Bip_R_Middle1",
    "mixamorig:RightHandMiddle2":  "J_Bip_R_Middle2",
    "mixamorig:RightHandMiddle3":  "J_Bip_R_Middle3",
    "mixamorig:RightHandMiddle4":  None,  # End bone
    "mixamorig:RightHandRing1":    "J_Bip_R_Ring1",
    "mixamorig:RightHandRing2":    "J_Bip_R_Ring2",
    "mixamorig:RightHandRing3":    "J_Bip_R_Ring3",
    "mixamorig:RightHandRing4":    None,  # End bone
    "mixamorig:RightHandPinky1":   "J_Bip_R_Little1",
    "mixamorig:RightHandPinky2":   "J_Bip_R_Little2",
    "mixamorig:RightHandPinky3":   "J_Bip_R_Little3",
    "mixamorig:RightHandPinky4":   None,  # End bone

    # Left Arm
    "mixamorig:LeftShoulder":      "J_Bip_L_Shoulder",
    "mixamorig:LeftArm":           "J_Bip_L_UpperArm",
    "mixamorig:LeftForeArm":       "J_Bip_L_LowerArm",
    "mixamorig:LeftHand":          "J_Bip_L_Hand",

    # Left Fingers
    "mixamorig:LeftHandThumb1":    "J_Bip_L_Thumb1",
    "mixamorig:LeftHandThumb2":    "J_Bip_L_Thumb2",
    "mixamorig:LeftHandThumb3":    "J_Bip_L_Thumb3",
    "mixamorig:LeftHandThumb4":    None,  # End bone
    "mixamorig:LeftHandIndex1":    "J_Bip_L_Index1",
    "mixamorig:LeftHandIndex2":    "J_Bip_L_Index2",
    "mixamorig:LeftHandIndex3":    "J_Bip_L_Index3",
    "mixamorig:LeftHandIndex4":    None,  # End bone
    "mixamorig:LeftHandMiddle1":   "J_Bip_L_Middle1",
    "mixamorig:LeftHandMiddle2":   "J_Bip_L_Middle2",
    "mixamorig:LeftHandMiddle3":   "J_Bip_L_Middle3",
    "mixamorig:LeftHandMiddle4":   None,  # End bone
    "mixamorig:LeftHandRing1":     "J_Bip_L_Ring1",
    "mixamorig:LeftHandRing2":     "J_Bip_L_Ring2",
    "mixamorig:LeftHandRing3":     "J_Bip_L_Ring3",
    "mixamorig:LeftHandRing4":     None,  # End bone
    "mixamorig:LeftHandPinky1":    "J_Bip_L_Little1",
    "mixamorig:LeftHandPinky2":    "J_Bip_L_Little2",
    "mixamorig:LeftHandPinky3":    "J_Bip_L_Little3",
    "mixamorig:LeftHandPinky4":    None,  # End bone

    # Right Leg
    "mixamorig:RightUpLeg":        "J_Bip_R_UpperLeg",
    "mixamorig:RightLeg":          "J_Bip_R_LowerLeg",
    "mixamorig:RightFoot":         "J_Bip_R_Foot",
    "mixamorig:RightToeBase":      "J_Bip_R_ToeBase",
    "mixamorig:RightToe_End":      None,  # End bone

    # Left Leg
    "mixamorig:LeftUpLeg":         "J_Bip_L_UpperLeg",
    "mixamorig:LeftLeg":           "J_Bip_L_LowerLeg",
    "mixamorig:LeftFoot":          "J_Bip_L_Foot",
    "mixamorig:LeftToeBase":       "J_Bip_L_ToeBase",
    "mixamorig:LeftToe_End":       None,  # End bone
}

# Animation file mapping: output_name → source_fbx_filename
# These are the 10 triggers defined in manifest.json
ANIMATION_MAP = {
    "idle":   "Standing Idle.fbx",
    "drag":   "Floating.fbx",
    "throw":  "Falling.fbx",
    "land":   "Situp To Idle.fbx",
    "dizzy":  "Terrified.fbx",
    "eat":    "Praying.fbx",
    "sleep":  "Female Laying Pose.fbx",
    "happy":  "Happy Idle.fbx",
    "sad":    "Disappointed.fbx",
    "angry":  "Angry.fbx",
}


def clear_scene():
    """Remove all objects from the scene."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    # Clean up data blocks
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for arm in list(bpy.data.armatures):
        if arm.users == 0:
            bpy.data.armatures.remove(arm)
    for action in list(bpy.data.actions):
        if action.users == 0:
            bpy.data.actions.remove(action)


def import_vrm_reference(vrm_path: str) -> bpy.types.Object:
    """Import VRM file and return the armature object."""
    print(f"[VRM] Importing reference: {vrm_path}")
    try:
        bpy.ops.import_scene.vrm(filepath=vrm_path)
    except Exception as e:
        print(f"[VRM] Import failed: {e}")
        sys.exit(1)

    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            print(f"[VRM] Found armature: {obj.name} ({len(obj.data.bones)} bones)")
            return obj

    print("[VRM] No armature found in VRM file!")
    sys.exit(1)


def import_mixamo_fbx(fbx_path: str) -> tuple:
    """Import Mixamo FBX and return (armature_object, action)."""
    print(f"[FBX] Importing: {fbx_path}")
    bpy.ops.import_scene.fbx(filepath=fbx_path)

    armature = None
    action = None

    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            armature = obj
        if obj.animation_data and obj.animation_data.action:
            action = obj.animation_data.action

    if armature is None:
        print("[FBX] No armature found!")
        return None, None

    print(f"[FBX] Armature: {armature.name}, Bones: {len(armature.data.bones)}")
    if action:
        print(f"[FBX] Action: {action.name}, Frames: {action.frame_range[0]:.0f}-{action.frame_range[1]:.0f}")

    return armature, action


def retarget_action(action: bpy.types.Action, output_name: str) -> bpy.types.Action:
    """Copy and retarget bone names in an action."""
    print(f"[RETARGET] Creating retargeted action: {output_name}")

    new_action = action.copy()
    new_action.name = output_name

    mapped = 0
    skipped = 0

    for layer in new_action.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                for fc in cb.fcurves:
                    dp = fc.data_path
                    if 'pose.bones["' in dp:
                        start = dp.find('pose.bones["') + len('pose.bones["')
                        end = dp.find('"]', start)
                        mixamo_name = dp[start:end]
                        vrm_name = MIXAMO_TO_VRM.get(mixamo_name)
                        if vrm_name:
                            fc.data_path = dp.replace(f'"{mixamo_name}"', f'"{vrm_name}"')
                            mapped += 1
                        else:
                            skipped += 1

    print(f"[RETARGET] Mapped: {mapped}, Skipped: {skipped}")
    return new_action


def export_animation_glb(vrm_armature: bpy.types.Object, action: bpy.types.Action,
                         output_path: str):
    """Export animation as GLB with only the armature (no mesh)."""
    print(f"[EXPORT] Exporting to: {output_path}")

    # Remove any other objects (FBX armature, meshes)
    for obj in list(bpy.context.scene.objects):
        if obj != vrm_armature:
            bpy.data.objects.remove(obj, do_unlink=True)

    # Remove VRM meshes if any remain
    for obj in list(bpy.context.scene.objects):
        if obj.type == 'MESH':
            bpy.data.objects.remove(obj, do_unlink=True)

    # Assign retargeted action to VRM armature
    if not vrm_armature.animation_data:
        vrm_armature.animation_data_create()
    vrm_armature.animation_data.action = action

    # Push to NLA for glTF export
    if vrm_armature.animation_data.nla_tracks:
        for track in list(vrm_armature.animation_data.nla_tracks):
            vrm_armature.animation_data.nla_tracks.remove(track)

    track = vrm_armature.animation_data.nla_tracks.new()
    track.name = action.name
    track.strips.new(action.name, int(action.frame_range[0]), action)

    # Clear active action so NLA is used by exporter
    vrm_armature.animation_data.action = None

    # Select only armature
    bpy.ops.object.select_all(action='DESELECT')
    vrm_armature.select_set(True)
    bpy.context.view_layer.objects.active = vrm_armature

    # Export as GLB
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_animations=True,
        export_animation_mode='NLA_TRACKS',
        export_skins=True,
        export_morph=False,
        export_draco_mesh_compression_enable=False,
        export_yup=True,
    )

    print(f"[EXPORT] Done: {output_path}")


def process_animation(vrm_armature: bpy.types.Object, output_name: str, fbx_filename: str):
    """Process a single animation: import FBX, retarget, export GLB."""
    fbx_path = os.path.join(DOWNLOADS_DIR, fbx_filename)
    if not os.path.exists(fbx_path):
        print(f"[SKIP] FBX not found: {fbx_path}")
        return False

    output_path = os.path.join(OUTPUT_DIR, f"{output_name}.glb")

    # Import Mixamo FBX
    mixamo_armature, fbx_action = import_mixamo_fbx(fbx_path)
    if mixamo_armature is None or fbx_action is None:
        print(f"[SKIP] Failed to load animation from {fbx_filename}")
        return False

    # Retarget
    retargeted_action = retarget_action(fbx_action, output_name)

    # Export
    export_animation_glb(vrm_armature, retargeted_action, output_path)

    # Clean up: remove FBX action if unused
    if fbx_action.users == 0:
        bpy.data.actions.remove(fbx_action)

    # Verify output
    try:
        with open(output_path, 'rb') as f:
            header = f.read(12)
            chunk0_len = int.from_bytes(f.read(4), 'little')
            chunk0_type = f.read(4)
            json_data = json.loads(f.read(chunk0_len))
            anims = json_data.get('animations', [])
            print(f"[VERIFY] {len(anims)} animation(s) in GLB")
            for anim in anims:
                print(f"  - {anim.get('name', 'unnamed')}: {len(anim.get('channels', []))} channels")
    except Exception as e:
        print(f"[VERIFY] Error reading output: {e}")

    return True


def main():
    print("=" * 60)
    print("Mixamo FBX → VRM-retargeted GLB Converter")
    print("=" * 60)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Clear scene
    clear_scene()

    # Import VRM reference
    vrm_armature = import_vrm_reference(VRM_PATH)

    # Process each animation
    success_count = 0
    for output_name, fbx_filename in ANIMATION_MAP.items():
        print(f"\n{'=' * 50}")
        print(f"Processing: {output_name} ← {fbx_filename}")
        print('=' * 50)

        if process_animation(vrm_armature, output_name, fbx_filename):
            success_count += 1

        # Clean scene for next iteration (keep VRM armature)
        for obj in list(bpy.context.scene.objects):
            if obj != vrm_armature:
                bpy.data.objects.remove(obj, do_unlink=True)

        # Clear NLA tracks
        if vrm_armature.animation_data:
            vrm_armature.animation_data.action = None
            for track in list(vrm_armature.animation_data.nla_tracks):
                vrm_armature.animation_data.nla_tracks.remove(track)

    print(f"\n{'=' * 60}")
    print(f"Done! {success_count}/{len(ANIMATION_MAP)} animations converted")
    print(f"Output directory: {OUTPUT_DIR}")
    print('=' * 60)


if __name__ == "__main__":
    main()
