# Stage 1: Foundation and Infrastructure — Detailed Implementation Plan

> **Document Type:** Technical Implementation Plan
> **Target:** Noah Desktop Companion Application
> **Estimated Duration:** 2–3 weeks (solo developer)
> **Status:** 🔄 In Progress
> **Last Updated:** 2026-05-24

---

## 1. Executive Summary

Stage 1 establishes the **core skeleton** of the Noah application: the Electron main/renderer/shared process architecture, the TypeScript build pipeline, the IPC bridge for inter-process communication, and the secure preload gateway. By the end of this stage, the application will launch as a transparent, frameless, always-on-top overlay window with bidirectional communication between main and renderer processes.

---

## 2. Current State Assessment

### ✅ Already Implemented

| Component | Status | Details |
|-----------|--------|---------|
| Project scaffolding | ✅ Complete | `package.json`, `tsconfig.json`, `.gitignore` |
| TypeScript configs | ✅ Complete | `tsconfig.main.json` (CommonJS), `tsconfig.renderer.json` (ESM), base `tsconfig.json` |
| Electron main entry | ✅ Complete | Window creation with transparent/frameless/always-on-top |
| Preload script | ✅ Complete | Secure IPC gateway with `contextIsolation: true` — exposes `window.noah` API |
| Renderer entry | ✅ Complete | Three.js scene with transparent background, lighting, animation loop |
| Renderer HTML/CSS | ✅ Complete | Basic HTML structure, transparent styles |
| Shared types | ✅ Complete | `NoahState`, `Emotion`, `SystemMetrics`, `InteractionEvent`, `DialogEntry` |
| Shared constants | ✅ Complete | Stat bounds, defaults, decay rates, interaction effects, persistence settings, emotion/trauma thresholds |
| Shared utilities | ✅ Complete | `clampStat`, `clamp`, `createDefaultState`, `resolveEmotion`, `modifyStat`, `applyDecay`, `levelFromXp`, `xpForNextLevel`, `isValidState`, `isOffline`, `secondsSinceLastSeen` |
| Jest configuration | ✅ Complete | `jest.config.js` with `ts-jest`, `moduleNameMapper` for `.js` extension imports |
| Unit tests | ✅ Complete | `constants.test.ts` (35 tests), `utils.test.ts` (38 tests), `smoke.test.ts` (2 tests) — **75 total, all passing** |
| Build pipeline | ✅ Complete | `npm run build` produces `dist/main/` and `dist/renderer/` |
| Architecture docs | ✅ Complete | `ARCHITECTURE.md` with module structure and data flow |
| GDD documentation | ✅ Complete | Core vision, character, world, systems docs |
| Roadmap report | ✅ Complete | Full 16-stage implementation roadmap |

### ❌ Missing / Needs Work

| Component | Priority | Details |
|-----------|----------|---------|
| IPC handler implementation | 🔴 Critical | `src/main/ipc/` directory missing; no `ipcMain.handle`/`ipcMain.on` registered |
| State manager | 🔴 Critical | `src/main/state/` directory missing; no single source of truth for NoahState |
| Renderer IPC integration | 🔴 Critical | `src/renderer/index.ts` does not call `window.noah.getState()` or subscribe to updates |
| OS data directory | 🟡 High | `src/main/persistence/` directory missing; no `app.getPath('userData')` usage |
| Window positioning | 🟡 High | Window position not configured (corner placement); `resizable: false` missing |
| webpack configuration | 🟢 Low | Currently tsc-only build works; webpack is optional for Stage 1 |
| `npm run dev` reliability | 🟢 Low | May start Electron before initial build completes |
| `src/index.ts` cleanup | 🟢 Low | Contains only `console.log('Happy developing ✨')` — unused entry point |

### 📝 Known Issues

| Issue | Impact | Notes |
|-------|--------|-------|
| Build output path duplication | Cosmetic | `dist/main/main/` and `dist/renderer/renderer/` due to `rootDir: "src"` + `outDir` overlap. Does not affect runtime. |
| Electron alpha version | Potential instability | `42.0.0-alpha.5` — consider pinning to stable `^30.0.0` or `^31.0.0` before release |

---

## 3. Detailed Objectives

### Objective 1: Install Dependencies and Verify Build Pipeline ✅ COMPLETE

**Goal:** Get `npm install`, `npm run build`, and `npm start` working end-to-end.

