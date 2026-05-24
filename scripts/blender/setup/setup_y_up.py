#!/usr/bin/env python3
"""
Noah Pipeline — Blender Y-up Workspace Setup
=============================================
Run once per Blender session before working on Noah assets.

This script configures Blender for Y-up, -Z-forward game-engine workflow
that matches Three.js coordinate system.

Usage:
    1. Open Blender
    2. Switch to Scripting workspace
    3. Open this file
    4. Run Script (Alt+P)

Or run from terminal:
    blender --python setup_y_up.py
"""

import bpy


def ensure_y_up_workspace():
    """
    Configure Blender for Y-up game-engine workflow.
    All settings are idempotent — safe to run multiple times.
    """
    # ── 1. Unit Settings ──────────────────────────────────────
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = 'METERS'

    # ── 2. Frame Rate ─────────────────────────────────────────
    # Three.js default + Mixamo standard = 30fps
    scene.render.fps = 30
    scene.render.fps_base = 1.0

    # ── 3. Viewport Orientation Hint ──────────────────────────
    # Blender 4.x+ supports viewport orientation via UI,
    # but the API is limited. We reset object rotations to identity
    # to ensure no Z-up compensation rotations exist.
    for obj in scene.objects:
        if obj.type in {'MESH', 'ARMATURE', 'EMPTY'}:
            # Only reset rotation, not location (objects may be positioned)
            # This catches accidental +90° X rotations from Z-up viewport habits
            if abs(obj.rotation_euler.x - 1.5708) < 0.01:
                print(f"[Noah Pipeline] WARNING: {obj.name} has +90° X rotation. Clearing.")
                obj.rotation_euler = (0, 0, 0)

    # ── 4. Grid Scale ─────────────────────────────────────────
    # Set grid to 1m increments for intuitive sizing
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    space.overlay.grid_scale = 1.0
                    space.overlay.grid_subdivisions = 10

    print("[Noah Pipeline] Blender configured for Y-up workflow:")
    print("  - Units: Metric (meters)")
    print("  - FPS: 30")
    print("  - Export preset: Y-up, -Z-forward (manual check required)")
    print("  - Cleared suspicious +90° X rotations")
    print("  - Ready for Noah asset production.")


if __name__ == "__main__":
    ensure_y_up_workspace()
