# Stage 4a: Room — Floor + Walls

> **Scope**: Minimal 3D room. No furniture, no avatar, no window yet.
> **Rule**: One slice at a time. Build only what is needed now.

---

## Goal

Replace the flat weather background plane with a minimal 3D room:
floor + 3 walls (back, left, right). Front is open for camera view.

---

## Acceptance Criteria

- [x] Floor rendered (plane, colored, receives shadows)
- [x] 3 walls rendered (back, left, right)
- [x] Camera positioned to see room interior
- [x] Resize handling works
- [x] Stage 3 metrics (CPU/RAM/Temp bars + weather background) still visible
- [x] `npm test` ≥ 236 passed
- [x] `npm run build` clean

---

## Files

### Create

| File | Purpose |
|------|---------|
| `src/renderer/scene.ts` | Scene, camera, renderer, resize handler |
| `src/renderer/room.ts` | Floor + walls geometry |
| `src/renderer/metrics.ts` | CPU/RAM/Temp/Weather visualization (extracted from index.ts) |
| `tests/setup/gl-mock.ts` | WebGL mock for Three.js in jsdom test environment |
| `jest.config.js` | Jest configuration with setupFiles entry |

### Modify

| File | Change |
|------|--------|
| `src/renderer/index.ts` | Integrate scene + room, use metrics module |
| `tests/renderer/scene.test.ts` | Use jest.mock to avoid WebGL context requirement |

---

## Implementation Notes

### Room Dimensions

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

### Camera

- Position: (0, 2, 6) — slightly elevated, looking in
- LookAt: (0, 1, 0)
- FOV: 50

### Colors

| Element | Color | Hex |
|---------|-------|-----|
| Floor | warm gray | `#8B7D6B` |
| Walls | light gray | `#C0C0C0` |

---

## Test Plan

- `tests/renderer/room.test.ts` — floor and walls exist in scene
- `tests/renderer/scene.test.ts` — camera, renderer, resize

---

## Next Slice

Stage 4b: Window + Lighting (after 4a is merged)
