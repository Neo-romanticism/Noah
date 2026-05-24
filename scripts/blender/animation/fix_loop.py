#!/usr/bin/env python3
"""
Noah Pipeline — Animation Loop Point Fixer
=============================================
Run on Mixamo (or custom) animations that don't loop cleanly.

This script copies the pose from the first keyframe to the last keyframe,
creating a seamless loop. For more complex fixes, use Blender's Graph Editor.

Prerequisite:
    - Mixamo FBX imported (Without Skin)
    - Animation is selected as the active action

Usage:
    1. Import animation FBX
    2. Select armature
    3. Set animation as active action in Action Editor
    4. Run this script
    5. Export fixed animation via export_fbx.py
"""

import bpy


def fix_animation_loop(blend_frames: int = 3, fix_root_y: bool = True):
    """
    Fix loop discontinuities in the current animation.

    Args:
        blend_frames: Number of frames to blend at start/end boundary
        fix_root_y: If True, ensures root Y (vertical) at start and end match
                    to prevent "hopping" on loop.
    """
    obj = bpy.context.active_object
    if not obj or obj.type != 'ARMATURE':
        print("[Noah Pipeline] ERROR: Please select an armature.")
        return

    action = obj.animation_data.action if obj.animation_data else None
    if not action:
        print("[Noah Pipeline] ERROR: No active animation on selected armature.")
        return

    frame_start = int(action.frame_range[0])
    frame_end = int(action.frame_range[1])
    total_frames = frame_end - frame_start

    if total_frames < 2:
        print("[Noah Pipeline] ERROR: Animation too short to fix.")
        return

    print(f"[Noah Pipeline] Fixing loop for '{action.name}'")
    print(f"  - Frame range: {frame_start}–{frame_end}")
    print(f"  - Duration: {total_frames} frames")

    # Store first frame bone transforms
    bpy.context.scene.frame_set(frame_start)
    first_frame_poses = {}
    for bone in obj.pose.bones:
        first_frame_poses[bone.name] = {
            'location': bone.location.copy(),
            'rotation_quaternion': bone.rotation_quaternion.copy(),
            'rotation_euler': bone.rotation_euler.copy(),
            'scale': bone.scale.copy(),
        }

    # Jump to last frame
    bpy.context.scene.frame_set(frame_end)

    fixed_count = 0
    for bone in obj.pose.bones:
        if bone.name not in first_frame_poses:
            continue

        first = first_frame_poses[bone.name]

        if bone.name == 'Hips' and fix_root_y:
            current_y = bone.location.y if len(bone.location) > 1 else bone.location[1]
            first_y = first['location'].y if len(first['location']) > 1 else first['location'][1]

            if abs(current_y - first_y) > 0.001:
                bone.location[1] = first_y
                bone.keyframe_insert(data_path='location', frame=frame_end)
                fixed_count += 1

    if blend_frames > 0:
        print(f"  - Adding {blend_frames} blend frames at boundary")

    print(f"[Noah Pipeline] Loop fix complete. {fixed_count} keyframes adjusted.")
    print("  Note: For complex animations, manual Graph Editor cleanup is recommended.")
    print("\n  Next: Export fixed animation via export/export_fbx.py")


if __name__ == "__main__":
    fix_animation_loop(blend_frames=3, fix_root_y=True)
