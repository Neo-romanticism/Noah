#!/usr/bin/env python3
"""
Noah Pipeline — Avatar Scale Normalization
============================================
Run AFTER rename_bones.py.

Ensures Noah's avatar is approximately 1.5m tall in Blender units (meters),
which translates directly to Three.js world units.

Prerequisite:
    - VRM imported and bones renamed
    - Hips and Head bones exist and are named correctly

Usage:
    1. Run rename_bones.py
    2. Run this script
    3. Check viewport: avatar should stand ~1.5 units tall
"""

import bpy

# Noah's target height in meters (Three.js world units)
TARGET_HEIGHT_METERS = 1.5

# Head-to-total-height ratio for anime-style characters
HEAD_TO_HEIGHT_RATIO = 1.0 / 7.5


def normalize_avatar_scale(target_height: float = TARGET_HEIGHT_METERS):
    """
    Scale the avatar armature so that Hips-to-Head distance matches
    the expected proportion of total height.
    """
    armature = next(
        (obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE'),
        None
    )
    if not armature:
        print("[Noah Pipeline] ERROR: No armature found!")
        return

    # Ensure we're in object mode
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.objects.active = armature

    # Get head and hips bones from pose data (object mode accessible)
    hips_bone = armature.pose.bones.get('Hips')
    head_bone = armature.pose.bones.get('Head')

    # Fallback to old VRM names if rename was not run
    if not hips_bone:
        hips_bone = armature.pose.bones.get('J_Bip_C_Hips')
    if not head_bone:
        head_bone = armature.pose.bones.get('J_Bip_C_Head')

    if not hips_bone or not head_bone:
        print("[Noah Pipeline] ERROR: Hips or Head bone not found!")
        print("  Expected names: 'Hips', 'Head'")
        print("  Available bones:", list(armature.pose.bones.keys())[:10], "...")
        return

    # Calculate current Hips-to-Head distance in world space
    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_armature = armature.evaluated_get(depsgraph)

    hips_world = eval_armature.matrix_world @ hips_bone.head
    head_world = eval_armature.matrix_world @ head_bone.head

    current_hh_distance = (head_world - hips_world).length

    if current_hh_distance < 0.001:
        print("[Noah Pipeline] ERROR: Hips and Head are at same position!")
        return

    # Estimate current total height from Hips-Head distance
    current_estimated_height = current_hh_distance / (1 - HEAD_TO_HEIGHT_RATIO)

    # Calculate scale factor
    scale_factor = target_height / current_estimated_height

    # Apply scale to armature object (not bones)
    armature.scale *= scale_factor

    # Apply the scale so it becomes part of the mesh data
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Verify
    eval_armature = armature.evaluated_get(depsgraph)
    hips_world_new = eval_armature.matrix_world @ hips_bone.head
    head_world_new = eval_armature.matrix_world @ head_bone.head
    new_hh = (head_world_new - hips_world_new).length
    new_estimated = new_hh / (1 - HEAD_TO_HEIGHT_RATIO)

    print(f"[Noah Pipeline] Scale normalization complete:")
    print(f"  - Previous estimated height: {current_estimated_height:.3f}m")
    print(f"  - Scale factor applied: {scale_factor:.4f}")
    print(f"  - New estimated height: {new_estimated:.3f}m")
    print(f"  - Target height: {target_height}m")
    print(f"\n  Next step: Run export/export_fbx.py")


if __name__ == "__main__":
    normalize_avatar_scale()
