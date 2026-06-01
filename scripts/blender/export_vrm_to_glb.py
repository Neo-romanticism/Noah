#!/usr/bin/env python3
"""
Noah Pipeline — VRM Import & GLB Export
========================================
1. Import VRM file
2. Remove unwanted objects (ground planes, shadow catchers, etc.)
3. Export clean GLB (textures embedded)

Usage:
    blender --background --python scripts/blender/export_vrm_to_glb.py

Requires: Blender 3.0+ with VRM Addon installed

Replaces: scripts/blender/import_vrm_clean.py (deprecated)
"""

import bpy
import sys
import os

# ── Configuration ─────────────────────────
VRM_PATH = os.path.abspath("assets/models/Noah3.vrm")
GLB_OUTPUT = os.path.abspath("assets/models/noah.glb")

# Objects to remove by name pattern (lowercase)
REMOVE_NAME_PATTERNS = [
    "shadow", "ground", "plane", "stage", "base",
    "platform", "collision", "collider",
]

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
        for pattern in REMOVE_NAME_PATTERNS:
            if pattern in name_lower:
                objects_to_remove.add(obj)
                removed.append(f"{obj.name} (pattern: {pattern})")
                break

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
                    removed.append(f"{obj.name} (large flat at ground)")

    for obj in objects_to_remove:
        bpy.data.objects.remove(obj, do_unlink=True)

    print(f"[Noah Pipeline] Removed {len(removed)} unwanted objects")


def export_glb():
    """Export to GLB with textures embedded."""
    os.makedirs(os.path.dirname(GLB_OUTPUT), exist_ok=True)

    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type in {'ARMATURE', 'MESH'}:
            obj.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=GLB_OUTPUT,
        export_format='GLB',
        use_selection=True,
        export_image_format='PNG',
        export_texture_dir='',
        export_apply=True,
        export_animations=True,
        export_skins=True,
        export_materials=True,
        export_yup=True,
    )

    print(f"[Noah Pipeline] Exported: {GLB_OUTPUT}")


def export_glb_vrm_addon():
    """Alternative: Use VRM Addon's native GLB export if available.
    Preserves BlendShape better than standard glTF export."""
    os.makedirs(os.path.dirname(GLB_OUTPUT), exist_ok=True)
    try:
        # VRM Addon 2.x+ provides direct GLB export
        bpy.ops.export_scene.vrm(filepath=GLB_OUTPUT)
        print(f"[Noah Pipeline] Exported via VRM Addon: {GLB_OUTPUT}")
        return True
    except AttributeError:
        print("[Noah Pipeline] VRM Addon GLB export not available, falling back to standard glTF")
        return False


def main():
    print("[Noah Pipeline] Starting VRM import & GLB export...")
    print(f"[Noah Pipeline] VRM: {VRM_PATH}")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    try:
        bpy.ops.import_scene.vrm(filepath=VRM_PATH)
        print("[Noah Pipeline] VRM imported successfully")
    except AttributeError:
        try:
            bpy.ops.import_scene.vrm_addon_for_blender(filepath=VRM_PATH)
            print("[Noah Pipeline] VRM imported (alternative operator)")
        except AttributeError:
            print("[Noah Pipeline] ERROR: VRM Addon not installed")
            sys.exit(1)

    remove_unwanted_objects()

    # VRM Addon native export 우선 시도 (BlendShape 보존에 유리)
    if not export_glb_vrm_addon():
        export_glb()  # fallback to standard glTF

    print("[Noah Pipeline] Done!")


if __name__ == "__main__":
    main()