# Stage 4c: Matrix UI Rearrangement

> **Scope**: Reposition Stage 3 metrics (CPU/RAM/Temp bars + weather) into 3D space while maintaining interactivity and visual clarity.
> **Rule**: Implement metric UI elements one at a time, ensuring each is fully integrated and tested before proceeding.

---

## Goal

Reposition Stage 3 metrics (CPU/RAM/Temp bars + weather) into 3D space for an immersive user experience while maintaining accessibility and interactive capabilities.

---

## Acceptance Criteria

- [ ] Metrics visible in 3D scene
- [ ] Positioned appropriately relative to room
- [ ] Interactive (hover/resize)
- [ ] `npm test` ≥ 236 passed
- [ ] `npm run build` clean

---

## Detailed Steps

1. **Modify metrics UI rendering**
   - Convert 2D metric bars to 3D text/models
   - Implement depth-aware rendering

2. **Integrate with 3D scene coordinates**
   - Map metric positions to room coordinates
   - Ensure proper scaling and perspective

3. **Implement interaction handlers**
   - Add hover effects with cursor feedback
   - Enable resize functionality with smooth animations

4. **Test visibility and positioning**
   - Verify metrics appear correctly in all major browsers
   - Test responsiveness across screen sizes

---

## Assets Needed

| Asset Type          | Description                          |
|---------------------|--------------------------------------|
| 3D text/models      | CPU, RAM, Temp bars, weather icons  |
| Interaction effects  | Hover glow, resize handles, cursors  |

---

## Next Slice

Stage 4d: Atmosphere Effects (after 4c is merged)
