#!/usr/bin/env python3
"""
Noah Pipeline — Standardized FBX Export
========================================
Final step of the avatar pipeline.

Exports Noah's avatar to FBX with settings optimized for Three.js:
  - Y-up, -Z-forward (matches Three.js)
  - Meters (unit scale 1.0)
  - Animation baked (if any constraints/IK exist)
  - No leaf bones (cleaner skeleton)

Prerequisite:
    - VRM imported
    - rename_bones.py executed
    - normalize_scale.py executed

Usage:
    1. Ensure only desired objects are selected (or use default: all armature + mesh)
    2. Set OUTPUT_PATH below
    3. Run this script
    4. Check output directory for .fbx file
"""

import bpy
import os

# ── Configuration ─────────────────────────────────────────
# Change this to your desired output path
OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "assets",
    "models",
    "noah.fbx"
)

# Export settings (tuned for Three.js FBXLoader)
EXPORT_SETTINGS = {
    'filepath': OUTPUT_PATH,
    'check_existing': True,
    'filter_glob': '*.fbx',

    # Include
    'use_selection': False,
    'use_visible': False,
    'use_active_collection': False,
    'global_scale': 1.0,
    'apply_unit_scale': True,
    'apply_scale_options': 'FBX_SCALE_UNITS',

    # Geometry
    'use_mesh_modifiers': True,
    'use_mesh_edges': False,
    'use_tspace': False,
    'mesh_smooth_type': 'OFF',

    # Armature
    'use_armature_deform_only': False,
    'add_leaf_bones': False,
    'primary_bone_axis': 'Y',
    'secondary_bone_axis': 'X',
    'armature_nodetype': 'NULL',

    # Animation
    'bake_anim': True,
    'bake_anim_use_all_bones': False,
    'bake_anim_use_nla_strips': False,
    'bake_anim_use_all_actions': False,
    'bake_anim_force_startend_keying': True,
    'bake_anim_step': 1.0,
    'bake_anim_simplify_factor': 1.0,

    # Transform (CRITICAL — matches Three.js)
    'axis_forward': '-Z',
    'axis_up': 'Y',
    'bake_space_transform': True,
}


def export_noah_fbx():
    """Export Noah avatar to FBX with standardized settings."""
    output_dir = os.path.dirname(OUTPUT_PATH)
    os.makedirs(output_dir, exist_ok=True)

    bpy.ops.object.select_all(action='DESELECT')

    selected_count = 0
    for obj in bpy.context.scene.objects:
        if obj.type in {'ARMATURE', 'MESH'}:
            obj.select_set(True)
            selected_count += 1

    if selected_count == 0:
        print("[Noah Pipeline] ERROR: No armature or mesh objects found!")
        return

    print(f"[Noah Pipeline] Selected {selected_count} objects for export.")

    try:
        bpy.ops.export_scene.fbx(**EXPORT_SETTINGS)
        print(f"[Noah Pipeline] FBX export successful:")
        print(f"  - File: {OUTPUT_PATH}")
        print(f"  - Forward: -Z, Up: Y")
        print(f"  - Scale: 1.0 (meters)")
        print(f"  - Leaf bones: disabled")
        print(f"  - Animation: baked")
        print(f"\n  Next: Test-load in Three.js with FBXLoader")
    except Exception as e:
        print(f"[Noah Pipeline] ERROR during export: {e}")
        raise


if __name__ == "__main__":
    export_noah_fbx()
