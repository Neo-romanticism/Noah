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
- [x] **`handleActivate` does not reinitialize AutoSave/SessionTracker** — `services` global 객체 도입, bootstrap에서 생성한 인스턴스 재사용
- [x] **`sendSystemMetrics` in IPC deps is a no-op** — `IpcDeps.sendSystemMetrics` 시그니처를 `(wc, metrics) => void`로 변경, `registerIpc` 낸부에서 실제 `wc.send` 호출
- [x] **`renderer/index.ts` still uses `(window as any)`** — `preload.ts`에 `Window` 인터페이스 확장 추가, `renderer/index.ts`에서 `window.noah` 직접 사용
- [x] **`preload.ts` still uses `unknown` for IPC types** — `NoahPreloadAPI` 인터페이스 정의, 모든 콜백에 `NoahState`, `InteractionEvent`, `SystemMetrics` 타입 적용
- [x] **`README.md` lists non-existent files** — `webpack.config.cjs`, `electron-builder.yml` 제거, 실제 존재하는 `tsconfig.main.json`, `tsconfig.renderer.json`으로 교체
- [x] **`STAGE-02_Detailed_Plan.md` checkboxes not updated** — 이미 `[x]`로 업데이트되어 있었음
- [x] **GDD `Hostage` emotion trigger mismatch** — `resolveEmotion`에서 hostage 조건을 `affection <= 10 && morality <= 10`으로 수정, 관련 테스트 업데이트
- [x] **`formatDuration` imported but unused in `src/main/index.ts`** — 이미 제거되어 있었음

### Stage 3: Slice 1 — CPU Load (Minimal Vertical Slice)
- [x] `src/shared/utils/sensory.ts` — `translateCpuLoad()`, `cpuLoadColor()`
- [x] `src/shared/constants/index.ts` — `SYSTEM_METRICS_POLL_INTERVAL_MS`, `CPU_LOAD_*_MAX`
- [x] `src/main/system/reader.ts` — `getCpuLoad()`, `getSystemMetricsSnapshot()`
- [x] `src/main/system/poller.ts` — `SystemPoller` 클래스 (dedup, clean stop, callback isolation)
- [x] `src/main/system/index.ts` — public API exports
- [x] `src/main/ipc/systemMetrics.ts` — `SystemPoller` 기반 리팩토링
- [x] `src/main/index.ts` — `SystemPoller` 초기화/연결, `services`에 포함
- [x] `src/renderer/index.ts` — CPU load color bar (green→yellow→orange→red)
- [x] `src/shared/types/index.ts` — `NoahState.systemLoad`
- [x] Tests — `sensory.test.ts` (8) + `system.test.ts` (8)
- [x] Verification — `npm test` 203 passed, `npm run build` clean

### Stage 3: Slice 2 — RAM Utilization
- [x] `src/main/system/reader.ts` — `getRamUsage()` (`os.freemem()`/`os.totalmem()`), snapshot 업데이트
- [x] `src/shared/constants/index.ts` — `RAM_USAGE_LIGHT_MAX = 50`, `RAM_USAGE_HEAVY_MAX = 80`
- [x] `src/shared/utils/sensory.ts` — `translateRamUsage()`, `ramUsageColor()` (blue→purple→pink)
- [x] `src/main/system/poller.ts` — CPU+RAM combined sensation string
- [x] `src/renderer/index.ts` — RAM bar under CPU bar (y=1.35), color+scale
- [x] Tests — `sensory.test.ts` RAM boundary tests + `system.test.ts` reader mock tests
- [x] Verification — `npm test` **209 passed**, `npm run build` clean

---

## ⏳ Pending: Stage 3 Slices 3–6

### Slice 3: CPU Temperature
- [ ] `reader.ts`: `getCpuTemp()` — Linux `sensors`, macOS `powermetrics`/`smc`, Windows `wmic`
- [ ] `reader.ts`: `getSystemMetricsSnapshot()` — `cpuTemp: getCpuTemp()` (replace `0`)
- [ ] `reader.ts`: fallback (`0` with `console.warn` if unsupported)
- [ ] `sensory.ts`: `translateCpuTemp(temp)` + `cpuTempColor(temp)`
- [ ] `poller.ts`: include temp sensation in callback
- [ ] `constants/index.ts`: `CPU_TEMP_NORMAL_MAX`, `CPU_TEMP_WARNING_MAX`
- [ ] `renderer/index.ts`: temp indicator (numeric or color tint)
- [ ] Tests: platform-specific reader mocks

### Slice 4: Running Process List
- [ ] `types/index.ts`: `ProcessInfo` interface (`pid`, `name`, `cmd`)
- [ ] `types/index.ts`: extend `SystemMetrics` — `processes: ProcessInfo[]`
- [ ] `reader.ts`: `getProcessList()` — `ps-list` or `child_process.exec('ps')`
- [ ] `reader.ts`: `getSystemMetricsSnapshot()` — include processes
- [ ] `poller.ts`: process list diff between polls
- [ ] `poller.ts`: `onProcessChange(cb)` callback
- [ ] Tests: mock process list + diff verification

### Slice 5: Process Termination Detection
- [ ] `poller.ts`: `watchProcesses(names: string[])` — user-defined watch list
- [ ] `poller.ts`: detect termination (compare current vs previous list)
- [ ] `main/index.ts`: record `system_event` memory event on termination
- [ ] `state/index.ts`: update emotion — `scared`/`anxious` based on trauma
- [ ] Tests: simulate process death → event verification

### Slice 6: "Weather" Visualization
- [ ] **Contract first**: define `SystemWeather` type (`'sunny'|'cloudy'|'rainy'|'stormy'`)
- [ ] `types/index.ts`: add `SystemWeather` + `systemWeather` to `NoahState`
- [ ] `sensory.ts`: `deriveWeather(metrics)` — `cpuLoad` + `ramUsage` + `cpuTemp` → weather
- [ ] `sensory.ts`: `weatherColor(weather)` — sky colors
- [ ] `poller.ts`: derive weather in `poll()`, include in state update
- [ ] `main/index.ts`: update `NoahState.systemWeather` via `stateManager.modify()`
- [ ] `renderer/index.ts`: change scene background / window based on weather
- [ ] Tests: metric combinations → expected weather

---

## 🗺️ Reference (Docs)
- Stage 3 spec: `docs/guides/tasks/STAGE-03_System_Awareness_and_Sensory_Translation.md`
- System Awareness implementation: `docs/features/System_Awareness.md`
- Full roadmap: `docs/guides/Project_Implementation_Roadmap_Report.md`

*Last updated: 2026-05-24*
