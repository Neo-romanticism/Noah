# Stage 5a: FBX Loading System (DEPRECATED — Migrated to Stage 5b)

> **⚠️ DEPRECATED**: This document describes the original FBX-based avatar loading system.
> FBX → GLB/VRM migration was completed in **Stage 5b** (commit `cc2e1a7`).
> Current avatar uses `GLTFLoader` + `@pixiv/three-vrm` with `noah.glb`.
> This document is preserved for historical reference only.

---

> **Original Scope**: Implement FBX avatar loading with success/failure handling
> **Rule**: Complete all acceptance criteria before proceeding

## Goal (Original)
Load FBX avatar model with proper success/failure handling, ensuring:
- Avatar is displayed correctly when loading succeeds
- **Placeholder (임시 메쉬)** is maintained with error visualization when loading fails
- Comprehensive error logging for debugging
- Material enhancement for realistic rendering

## Acceptance Criteria

- [x] ~~FBX loader implemented with dynamic loading~~ → Replaced by GLTFLoader + VRMLoaderPlugin
- [x] ~~Success: Avatar displayed with enhanced materials~~ → Preserved in GLB pipeline
- [x] ~~Failure: Placeholder maintained with visual feedback~~ → Preserved in GLB pipeline
- [x] ~~Error logging with detailed diagnostics~~ → Preserved
- [x] ~~Material enhancement system working~~ → Preserved (classifyMaterial + enhanceMaterial)
- [x] ~~`npm test` ≥ 236 passed~~ → 363 passed (Stage 5b complete)
- [x] ~~`npm run build` clean~~ → Preserved
- [x] ~~Avatar scaling properly configured~~ → Preserved
- [x] ~~Shadow casting enabled~~ → Preserved
- [x] ~~Embedded lights removed from model~~ → Preserved

## Current Implementation Status ✅

### Working Features (Migrated to GLB/VRM):
- **~~Dynamic FBX Loader~~** → `GLTFLoader` + `VRMLoaderPlugin` for VRM/GLB
- **Material Enhancement**: Converts materials to MeshPhysicalMaterial with part-specific presets (preserved)
- **Shadow Support**: All meshes cast and receive shadows (preserved)
- **Error Handling**: Graceful fallback to placeholder avatar (preserved)
- **Scene Cleanup**: Removes embedded lights and unwanted geometry (preserved)
- **Animation Support**: Handles GLB animations with `AnimationMixer` (VRM-compatible)

### Material Enhancement Categories:
- **Skin**: Transmission + thickness for subsurface scattering
- **Hair**: Sheen + clearcoat for silky highlights
- **Eyes**: Clearcoat for wet look
- **Mouth**: Soft sheen for natural appearance
- **Clothing**: Higher roughness for fabric feel

## Detailed Steps

### 1. **FBX Loader Integration** ✅
- [x] Install Three.js FBXLoader dependency
- [x] Implement dynamic loading via `getFBXLoader()`
- [x] Handle import errors gracefully

### 2. **Avatar Loading Logic** ✅
- [x] Create `loadAvatar()` function with async/await
- [x] Apply proper scaling (current: 0.3 for cm→m conversion)
- [x] Position avatar in scene
- [x] Set up animation mixer for animations

### 3. **Material Enhancement System** ✅
- [x] Implement `fixMaterial()` function
- [x] Create `classifyMaterial()` for body part categorization
- [x] Apply `enhanceMaterial()` for part-specific rendering
- [x] Handle color space correction for all texture maps

### 4. **Error Handling & Fallback** ✅
- [x] Try/catch blocks around loading
- [x] `createPlaceholderAvatar()` as fallback — **캡슐 지오메트리 임시 메쉬**
- [x] Comprehensive error logging
- [x] Debug scene graph analysis

### 5. **Scene Cleanup** ✅
- [x] Remove embedded lights from model
- [x] Filter out unwanted ground/shadow planes
- [x] Handle bright box geometry removal
- [x] Enable shadow casting on all meshes

## Advanced Features

### Debugging Tools:
- **Scene Graph Debug**: Traverse and log all objects
- **White Box Detection**: Find bright geometry candidates
- **Material Analysis**: Log material properties for each mesh
- **Bounding Box Visualization**: Show avatar dimensions

### Material Classification:
```typescript
function classifyMaterial(name: string, matName: string, hasTexture: boolean): 
  'skin' | 'hair' | 'eye' | 'mouth' | 'clothing' | 'default'
```

### Error Scenarios Handled:
- Missing or corrupt FBX files
- Invalid material properties
- Missing textures
- Incorrect scaling
- Embedded problematic geometry

## Testing Requirements

### Current Test Status:
- ✅ 252 passed tests
- ❌ 5 failed tests (material color tests need adjustment)
- ✅ FBX pipeline test loads successfully
- ✅ Avatar placeholder creation works

### Test Coverage Needed:
- [ ] FBX loading with valid model
- [ ] FBX loading failure scenarios
- [ ] Material enhancement verification
- [ ] Shadow casting tests
- [ ] Animation mixer functionality
- [ ] Error fallback behavior

## Assets Needed

| Type | Description | Status |
|------|-------------|---------|
| Sample FBX models | Various avatar models (static and animated) | ✅ noah.fbx available |
| Error state textures | Placeholder textures for failed loading | ✅ Built-in **임시** capsule geometry |
| Loading indicators | Visual feedback elements | ❌ Not implemented |
| Test scenes | Pre-configured test environments | ❌ Not implemented |

## Configuration

### Avatar Settings:
- **Model Path**: `./models/noah.glb` (GLB/VRM format, textures embedded)
- **Scale**: 0.3 (empirical value for proper sizing)
- **Position**: `(0, 0, 0.5)` (slightly forward in room)
- **Shadow**: Enabled on all meshes
- **Materials**: Enhanced with physical rendering

### Scaling Notes:
The GLB model uses meter units. Scale is applied via `config.scale` in `loadAvatar()`.
- Previous FBX empirical scale: 0.3 (cm→m conversion + model scaling)
- GLB scale: determined per-model via Blender export settings

## Implementation Details

### Key Functions:
- `loadAvatar()`: Main loading function with error handling
- `createPlaceholderAvatar()`: Fallback avatar using **임시** capsule geometry
- `fixMaterial()`: Material property correction and enhancement
- `updateAvatar()`: Animation update loop

### Debug Logging:
- Avatar loading progress
- Material enhancement details
- Scene cleanup operations
- Error diagnostics with stack traces

### Performance Considerations:
- Dynamic FBXLoader import reduces bundle size
- Material enhancement runs once during loading
- Shadow casting enabled only on visible meshes
- Embedded lights removed to prevent overexposure
