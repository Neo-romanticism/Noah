# Stage 04a: Room Floor Walls - Technical Specification

## Overview
Replace the flat weather background plane with a minimal 3D room consisting of a floor and three walls (back, left, right). The front will remain open for camera view.

## Requirements
- Floor rendered (plane, colored, receives shadows)
- 3 walls rendered (back, left, right)
- Camera positioned to see room interior
- Resize handling works
- Stage 3 metrics (CPU/RAM/Temp bars + weather background) still visible
- `npm test` ≥ 236 passed
- `npm run build` clean

## Implementation Plan

### 1. Create src/renderer/scene.ts
This file will contain:
- Scene setup with THREE.js
- Camera positioning (0, 2, 6) looking at (0, 1, 0)
- Renderer with alpha and antialias
- Resize handler for window resizing

### 2. Create src/renderer/room.ts
This file will contain:
- Floor geometry (10x10 plane at y=0 with warm gray color #8B7D6B)
- Back wall geometry (10x4 plane at z=-5)
- Left wall geometry (10x4 plane at x=-5, rotated Y +90°)
- Right wall geometry (10x4 plane at x=+5, rotated Y -90°)
- All walls will use light gray color (#C0C0C0)

### 3. Modify src/renderer/index.ts
Changes needed:
- Remove the current background plane
- Import and initialize the new scene and room components
- Keep all system metrics visualization (CPU/RAM/Temp bars)
- Ensure lighting works properly with the new 3D environment

### 4. Create Test Files
- tests/renderer/room.test.ts - Test that floor and walls exist in scene
- tests/renderer/scene.test.ts - Test camera, renderer, and resize functionality

## Room Dimensions
```
        back wall
    ┌─────────────────┐
    │                 │
    │    floor        │
    │                 │
    └─────────────────┘
   left              right
   (no front wall — camera looks in)
```

- Floor: 10 × 10 plane, y = 0
- Back wall: 10 × 4 plane, z = -5
- Left wall: 10 × 4 plane, x = -5, rotated Y +90°
- Right wall: 10 × 4 plane, x = +5, rotated Y -90°

## Camera Configuration
- Position: (0, 2, 6) — slightly elevated, looking in
- LookAt: (0, 1, 0)
- FOV: 50

## Colors
| Element | Color | Hex |
|---------|-------|-----|
| Floor | warm gray | `#8B7D6B` |
| Walls | light gray | `#C0C0C0` |

## Next Steps
After implementation, Stage 4b will focus on Window + Lighting.