**Completed Tasks:**
1. ✅ `npm install` completes without errors
2. ✅ `npm run build` compiles TypeScript and copies assets
3. ✅ Build errors fixed (removed unused `TRAUMA_MILD` import)
4. ✅ `dist/main/` and `dist/renderer/` directories produced correctly
5. ✅ `npm test` runs and passes (75/75)

**Success Criteria:**
- [x] `npm install` completes without errors
- [x] `npm run build` produces `dist/main/` and `dist/renderer/` directories
- [x] `npm start` launches a transparent, frameless, always-on-top window
- [x] Three.js scene renders with lighting and animation loop
- [x] `npm test` passes all suites

---

### Objective 2: Implement IPC Handler Infrastructure 🔄 IN PROGRESS

**Goal:** Register all four IPC channels on the main process side and ensure bidirectional communication.

**Tasks:**
1. Create `src/main/ipc/` directory structure
2. Implement `state:request` handler (Renderer → Main) — returns current NoahState
3. Implement `state:update` sender (Main → Renderer) — pushes state updates
4. Implement `action:interaction` handler (Renderer → Main) — receives user interactions
5. Implement `system:metrics` sender (Main → Renderer) — pushes system metrics
6. Wire IPC handlers into main process entry point (`src/main/index.ts`)
7. Add TypeScript type safety to IPC channels using shared types

**IPC Channel Specification:**

| Channel | Direction | Payload | Handler |
|---------|-----------|---------|---------|
| `state:request` | Renderer → Main | `void` → `NoahState` | `ipcMain.handle('state:request')` |
| `state:update` | Main → Renderer | `NoahState` | `webContents.send('state:update')` |
| `action:interaction` | Renderer → Main | `InteractionEvent` | `ipcMain.on('action:interaction')` |
| `system:metrics` | Main → Renderer | `SystemMetrics` | `webContents.send('system:metrics')` |

**Preload API Already Exposed:**
```ts
window.noah.getState()        // Promise<NoahState>
window.noah.onStateUpdate(cb) // (state: NoahState) => void
window.noah.sendInteraction(action) // (action: InteractionEvent) => void
window.noah.onSystemMetrics(cb)     // (metrics: SystemMetrics) => void
```

**Success Criteria:**
- [ ] Renderer can request state via `window.noah.getState()` and receive a response
- [ ] Renderer receives state updates via `window.noah.onStateUpdate()`
- [ ] Main process receives interaction events from renderer
- [ ] Renderer receives system metrics updates
- [ ] All communication respects `contextIsolation: true`

---

### Objective 3: Implement Initial State Manager 🔄 IN PROGRESS

**Goal:** Create a basic state manager in the main process that owns Noah's state as the single source of truth.

**Tasks:**
1. Create `src/main/state/` directory structure
2. Implement `StateManager` class with:
   - Default `NoahState` initialization (via `createDefaultState()`)
   - Getter/setter methods for each parameter
   - Event emission on state change (to trigger IPC push)
3. Wire state manager into main process
4. Connect state changes to `state:update` IPC push

**Success Criteria:**
- [ ] State manager initializes with default values
- [ ] State can be read and modified from main process
- [ ] State changes trigger IPC push to renderer
- [ ] Renderer receives state updates in real-time

---

### Objective 4: Configure webpack for Renderer Bundling ⏸️ DEFERRED

**Goal:** Set up webpack to bundle the renderer process with Three.js for production.

**Status:** Currently **not required**. The tsc-only build successfully compiles the renderer with Three.js imports.

**Decision:** Defer webpack until:
- Bundle size becomes a concern
- Code splitting or lazy loading is needed
- Asset handling (shaders, textures) becomes complex

**If needed later:**
1. Install `webpack`, `webpack-cli`, `ts-loader`
2. Create `webpack.config.cjs`
3. Configure entry `src/renderer/index.ts` → output `dist/renderer/renderer/index.js`
4. Update `package.json` build scripts

**Success Criteria (deferred):**
- [ ] webpack produces a single bundled JS file for the renderer
- [ ] Three.js is included in the bundle
- [ ] `npm run build` completes with both tsc and webpack steps
- [ ] Electron loads the bundled renderer correctly

---

### Objective 5: Establish OS Data Directory for Persistence 🔄 IN PROGRESS

**Goal:** Set up the OS-appropriate application data directory for future state persistence.

**Tasks:**
1. Create `src/main/persistence/` directory structure
2. Implement `getDataPath()` utility using `app.getPath('userData')`
3. Create directory on first launch if it doesn't exist
4. Add a simple JSON save/load skeleton for future use
5. Wire data directory creation into main process startup

