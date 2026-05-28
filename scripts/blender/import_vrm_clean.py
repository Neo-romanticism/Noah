#!/usr/bin/env python3
"""
Noah Pipeline — VRM Import & Clean
====================================
1. Import VRM file
2. Remove unwanted objects (ground planes, shadow catchers, etc.)
3. Verify materials are not black
4. Export clean FBX

Usage:
    blender --background --python scripts/blender/import_vrm_clean.py

Requires: Blender 3.0+ with VRM Addon installed
"""

import bpy
import sys
import os

# ── Configuration ─────────────────────────────────────────
VRM_PATH = os.path.abspath("assets/models/Noah3.vrm")
FBX_OUTPUT = os.path.abspath("assets/models/noah.fbx")

# Objects to remove by name pattern (lowercase)
REMOVE_NAME_PATTERNS = [
    "shadow",
    "ground",
    "plane",
    "stage",
    "base",
    "platform",
    "collision",
    "collider",
]

# Objects to remove if they are large flat boxes at y≈0
REMOVE_IF_LARGE_FLAT_AT_GROUND = True
GROUND_Y_THRESHOLD = 0.05
MIN_SIZE_XZ = 0.3
MAX_SIZE_Y = 0.2


def remove_unwanted_objects():
    """Remove objects that are not part of the avatar."""
    removed = []

    objects_to_remove = set()

    for obj in list(bpy.context.scene.objects):
        name_lower = obj.name.lower()

        # Pattern-based removal
        for pattern in REMOVE_NAME_PATTERNS:
            if pattern in name_lower:
                objects_to_remove.add(obj)
                removed.append(f"{obj.name} (pattern: {pattern})")
                break

        # Size-based removal for large flat boxes at ground
        if obj not in objects_to_remove and REMOVE_IF_LARGE_FLAT_AT_GROUND and obj.type == 'MESH':
            bbox = [obj.matrix_world @ v.co for v in obj.data.vertices]
            if len(bbox) >= 2:
                xs = [v.x for v in bbox]
                ys = [v.y for v in bbox]
                zs = [v.z for v in bbox]
                size_x = max(xs) - min(xs)
                size_y = max(ys) - min(ys)
                size_z = max(zs) - min(zs)
                center_y = (max(ys) + min(ys)) / 2

                if (abs(center_y) < GROUND_Y_THRESHOLD and
                    (size_x > MIN_SIZE_XZ or size_z > MIN_SIZE_XZ) and
                    size_y < MAX_SIZE_Y):
                    objects_to_remove.add(obj)
                    removed.append(f"{obj.name} (large flat at ground: {size_x:.2f}x{size_y:.2f}x{size_z:.2f})")

    for obj in objects_to_remove:
        bpy.data.objects.remove(obj, do_unlink=True)

    print(f"[Noah Pipeline] Removed {len(removed)} unwanted objects:")
    for r in removed:
        print(f"  - {r}")


def check_materials():
    """Check for black materials and report."""
    issues = []
    for mat in bpy.data.materials:
        if mat.use_nodes:
            # Principled BSDF node
            principled = None
            for node in mat.node_tree.nodes:
                if node.type == 'BSDF_PRINCIPLED':
                    principled = node
                    break
            if principled:
                base_color = principled.inputs['Base Color'].default_value
                intensity = sum(base_color[:3]) / 3
                if intensity < 0.05:
                    issues.append(f"{mat.name}: Base Color is black ({base_color[:3]})")
        else:
            # Legacy material
            intensity = sum(mat.diffuse_color[:3]) / 3
            if intensity < 0.05:
                issues.append(f"{mat.name}: Diffuse is black ({mat.diffuse_color[:3]})")

    if issues:
        print("[Noah Pipeline] WARNING: Black materials found:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("[Noah Pipeline] All materials look OK (no black detected)")


def export_fbx():
    """Export to FBX with clean settings."""
    os.makedirs(os.path.dirname(FBX_OUTPUT), exist_ok=True)

    # Select all armature and mesh objects
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type in {'ARMATURE', 'MESH'}:
            obj.select_set(True)

    bpy.ops.export_scene.fbx(
        filepath=FBX_OUTPUT,
        check_existing=True,
        use_selection=True,
        global_scale=1.0,
        apply_unit_scale=True,
        apply_scale_options='FBX_SCALE_UNITS',
        use_mesh_modifiers=True,
        use_mesh_edges=False,
        use_tspace=False,
        mesh_smooth_type='OFF',
        use_armature_deform_only=False,
        add_leaf_bones=False,
        primary_bone_axis='Y',
        secondary_bone_axis='X',
        armature_nodetype='NULL',
        bake_anim=True,
        bake_anim_use_all_bones=False,
        bake_anim_use_nla_strips=False,
        bake_anim_use_all_actions=False,
        bake_anim_force_startend_keying=True,
        bake_anim_step=1.0,
        bake_anim_simplify_factor=1.0,
        axis_forward='-Z',
        axis_up='Y',
        bake_space_transform=True,
    )

    print(f"[Noah Pipeline] Exported: {FBX_OUTPUT}")


def main():
    print("[Noah Pipeline] Starting VRM import & clean...")
    print(f"[Noah Pipeline] VRM: {VRM_PATH}")

    # Clear default scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Import VRM (requires VRM Addon)
    # Note: The exact operator depends on the VRM addon version
    # Common operators: 'import_scene.vrm' or 'import_scene.vrm_addon_for_blender'
    try:
        bpy.ops.import_scene.vrm(filepath=VRM_PATH)
        print("[Noah Pipeline] VRM imported successfully")
    except AttributeError:
        try:
            bpy.ops.import_scene.vrm_addon_for_blender(filepath=VRM_PATH)
            print("[Noah Pipeline] VRM imported (alternative operator)")
        except AttributeError:
            print("[Noah Pipeline] ERROR: VRM Addon not installed or operator not found")
            print("  Please install VRM Addon for Blender:")
            print("  https://github.com/saturday06/VRM_Addon_for_Blender")
            sys.exit(1)

    # Clean up
    remove_unwanted_objects()

    # Check materials
    check_materials()

    # Export
    export_fbx()

    print("[Noah Pipeline] Done!")


if __name__ == "__main__":
    main()
