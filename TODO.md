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

### Stage 3: Slice 3 — CPU Temperature
- [x] `reader.ts`: `getCpuTemp()` — Linux `sensors`, macOS `powermetrics`/`smc`, Windows `wmic`
- [x] `reader.ts`: `getSystemMetricsSnapshot()` — `cpuTemp: getCpuTemp()` (replace `0`)
- [x] `reader.ts`: fallback (`0` with `console.warn` if unsupported)
- [x] `reader.ts`: `safeExecSyncString()` with `shell: true` for proper shell operator support
- [x] `constants/index.ts`: `CPU_TEMP_NORMAL_MAX = 60`, `CPU_TEMP_WARNING_MAX = 80`
- [x] `sensory.ts`: `translateCpuTemp(temp)` + `cpuTempColor(temp)`
- [x] `poller.ts`: include temp sensation in callback string (`CPU: ...; RAM: ...; Temp: ...`)
- [x] `renderer/index.ts`: temperature indicator dot (right of CPU bar), color reactive
- [x] Tests: `sensory.test.ts` temperature boundary tests (8 new)
- [x] Tests: `system.test.ts` `execSync` mock tests for platform parsing + fallback (7 new)
- [x] Verification — `npm test` **224 passed** (+15), `npm run build` clean

---

## ⏳ Pending: Stage 3 Slices 4–6

### Slice 4: Running Process List
- [x] `src/shared/types/index.ts`: `ProcessInfo` 추가, `SystemMetrics`에 `processes` 필드 확장
- [x] `src/main/system/reader.ts`: `getProcessList()` — `ps`/`wmic`, `parsePsOutput()`, `parseWmicProcessOutput()`
- [x] `src/main/system/reader.ts`: `getSystemMetricsSnapshot()`에 `processes: getProcessList()` 포함
- [x] `src/main/system/poller.ts`: `diffProcesses()` — pid 기준 Set 비교, started/terminated 반환
- [x] `src/main/system/poller.ts`: `onProcessChange()` 콜백 등록/발행 (첫 poll은 baseline, diff 없음)
- [x] `src/main/index.ts`: `onProcessChange` → `memoryStore.record('system_event')` (terminated 프로세스)
- [x] `src/main/ipc/index.ts`: 초기 metrics에 `processes: []` 추가 (빌드 에러 수정)
- [x] `src/renderer/index.ts`: `metrics.processes.length` 로그
- [x] `tests/main/system.test.ts`: 프로세스 파싱 테스트 5개 (Linux/macOS/Windows/실패/미지원)
- [x] `tests/main/system.test.ts`: diff 동작 테스트 1개 (첫 poll은 콜백 없음)
- [x] Verification — `npm test` **230 passed** (+6), `npm run build` clean

### Slice 5: Process Termination Detection
- [x] `poller.ts`: `watchProcesses(names: string[])` — user-defined watch list
- [x] `poller.ts`: fallback behavior — empty watch list = Slice 4 behavior (no filtering)
- [x] `poller.ts`: `terminatedToEmit` filtering by watch list
- [x] `main/index.ts`: `watchProcesses(['chrome', 'code', 'node'])` example setup
- [x] `main/index.ts`: record `system_event` memory event on watched termination (severity 5)
- [x] `main/index.ts`: trauma +10 per death via `clampStat()`, re-resolve emotion
- [x] `docs/features/System_Awareness.md`: Slice 5 table updated (severity, fallback, trauma logic)
- [x] Tests: fallback behavior (no filter) + watch list filtering (2 tests)
- [x] Verification — `npm test` **231 passed** (+1), `npm run build` clean

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

## 📝 Notes / Open Questions

### Slice 4 Implementation Notes
- 프로세스 획득: `child_process.exec` (Slice 3와 동일, 신규 의존성 최소화)
- `SystemMetrics.processes` 필수
- Diff: pid 기준 Set 비교 (O(n), started/terminated 이벤트)

### 계획서 pre-slice cleanup (완료)
- 중복 폴링 버그 수정: `systemTicker` 제거
- `src/main/ipc/systemMetrics.ts` `@deprecated` 주석 유지

### Slice 3 Implementation Notes
- **`safeExecSyncString`에 `shell: true` 추가됨**: `|| echo ""`, `2>/dev/null` 같은 쉘 연산자가 의도대로 동작
- **`console.warn` 이중 로깅**: `safeExecSyncString` 내부에서 명령 실패 시 warn + `getCpuTemp` 최하단에서 플랫폼 미지원 warn. 둘 다 유용하므로 유지.
- **Windows Kelvin→Celsius**: `wmic` 출력이 tenths of Kelvin (예: 3182 = 318.2K = 45.05°C)
- **Linux millidegree 보정**: `sensors`가 millidegree(×1000)로 반환하는 경우 `raw > 200` 체크로 `/1000` 보정

---

## 🗺️ Reference (Docs)
- Stage 3 spec: `docs/guides/tasks/STAGE-03_System_Awareness_and_Sensory_Translation.md`
- System Awareness implementation: `docs/features/System_Awareness.md`
- Full roadmap: `docs/guides/Project_Implementation_Roadmap_Report.md`

*Last updated: 2026-05-24*