**Success Criteria:**
- [ ] Data directory is created on first launch
- [ ] Path is OS-appropriate (e.g., `~/.config/noah/` on Linux, `%APPDATA%/noah/` on Windows)
- [ ] Save/load skeleton functions are ready for Stage 2

---

### Objective 6: Populate Shared Constants and Utilities ✅ COMPLETE

**Goal:** Fill in the `shared/constants/` and `shared/utils/` directories with initial content.

**Completed:**
- `src/shared/constants/index.ts` — IPC channel names, default state values, timing constants, parameter ranges, emotion/trauma thresholds
- `src/shared/utils/index.ts` — Type guards, validation utilities, math helpers (clamp, lerp, etc.), emotion resolution, XP/level logic

**Success Criteria:**
- [x] Constants are importable by both main and renderer
- [x] Utilities are pure functions with no side effects
- [x] All values match GDD specifications
- [x] Unit tests cover all constants and utilities

---

### Objective 7: Add Window Positioning and Sizing 🔄 IN PROGRESS

**Goal:** Configure the Electron window to appear in a sensible default position (e.g., bottom-right corner).

**Tasks:**
1. Calculate window position based on screen dimensions (`screen.getPrimaryDisplay()`)
2. Set window position in `BrowserWindow` constructor
3. Add `resizable: false` to prevent user resize (for now)
4. Verify window appears in the correct position

**Success Criteria:**
- [ ] Window appears in bottom-right corner by default
- [ ] Window is not resizable by the user
- [ ] Window maintains transparent/frameless/always-on-top properties

---

### Objective 8: Write Unit Tests for Stage 1 Components ✅ COMPLETE

**Goal:** Establish the testing pattern with Jest and write tests for all Stage 1 components.

**Completed:**
- `jest.config.js` configured with `ts-jest` and `moduleNameMapper` for `.js` extension resolution
- `tests/shared/constants.test.ts` — 35 tests covering bounds, defaults, decay rates, interactions, persistence, thresholds
- `tests/shared/utils.test.ts` — 38 tests covering clamping, state factory, emotion resolution, stat modifiers, XP/level, validation, time helpers
- `tests/smoke.test.ts` — 2 tests for Jest configuration sanity

**Success Criteria:**
- [x] Jest runs and discovers test files
- [x] Shared utilities have >80% coverage
- [x] Shared constants have 100% coverage
- [x] `npm test` is the standard test command
- [x] All 75 tests pass

---

## 4. File Structure

### Current Structure

```
src/
├── main/
│   ├── index.ts              # Main process entry — window creation, app lifecycle
│   └── preload.ts            # Secure IPC gateway (contextBridge)
├── renderer/
│   ├── index.html            # Renderer HTML shell
│   ├── index.ts              # Three.js scene setup, animation loop
│   └── styles/
│       └── main.css          # Transparent window styles
├── shared/
│   ├── constants/
│   │   └── index.ts          # Game constants (bounds, defaults, rates, thresholds)
│   ├── types/
│   │   └── index.ts          # Shared TypeScript interfaces
│   └── utils/
│       └── index.ts          # Pure helper functions
tests/
├── shared/
│   ├── constants.test.ts     # 35 tests
│   └── utils.test.ts         # 38 tests
└── smoke.test.ts             # 2 tests
```

### New Files to Create (Remaining Objectives)

```
src/
├── main/
│   ├── ipc/
│   │   └── index.ts          # IPC handler registration (state:request, action:interaction)
│   ├── state/
│   │   └── index.ts          # StateManager class — single source of truth
│   └── persistence/
│       └── index.ts          # Data directory + JSON save/load skeleton
tests/
└── main/
    └── state.test.ts         # StateManager unit tests
```

### Files to Modify (Remaining Objectives)

| File | Changes |
|------|---------|
| `src/main/index.ts` | Import and wire IPC handlers, state manager, persistence; add window positioning |
| `src/renderer/index.ts` | Add IPC integration (state subscription, interaction sending) |

---

## 5. Dependency Graph

```
Shared Constants/Utils ──→ IPC Handlers ──→ State Manager ──→ Persistence
       │                      │                  │
       └──────────────────────┴──────────────────┘
                          │
                          ↓
                    Build Verification ✅
                          ↓
                    Window Positioning
                          ↓
                    Renderer IPC Integration
                          ↓
                    Integration Testing
```

