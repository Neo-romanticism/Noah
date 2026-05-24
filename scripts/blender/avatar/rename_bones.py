#!/usr/bin/env python3
"""
Noah Pipeline — VRM Bone Rename to Mixamo-compatible Names
============================================================
Run AFTER VRM import, BEFORE scale normalization.

This script renames VRM-standard bones to names that Mixamo and Three.js
expect. This is CRITICAL for animation compatibility.

Prerequisite:
    - VRM model imported into current Blender scene
    - setup_y_up.py already executed (recommended)

Usage:
    1. Import VRM via VRM Addon for Blender
    2. Run this script
    3. Verify in Pose Mode that bones are renamed correctly
"""

import bpy

# VRM → FBX/Mixamo bone name mapping
# Left side: VRM standard (Japanese/English hybrid from UniVRM)
# Right side: Mixamo/Three.js standard
VRM_TO_FBX_MAP = {
    # Root / Spine
    'J_Bip_C_Hips': 'Hips',
    'J_Bip_C_Spine': 'Spine',
    'J_Bip_C_Chest': 'Chest',
    'J_Bip_C_UpperChest': 'UpperChest',
    'J_Bip_C_Neck': 'Neck',
    'J_Bip_C_Head': 'Head',

    # Left Leg
    'J_Bip_L_UpperLeg': 'LeftUpLeg',
    'J_Bip_L_LowerLeg': 'LeftLeg',
    'J_Bip_L_Foot': 'LeftFoot',
    'J_Bip_L_ToeBase': 'LeftToeBase',

    # Right Leg
    'J_Bip_R_UpperLeg': 'RightUpLeg',
    'J_Bip_R_LowerLeg': 'RightLeg',
    'J_Bip_R_Foot': 'RightFoot',
    'J_Bip_R_ToeBase': 'RightToeBase',

    # Left Arm
    'J_Bip_L_Shoulder': 'LeftShoulder',
    'J_Bip_L_UpperArm': 'LeftArm',
    'J_Bip_L_LowerArm': 'LeftForeArm',
    'J_Bip_L_Hand': 'LeftHand',

    # Right Arm
    'J_Bip_R_Shoulder': 'RightShoulder',
    'J_Bip_R_UpperArm': 'RightArm',
    'J_Bip_R_LowerArm': 'RightForeArm',
    'J_Bip_R_Hand': 'RightHand',

    # Fingers (optional — Mixamo rarely uses detailed fingers)
    'J_Bip_L_ThumbProximal': 'LeftHandThumb1',
    'J_Bip_L_ThumbIntermediate': 'LeftHandThumb2',
    'J_Bip_L_ThumbDistal': 'LeftHandThumb3',
    'J_Bip_L_IndexProximal': 'LeftHandIndex1',
    'J_Bip_L_IndexIntermediate': 'LeftHandIndex2',
    'J_Bip_L_IndexDistal': 'LeftHandIndex3',
    'J_Bip_L_MiddleProximal': 'LeftHandMiddle1',
    'J_Bip_L_MiddleIntermediate': 'LeftHandMiddle2',
    'J_Bip_L_MiddleDistal': 'LeftHandMiddle3',
    'J_Bip_L_RingProximal': 'LeftHandRing1',
    'J_Bip_L_RingIntermediate': 'LeftHandRing2',
    'J_Bip_L_RingDistal': 'LeftHandRing3',
    'J_Bip_L_LittleProximal': 'LeftHandPinky1',
    'J_Bip_L_LittleIntermediate': 'LeftHandPinky2',
    'J_Bip_L_LittleDistal': 'LeftHandPinky3',

    'J_Bip_R_ThumbProximal': 'RightHandThumb1',
    'J_Bip_R_ThumbIntermediate': 'RightHandThumb2',
    'J_Bip_R_ThumbDistal': 'RightHandThumb3',
    'J_Bip_R_IndexProximal': 'RightHandIndex1',
    'J_Bip_R_IndexIntermediate': 'RightHandIndex2',
    'J_Bip_R_IndexDistal': 'RightHandIndex3',
    'J_Bip_R_MiddleProximal': 'RightHandMiddle1',
    'J_Bip_R_MiddleIntermediate': 'RightHandMiddle2',
    'J_Bip_R_MiddleDistal': 'RightHandMiddle3',
    'J_Bip_R_RingProximal': 'RightHandRing1',
    'J_Bip_R_RingIntermediate': 'RightHandRing2',
    'J_Bip_R_RingDistal': 'RightHandRing3',
    'J_Bip_R_LittleProximal': 'RightHandPinky1',
    'J_Bip_R_LittleIntermediate': 'RightHandPinky2',
    'J_Bip_R_LittleDistal': 'RightHandPinky3',
}

# Additional rename for exact Mixamo spine hierarchy
# Only apply this if you need EXACT Mixamo skeleton match
MIXAMO_SPINE_MAP = {
    'Chest': 'Spine1',
    'UpperChest': 'Spine2',
}


def rename_vrm_bones(use_mixamo_spine: bool = True):
    """
    Rename VRM bones to FBX/Mixamo compatible names.

    Args:
        use_mixamo_spine: If True, also renames Chest→Spine1, UpperChest→Spine2
                          for exact Mixamo hierarchy match.
    """
    armature = next(
        (obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE'),
        None
    )
    if not armature:
        print("[Noah Pipeline] ERROR: No armature found in scene!")
        print("  Make sure you have imported a VRM file first.")
        return

    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='EDIT')

    renamed_count = 0
    edit_bones = armature.data.edit_bones

    # First pass: VRM → FBX base names
    for bone in edit_bones:
        if bone.name in VRM_TO_FBX_MAP:
            new_name = VRM_TO_FBX_MAP[bone.name]
            print(f"[Noah Pipeline] {bone.name} → {new_name}")
            bone.name = new_name
            renamed_count += 1

    # Second pass (optional): Exact Mixamo spine naming
    if use_mixamo_spine:
        for bone in edit_bones:
            if bone.name in MIXAMO_SPINE_MAP:
                new_name = MIXAMO_SPINE_MAP[bone.name]
                print(f"[Noah Pipeline] {bone.name} → {new_name} (Mixamo exact)")
                bone.name = new_name
                renamed_count += 1

    bpy.ops.object.mode_set(mode='OBJECT')

    print(f"\n[Noah Pipeline] Bone rename complete: {renamed_count} bones renamed.")
    print("  Next step: Run normalize_scale.py")


if __name__ == "__main__":
    # Set to False if you prefer Chest/UpperChest naming over Spine1/Spine2
    rename_vrm_bones(use_mixamo_spine=True)
