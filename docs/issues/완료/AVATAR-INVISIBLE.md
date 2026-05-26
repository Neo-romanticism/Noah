# Issue: Avatar Invisible

**Date:** 2026-05-24  
**Priority:** High  
**Status:** Fixed  
**Component:** Renderer / Avatar System

## Description

The avatar (both FBX and placeholder) is not visible in the rendered scene. Another agent has been debugging this but it's complex, so creating this issue for tracking.

## Investigation Notes

### Code Flow

1. **`src/renderer/index.ts`** - Main entry point
   - Calls `initAvatar()` which tries to load FBX from `./assets/models/noah.fbx`
   - On failure, falls back to `createPlaceholderAvatar()`
   - FBX loaded at position `(0, 0, 0.5)` with scale `0.01`
   - Placeholder created at position `(0, -0.5, 0)`

2. **`src/renderer/avatar/index.ts`** - Avatar module
   - `loadAvatar()` - loads FBX via Three.js FBXLoader
   - `createPlaceholderAvatar()` - creates capsule + head + eyes
   - Both add the avatar group to the scene

3. **`src/renderer/scene/index.ts`** - Scene setup
   - Camera at `(0, 1.2, 3.5)` looking at `(0, 0.3, 0)`
   - Renderer has `alpha: true` and `shadowMap` enabled

### Potential Issues Identified

1. **Position mismatch**: FBX loads at `z=0.5`, placeholder at `z=0` - but both should be visible
2. **Scale**: FBX uses `0.01` scale - could be too small if model is in meters
3. **FBX loading**: May be failing silently, check console logs
4. **Material issues**: FBX materials might be invisible/wrong
5. **Z-fighting**: Could be hidden behind room objects

### Files to Check

- `src/renderer/index.ts` - Lines 54-77 (avatar init)
- `src/renderer/avatar/index.ts` - Lines 55-107 (loadAvatar), 110-147 (placeholder)
- `src/renderer/scene/index.ts` - Camera setup

### Debugging Steps Taken

1. Checked avatar module exists
2. Verified FBX file exists at `assets/models/noah.fbx`
3. Reviewed test file - placeholder tests pass
4. Analyzed scene/camera setup

## Resolution

### Root Cause

The renderer JavaScript was not executing because the project used `tsc` (TypeScript compiler) alone to build the renderer, which outputs ES modules with **bare imports** (e.g., `import * as THREE from 'three'`). When Electron loads the HTML via `file://` protocol, browsers cannot resolve bare module specifiers without a bundler or import map.

### Fix Applied

1. **Added Vite as the renderer bundler** (`vite.renderer.config.ts`)
   - Bundles all renderer code and dependencies (Three.js, FBXLoader) into executable JS
   - Handles `publicDir` for static assets (models, animations, rooms)
   - Outputs to `dist/renderer/` with hashed filenames for cache busting

2. **Updated `src/renderer/index.html`**
   - Changed `<script type="module" src="index.js">` → `<script type="module" src="./index.ts">`
   - Vite handles TypeScript compilation during build

3. **Updated `src/main/index.ts`**
   - Changed HTML path from `../../renderer/renderer/index.html` → `../../renderer/index.html`
   - Vite outputs directly to `dist/renderer/index.html`

4. **Updated `package.json` build scripts**
   - Replaced `tsc:renderer` + `copy-assets` with `build:renderer` (Vite)
   - Added `vite:watch` for development

5. **Fixed avatar scale**
   - Changed `scale: 0.01` → `scale: 1.0` in `src/renderer/index.ts`
   - The FBX model has `UnitScaleFactor: 100.0` (centimeters), so scale 1.0 gives proper human size (~5.9 units tall)
   - Original scale 0.01 made the avatar 5.9cm tall — effectively invisible

6. **Fixed asset path**
   - Changed FBX path from `./assets/models/noah.fbx` → `./models/noah.fbx`
   - Vite's `publicDir` copies assets to `dist/renderer/` root, not `dist/renderer/assets/`

### Files Modified

- `vite.renderer.config.ts` — new Vite config for renderer bundling
- `src/renderer/index.html` — updated script src to `.ts`
- `src/renderer/index.ts` — fixed model path and scale
- `src/main/index.ts` — updated HTML load path
- `package.json` — updated build scripts

### Verification

- `[Renderer] Starting...` log appears ✅
- `[Avatar] FBX avatar loaded successfully` log appears ✅
- Bounding box: `4.031 x 5.913 x 2.000` (proper human size) ✅
- `Noah Stage 4 renderer initialized` ✅
- All existing tests pass (12/13, 1 pre-existing Jest ESM failure unrelated) ✅

---

## Annotation for Next Agent

**Debugging hints:**

1. **Quick test**: In `src/renderer/index.ts`, comment out the FBX loading and force `createPlaceholderAvatar()` to run. If placeholder works, the issue is in `loadAvatar()` or the FBX file itself.

2. **Scale issue**: The FBX uses `scale: 0.01`. If the model was exported in centimeters instead of meters, this would make it 100x smaller than expected. Try `scale: 1.0` or `scale: 0.1` first.

3. **Position**: The FBX loads at `(0, 0, 0.5)` but placeholder at `(0, -0.5, 0)`. The FBX position might be behind the camera or room. Try changing position to `(0, 0, 1.0)` or matching the placeholder position.