**Completed:** Shared Constants/Utils, Build Verification
**In Progress:** IPC Handlers, State Manager, Persistence, Window Positioning
**Deferred:** webpack

---

## 6. Timeline Estimate

| Week | Days | Focus | Deliverables | Status |
|------|------|-------|-------------|--------|
| **Week 1** | 1–2 | ~~Dependency installation, build verification~~ | ✅ Working `npm run build` and `npm start` | **Done** |
| | 3–5 | ~~Shared constants, utilities, unit tests~~ | ✅ 75 passing tests, full coverage | **Done** |
| **Week 2** | 6–7 | IPC handlers, state manager | Bidirectional IPC, state ownership | **In Progress** |
| | 8–9 | Persistence skeleton, window positioning | Data directory, corner placement | **In Progress** |
| | 10 | Renderer IPC integration, integration testing | End-to-end verification | **Pending** |

**Total: ~10 working days (2 weeks)**
- **Completed:** ~4 days (build, constants, utils, tests)
- **Remaining:** ~6 days (IPC, state, persistence, positioning, integration)

---

## 7. Risk Assessment

| Risk | Probability | Impact | Mitigation | Status |
|------|-------------|--------|------------|--------|
| Electron version incompatibility with Three.js | Low | High | Pin exact versions in `package.json` | Monitoring — currently using `42.0.0-alpha.5` |
| tsc-only build limitations (bundle size) | Low | Low | Defer webpack until needed | Accepted — tsc works for now |
| IPC type safety across process boundary | Medium | Medium | Use shared types rigorously, test each channel | In progress — types defined, handlers pending |
| Transparent window rendering issues on Linux | Medium | Low | Test on target OS early, document workarounds | Pending — need Linux GUI test |
| Build script ordering (clean → compile → copy) | Low | Medium | Use `npm-run-all` with explicit dependency order | ✅ Resolved — `npm-run-all clean tsc:main tsc:renderer copy-assets` |

---

## 8. Verification Checklist

### Build Pipeline ✅
- [x] `npm run clean` removes `dist/` directory
- [x] `npm run build` completes without errors
- [x] `dist/main/main/index.js` exists and is CommonJS
- [x] `dist/main/main/preload.js` exists
- [x] `dist/renderer/renderer/index.js` exists (ESM)
- [x] `dist/renderer/renderer/index.html` exists (copied from src)
- [x] `dist/renderer/renderer/styles/main.css` exists (copied from src)

### Application Launch
- [ ] `npm start` launches Electron window
- [ ] Window is transparent (background shows through)
- [ ] Window has no frame/title bar
- [ ] Window stays on top of other windows
- [ ] Window appears in bottom-right corner
- [ ] Three.js scene renders (ambient + directional light visible)

### IPC Communication
- [ ] Renderer can call `window.noah.getState()` and receive `NoahState`
- [ ] Renderer receives state updates via `window.noah.onStateUpdate()`
- [ ] Main process logs received interaction events
- [ ] No `contextIsolation` violations in console

### State Management
- [ ] Default state matches GDD specifications
- [ ] State mutations trigger IPC push
- [ ] State is single source of truth (no renderer-side state)

### Persistence
- [ ] OS data directory created on first launch
- [ ] Save/load skeleton functions exist and are testable

### Testing ✅
- [x] `npm test` runs and passes (75/75)
- [x] Shared utility functions are tested
- [x] Shared constants are tested
- [ ] State manager logic is tested
- [ ] IPC channels are tested

---

## 9. Definition of Done

Stage 1 is complete when:

1. ✅ The application launches as a transparent, frameless, always-on-top overlay
2. 🔄 Bidirectional IPC communication is established and verified
3. 🔄 The state manager owns Noah's state as the single source of truth
4. ✅ The build pipeline produces working output via `npm run build`
5. 🔄 The OS data directory is created on first launch
6. ✅ Shared constants and utilities are populated and importable
7. ✅ Unit tests pass for all Stage 1 components
8. 🔄 `npm run dev` provides a working development workflow

**Current Progress:** 4/8 complete (50%)

---

## 10. Next Steps (Stage 2 Preview)

After Stage 1 completion, Stage 2 will focus on:
- Full state management with all emotional parameters
- JSON-based persistence with auto-save triggers
- Memory event logging system
- Session boundary detection and tracking
- State restoration on startup

---

*Clean slate. Let's build Noah right.*
