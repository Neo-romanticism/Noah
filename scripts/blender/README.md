# Noah Blender Pipeline Scripts

> Blender Python scripts for the Noah Desktop Companion asset pipeline.

## Directory Structure

```
scripts/blender/
├── setup/
│   └── setup_y_up.py              # Configure Blender for Y-up workflow (run once)
├── avatar/
│   ├── rename_bones.py            # Rename VRM bones to Mixamo standard
│   └── normalize_scale.py         # Normalize avatar height to ~1.5m
├── export/
│   └── export_fbx.py              # Export standardized FBX for Three.js
├── animation/
│   ├── fix_loop.py                # Fix non-looping animation boundaries
│   └── zero_hips_translation.py   # Convert root motion to in-place
└── README.md                      # This file
```

## Execution Order

### Avatar Pipeline (VRM → FBX)

Run these in sequence after importing a VRM file:

```bash
1. setup/setup_y_up.py              # One-time per Blender session
2. avatar/rename_bones.py           # After VRM import
3. avatar/normalize_scale.py        # After bone rename
4. export/export_fbx.py             # Final export
```

### Animation Pipeline (Mixamo → FBX)

Run these for each Mixamo animation clip:

```bash
1. setup/setup_y_up.py              # One-time per Blender session
2. Import Mixamo FBX (Without Skin) # Manual step via File → Import
3. animation/zero_hips_translation.py   # Optional: if in-place needed
4. animation/fix_loop.py            # Optional: if loop stuttering
5. export/export_fbx.py             # Export animation-only FBX
```

## Quick Reference

| Script | When | Input | Output |
|--------|------|-------|--------|
| `setup_y_up.py` | Start of session | — | Y-up workspace config |
| `rename_bones.py` | After VRM import | VRM armature | Renamed bones (Mixamo names) |
| `normalize_scale.py` | After rename | Armature | ~1.5m tall avatar |
| `export_fbx.py` | Final step | Armature + meshes | `assets/models/noah.fbx` |
| `fix_loop.py` | Per animation | Mixamo action | Seamless loop |
| `zero_hips_translation.py` | Per animation | Mixamo action | In-place animation |

## Important Settings

### FBX Export (handled by export_fbx.py)

| Setting | Value | Why |
|---------|-------|-----|
| Forward | `-Z` | Matches Three.js |
| Up | `Y` | **CRITICAL** — must match Three.js Y-up |
| Scale | `1.0` | Meters |
| Leaf Bones | `Disabled` | Cleaner skeleton |
| Bake Animation | `Enabled` | Constraints/IK baked to keyframes |

### Mixamo Download Settings

- **Format**: FBX
- **Frames per Second**: 30
- **With Skin**: ☐ **NO** (always "Without Skin")
- **In Place**: ✅ YES (when available)

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Model lies on side in Blender | Z-up viewport habit | Run `setup_y_up.py`, do NOT rotate manually |
| Animations don't play in Three.js | Bone name mismatch | Run `rename_bones.py` with `use_mixamo_spine=True` |
| Avatar is tiny/huge | Scale not normalized | Run `normalize_scale.py` |
| Drift during animation | Root motion present | Run `zero_hips_translation.py` |
| Loop hiccup | Start/end mismatch | Run `fix_loop.py` or manually edit in Graph Editor |
| Pink textures | Missing image links | Re-import VRM with "Extract images" enabled |

## Coordinate System Reference

| System | Up | Forward | Unit |
|--------|-----|---------|------|
| Three.js | +Y | -Z | meter |
| Blender (this pipeline) | +Y | -Z | meter |
| Mixamo | +Y | -Z | centimeter → normalized to meter |

---

*Part of the Noah Desktop Companion project.*
*See `docs/technical/Asset_Pipeline_Index.md` for full pipeline documentation.*
