# Stage 4b: Window + Lighting

> **Scope**: Implement window element and lighting system with weather integration. Build only what's needed for current slice.
> **Rule**: Maintain Stage 3 metrics visibility throughout implementation

## Goal
Implement window geometry and dynamic lighting system with weather integration to enable:
1. Realistic shadow casting from window
2. Weather-dependent lighting effects (rain/sun)
3. Seamless integration with existing room structure

## Acceptance Criteria

- [x] Window mesh added to back wall
- [x] Shadow-casting lights configured (directional + ambient)
- [x] Weather particle system visible (rain/sun)
- [x] Stage 3 metrics (CPU/RAM/Temp) remain visible
- [x] `npm test` ≥ 236 passed
- [x] `npm run build` clean

## Detailed Steps

1. **Add window mesh**
   - Create rectangular window geometry on back wall (z = -5, y = 1-3)
   - Apply window texture with transparency
   - Configure shadow casting properties

2. **Configure lighting system**
   - Add directional light simulating sunlight through window
   - Add ambient light for base illumination
   - Enable shadow maps in renderer

3. **Implement weather system**
   - Integrate particle system for rain
   - Add sun beam effect for clear weather
   - Connect weather system to lighting parameters

4. **Integrate with scene**
   - Update scene graph to include window and lights
   - Ensure metric displays remain visible
   - Test resize handling with new elements

## Assets Needed

| Asset Type        | Description                |
|-------------------|----------------------------|
| Window Texture   | Transparent glass texture   |
| Weather Shader   | Particle system for rain   |
| Sun Beam Texture  | Volumetric light texture    |
| Shadow Map FBO   | Framebuffer for shadows    |
