# Noah — Project TODO

## ✅ Completed

### Stage 1: Foundation and Infrastructure
- [x] Electron main/renderer/shared architecture
- [x] TypeScript build pipeline (tsc for main + renderer)
- [x] IPC channel infrastructure (state:update, state:request, action:interaction, system:metrics)
- [x] Secure preload script with context isolation
- [x] Three.js renderer scene setup
- [x] Shared constants, types, utilities
- [x] Jest test configuration
- [x] 75 unit tests passing

### Stage 2: State Management and Persistence Layer
- [x] Expand NoahState with session tracking + needs fields
- [x] MemoryEvent type and MemoryStore (record, retrieve, decay, persist)
- [x] Memory decay logic (positive/neutral/negative/traumatic rates and floors)
- [x] Auto-save persistence (debounced, graceful shutdown, periodic checkpoint)
- [x] Backup rotation and corruption recovery (3 rotating backups)
- [x] Session boundary detection (idle → offline → return)
- [x] Absence reconciliation (hunger/fatigue/affection decay)
- [x] State restoration protocol (load → reconcile → init)
- [x] Wire MemoryStore into StateManager and IPC
- [x] 186 unit tests passing
- [x] Build pipeline verified (`npm run build` clean)

### Stage 2: Code Quality & Refactoring
- [x] **SessionTracker callback infinite loop** — `onIdle`/`onOffline` callbacks call themselves
- [x] **StateManager totalOnlineTime never accumulates** — `totalOnlineTime` field exists but never increases
- [x] **PresenceDetector powerMonitor listener duplication risk** — `removeAllListeners` removes ALL listeners globally
- [x] **AutoSaveController doesn't save MemoryStore** — graceful shutdown saves state + memory separately; should be atomic
- [x] **resolveEmotion affection branch bug** — `affection > 85` falls through to `happy` instead of `excited`
- [x] **systemTicker timer leak on window refresh** — no deduplication if called multiple times
- [x] **rotateBackups hardcoded to 3 backups** — logic breaks if `MAX_BACKUP_COUNT` changes
- [x] **AutoSaveController uses structural typing for StateManager** — should import `StateManager` type directly
- [x] **Memory context object created manually in 3 places** — extract `buildMemoryContext(state)` helper
- [x] **Tests use `as any` for AutoSaveController mocks** — type mocks properly
- [x] **NoahState version migration** — `version` field exists but no migration logic on load
- [x] **Extract formatDuration helper** — `formatAbsence` in SessionTracker duplicates `Math.floor` patterns
- [x] **Consolidate session threshold defaults** — `detector.ts` hardcodes 300_000 / 3_600_000 instead of using constants

### Pre-Stage 3: Code-Document Consistency Fixes
- [x] **`handleActivate` does not reinitialize AutoSave/SessionTracker** — `services` 글로벌 업데이트
a global instance: bootstrap에서 생성한 인스턴스를 재사용
- [x] **`sendSystemMetrics` in IPC deps is a no-op** — `IpcDeps.sendSystemMetrics` 시그니처를 `(wc, metrics) => void`로 변경, `registerIpc`

---

## ⏳ Pending: Stage 3 Minimal Vertical Slice (CPU Load)

### Goal
- OS bridge (CPU load only) → Sensory translation → Polling → IPC push → Renderer visualization → `NoahState` systemLoad update.

### Steps
- [ ] (1) Add shared sensory translation: create `src/shared/utils/sensory.ts` with `translateCpuLoad(load)` (pure + tested)
- [ ] (2) Add constants for thresholds + polling interval in `src/shared/constants/index.ts`
- [ ] (3) Implement main OS bridge module (CPU load only): create `src/main/system/reader.ts`
- [ ] (4) Implement poller (start/stop/dedup): create `src/main/system/poller.ts`
- [ ] (5) Export system module public API: create `src/main/system/index.ts`
- [ ] (6) Wire IPC: update `src/main/ipc/systemMetrics.ts` to actually read CPU load and push via existing channel
- [ ] (7) Wire bootstrap/activate services: update `src/main/index.ts` to initialize `SystemPoller` and connect callbacks
- [ ] (8) Wire renderer minimal visualization: update `src/renderer/index.ts` with a small color bar reacting to CPU load
- [ ] (9) Add NoahState field + types: update `src/shared/types/index.ts` with `systemLoad: number` (0-100, optional or clamped)
- [ ] (10) Tests: add
  - [ ] `tests/shared/sensory.test.ts`
  - [ ] `tests/main/system.test.ts` (CPU load reader mocking + poller behavior)
- [ ] (11) Verify: run `npm test` and `npm run build`

---

## 🗺️ Reference (Docs)
- Stage 3 spec: `docs/guides/tasks/STAGE-03_System_Awareness_and_Sensory_Translation.md`

*Last updated: 2026-05-24*