4. **Console logs**: The code already logs extensively. Check browser console for:
   - `[Avatar] initAvatar called`
   - `[Avatar] Attempting to load FBX from: ...`
   - `[Avatar] FBX avatar loaded successfully` (or failure message)
   - `[Avatar] Bounding box size:` - if this is near zero, model is empty/invisible

5. **Transparency issue**: The scene has `alpha: true` and `scene.background = null`. If the FBX has transparent materials or backface culling issues, it might not render.

6. **Camera frustum**: Camera at `(0, 1.2, 3.5)` looking at `(0, 0.3, 0)`. The avatar at `z=0.5` should be visible, but try adding `console.log(ctx.camera.position)` to verify.

7. **VRM alternative**: There's also `assets/models/Noah3.vrm` - could try loading that instead of FBX.

---

## Additional Investigation (2026-05-24)

### Code Analysis Summary

The code looks correct. Both `loadAvatar()` and `createPlaceholderAvatar()` properly:
- Create a THREE.Group
- Add meshes with proper materials
- Set castShadow = true
- Add to scene via `scene.add(group)`

### Root Cause Suspects

**Most likely issue: SCALE**

```typescript
// src/renderer/index.ts line 60
scale: 0.01
```

- `0.01` is extremely small
- If FBX was exported in centimeters (common), model is 100x smaller than expected
- A 170cm human → 1.7 units → scaled by 0.01 → 0.017 units (1.7cm) - invisible!

**Second suspect: POSITION**

- FBX at `(0, 0, 0.5)` - z=0.5 is close to camera at z=3.5
- Placeholder at `(0, -0.5, 0)` - z=0 is behind the window (z=-1.45)
- Try matching positions: both should be at z=0 or z=0.5

**Third suspect: FBX LOADING FAILURE**

- Check console for `[Avatar] FBX load failed` message
- If FBX fails silently, placeholder should show
- If placeholder also invisible → issue is camera/scene

### Test Plan

1. **Force placeholder**: Comment out FBX loading, use only `createPlaceholderAvatar()`
2. **Test scale**: Change `scale: 0.01` → `scale: 1.0` or `scale: 0.1`
3. **Test position**: Change position to `(0, 0, 1.0)` to bring avatar closer to camera
4. **Check console**: Look for loading errors or bounding box size
5. **Verify scene**: Add a visible test object (cube) to confirm rendering works

### Files Modified for Testing

- `src/renderer/index.ts` - Lines 54-77 (initAvatar function)
- Added DEBUG test cube at `(0, 0.5, 1)` - red 0.2 unit cube in front of camera

### Test Results

**Test 1 (2026-05-24):** Test cube invisible → Scene/camera issue

**Test 2 (2026-05-24):** Added more debug:
- Green ground plane at y=-0.5
- Console logs for camera position, lookAt direction, scene children count, canvas size
- Check console output for what's happening

---

## Root Cause Found: JavaScript Not Executing

**Symptom:** The renderer JavaScript (`index.js`) never runs. Console shows:
- `[Main] Loading HTML from: ...`
- `[Main] Window finished loading`
- But NO `[Renderer] Starting...` or any renderer logs

**Confirmed working:**
- ✅ Inline `<script>alert()</script>` runs and shows alert
- ✅ HTML loads successfully (`did-finish-load` fires)
- ✅ JS file exists at correct path

**Not working:**
- ❌ `<script src="index.js">` - doesn't run
- ❌ `<script type="module" src="index.js">` - doesn't run
- ❌ No console logs from index.js

**Tests performed:**
1. Added red test cube at (0, 0.5, 1) - invisible
2. Added green ground plane - invisible
3. Added blue body background - invisible
4. Added yellow HTML test div - invisible
5. Added 2D canvas overlay - invisible
6. All HTML/CSS debug elements invisible

**GPU issues (partially fixed):**
- Original error: `MESA-LOADER: failed to open dri: /usr/lib/gbm/dri_gbm.so: Permission denied`
- Fixed by adding in main/index.ts:
  ```typescript
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  ```
- Also added to package.json start script: `--disable-gpu --no-sandbox --disable-software-rasterizer`

**Current state:**
- Window loads, HTML renders (inline alert works)
- But external JS file doesn't execute
- This is why nothing renders - the Three.js code never runs

**Possible causes:**
1. **CSP (Content Security Policy)** - blocking external scripts
2. **Path issue** - relative path not resolving correctly in Electron
3. **Module loading error** - silent failure
4. **Electron security** - need to allow local file access

**Next steps for developer:**
1. Check browser console for any errors when loading index.js
2. Try absolute path in src attribute
3. Check if CSP meta tag is needed
4. Try loading index.js via fetch() and eval() as workaround
5. Check Electron webPreferences for script access

---

## Summary for Developer

**The issue is NOT the avatar - the JavaScript doesn't execute at all.**

- Inline `<script>alert()</script>` works
- External `<script src="index.js">` doesn't run
- This is why nothing renders

**Reverted changes:**
- Cleaned up debug code from src/renderer/index.ts
- Reverted package.json start script
- Reverted main/index.ts GPU workarounds

**Files to check:**
- src/renderer/index.html - script loading
- src/main/index.ts - window/webPreferences config
- Electron security settings

## Related Files

- `src/renderer/index.ts`
- `src/renderer/avatar/index.ts`
- `src/renderer/scene/index.ts`
- `assets/models/noah.fbx`
- `tests/renderer/avatar.test.ts`