#!/usr/bin/env python3
"""
Noah Pipeline — Zero Hips Translation (In-Place Bake)
=====================================================
Run on Mixamo animations that have root motion (Hips moving in X/Z).

This script removes horizontal translation from the Hips bone,
converting the animation to "in-place" style. Vertical (Y) motion
is preserved for breathing/crouching.

Prerequisite:
    - Mixamo FBX imported (Without Skin)
    - Animation has a Hips bone with position keyframes

Usage:
    1. Import animation FBX
    2. Select armature
    3. Run this script
    4. Verify: animation should play without character drifting
    5. Export via export/export_fbx.py

WARNING: This modifies the animation in-place. Save a backup first!
"""

import bpy


def zero_hips_translation(preserve_vertical: bool = True):
    """
    Remove Hips translation in X and Z axes.

    Args:
        preserve_vertical: If True, keeps Y-axis motion (breathing, jumping).
                           If False, zeros all axes (true in-place).
    """
    obj = bpy.context.active_object
    if not obj or obj.type != 'ARMATURE':
        print("[Noah Pipeline] ERROR: Please select an armature.")
        return

    action = obj.animation_data.action if obj.animation_data else None
    if not action:
        print("[Noah Pipeline] ERROR: No active animation on selected armature.")
        return

    hips_bone = obj.pose.bones.get('Hips')
    if not hips_bone:
        print("[Noah Pipeline] ERROR: 'Hips' bone not found!")
        print("  Available root bones:", [b.name for b in obj.pose.bones if 'hip' in b.name.lower()])
        return

    data_path = hips_bone.path_from_id('location')
    fcurves = [fc for fc in action.fcurves if fc.data_path == data_path]

    if not fcurves:
        print("[Noah Pipeline] WARNING: No location keyframes found on Hips.")
        print("  This animation may already be in-place, or uses constraints.")
        return

    axes_to_zero = [0, 2] if preserve_vertical else [0, 1, 2]
    axes_names = {0: 'X', 1: 'Y', 2: 'Z'}

    modified_count = 0

    for axis_idx in axes_to_zero:
        fc = next((f for f in fcurves if f.array_index == axis_idx), None)
        if not fc:
            continue

        if len(fc.keyframe_points) == 0:
            continue

        for kp in fc.keyframe_points:
            kp.co.y = 0.0
            modified_count += 1

        fc.update()

    bpy.context.scene.frame_set(int(action.frame_range[0]))

    axes_str = ', '.join([axes_names[i] for i in axes_to_zero])
    print(f"[Noah Pipeline] In-place bake complete:")
    print(f"  - Animation: {action.name}")
    print(f"  - Zeroed axes: {axes_str}")
    print(f"  - Modified keyframes: {modified_count}")
    print(f"  - Vertical (Y) preserved: {preserve_vertical}")
    print(f"\n  Next: Export via export/export_fbx.py")
    print("  Tip: Test in Three.js to confirm no drift.")


if __name__ == "__main__":
    zero_hips_translation(preserve_vertical=True)
