#!/usr/bin/env python3
"""
Batch FBX to GLB Animation Converter

Converts Mixamo FBX animations to GLB format with animation-only output
(no mesh). Requires Blender 3.6+ with FBX and GLTF export addons enabled.

Usage:
    blender --background --python convert_animations.py -- \\
        --input-dir ./fbx_animations \\
        --output-dir ../../assets/animations \\
        --armature "Armature"

Options:
    --input-dir     Directory containing FBX animation files
    --output-dir    Target directory for GLB animation files
    --armature      Name of the armature to retarget animations to

The script:
    1. Imports each FBX file
    2. Extracts animation data
    3. Retargets to the specified armature
    4. Exports as GLB with animation only (no mesh)

Requires Blender with:
    - io_scene_fbx addon (built-in)
    - io_scene_gltf2 addon (built-in since Blender 3.0)
"""

import argparse
import json
import os
import sys

import bpy


def ensure_addons():
    """Enable required Blender addons."""
    for addon in ("io_scene_fbx", "io_scene_gltf2"):
        if addon not in bpy.context.preferences.addons:
            bpy.ops.preferences.addon_enable(module=addon)


def clear_scene():
    """Remove all objects from the current scene."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def import_fbx(filepath):
    """Import an FBX file and return the imported armature object."""
    bpy.ops.import_scene.fbx(filepath=filepath)
    armature = None
    for obj in bpy.data.objects:
        if obj.type == "ARMATURE":
            armature = obj
            break
    return armature


def retarget_animation(source_armature, target_armature_name):
    """
    Retarget animation from source armature to target armature.

    This is a simplified retargeting that copies action data.
    For production use, consider using Blender's NLA editor or
    a dedicated retargeting addon.
    """
    target_armature = bpy.data.objects.get(target_armature_name)
    if not target_armature:
        print(f"  Warning: Target armature '{target_armature_name}' not found, skipping retarget")
        return None

    if not source_armature.animation_data or not source_armature.animation_data.action:
        print("  Warning: Source armature has no animation data")
        return None

    src_action = source_armature.animation_data.action

    if not target_armature.animation_data:
        target_armature.animation_data_create()

    new_action = src_action.copy()
    new_action.name = f"{src_action.name}_retargeted"
    target_armature.animation_data.action = new_action

    return new_action


def export_glb_animation(output_path):
    """Export current scene as GLB with animation only."""
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        export_animations=True,
        export_skins=True,
        export_morph=False,
        export_materials="NONE",
        export_texture_dir="",
        export_texcoords=False,
        export_normals=False,
        export_tangents=False,
        export_materials_export_type="PLACEHOLDER",
        use_visible=False,
        use_renderable=False,
        use_active_collection=False,
        export_extras=False,
        export_cameras=False,
        export_lights=False,
    )


def generate_manifest(output_dir, animation_files):
    """Generate a manifest.json for the output directory."""
    manifest = {}
    trigger_map = {
        "idle": {"loop": True, "priority": 0, "blendIn": 0.3},
        "drag": {"loop": True, "priority": 2, "blendIn": 0.15},
        "throw": {"loop": False, "priority": 3, "blendIn": 0.1},
        "land": {"loop": False, "priority": 2, "blendIn": 0.1},
        "dizzy": {"loop": True, "priority": 1, "blendIn": 0.2},
        "eat": {"loop": True, "priority": 1, "blendIn": 0.2},
        "sleep": {"loop": True, "priority": 1, "blendIn": 0.5},
        "happy": {"loop": True, "priority": 1, "blendIn": 0.2},
        "sad": {"loop": True, "priority": 1, "blendIn": 0.3},
        "angry": {"loop": True, "priority": 2, "blendIn": 0.15},
    }

    for fbx_file in animation_files:
        basename = os.path.splitext(fbx_file)[0].lower()
        for trigger, settings in trigger_map.items():
            if trigger in basename:
                manifest[trigger] = {
                    "file": f"{trigger}.glb",
                    **settings,
                    "blendOut": settings["blendIn"],
                }
                break
        else:
            manifest[basename] = {
                "file": f"{basename}.glb",
                "loop": True,
                "priority": 1,
                "blendIn": 0.2,
                "blendOut": 0.2,
            }

    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Generated manifest: {manifest_path}")


def main():
    parser = argparse.ArgumentParser(description="Convert FBX animations to GLB")
    parser.add_argument("--input-dir", required=True, help="Directory containing FBX files")
    parser.add_argument("--output-dir", required=True, help="Output directory for GLB files")
    parser.add_argument("--armature", default="Armature", help="Target armature name")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])

    input_dir = args.input_dir
    output_dir = args.output_dir
    target_armature_name = args.armature

    os.makedirs(output_dir, exist_ok=True)

    ensure_addons()

    fbx_files = sorted([f for f in os.listdir(input_dir) if f.lower().endswith(".fbx")])
    if not fbx_files:
        print(f"No FBX files found in {input_dir}")
        # Generate manifest even with no files (for procedural fallback)
        generate_manifest(output_dir, [])
        return

    converted_files = []

    for fbx_file in fbx_files:
        input_path = os.path.join(input_dir, fbx_file)
        base_name = os.path.splitext(fbx_file)[0]
        output_path = os.path.join(output_dir, f"{base_name}.glb")

        print(f"Processing: {fbx_file}")

        clear_scene()

        armature = import_fbx(input_path)
        if not armature:
            print(f"  Warning: No armature found in {fbx_file}, skipping")
            continue

        retarget_animation(armature, target_armature_name)

        export_glb_animation(output_path)
        print(f"  Exported: {output_path}")

        converted_files.append(fbx_file)

    generate_manifest(output_dir, fbx_files)
    print(f"Conversion complete. Processed {len(converted_files)}/{len(fbx_files)} files.")


if __name__ == "__main__":
    main()
