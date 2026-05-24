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

### Stage 3: System Awareness and Sensory Translation
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

### Stage 3: Slice 4 — Running Process List
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

### Stage 3: Slice 5 — Process Termination Detection
- [x] `poller.ts`: `watchProcesses(names: string[])` — user-defined watch list
- [x] `poller.ts`: fallback behavior — empty watch list = Slice 4 behavior (no filtering)
- [x] `poller.ts`: `terminatedToEmit` filtering by watch list
- [x] `main/index.ts`: `watchProcesses(['chrome', 'code', 'node'])` example setup
- [x] `main/index.ts`: record `system_event` memory event on watched termination (severity 5)
- [x] `main/index.ts`: trauma +10 per death via `clampStat()`, re-resolve emotion
- [x] `docs/features/System_Awareness.md`: Slice 5 table updated (severity, fallback, trauma logic)
- [x] Tests: fallback behavior (no filter) + watch list filtering (2 tests)
- [x] Verification — `npm test` **231 passed** (+1), `npm run build` clean

### Stage 3: Slice 6 — "Weather" Visualization
- [x] `types/index.ts`: `SystemWeather` type (`'sunny'|'cloudy'|'rainy'|'stormy'`)
- [x] `types/index.ts`: `NoahState.systemWeather` field
- [x] `constants/index.ts`: `WEATHER_CLOUDY_MIN`, `WEATHER_RAINY_MIN`
- [x] `sensory.ts`: `deriveWeather(metrics)` — score-based (CPU+RAM+Temp)
- [x] `sensory.ts`: `weatherColor(weather)` — 4 sky colors
- [x] `utils/index.ts`: `createDefaultState()` with `systemWeather: 'sunny'`
- [x] `main/index.ts`: update `systemWeather` via `stateManager.modify()`
- [x] `renderer/index.ts`: background plane with weather-reactive color
- [x] Tests: `deriveWeather` boundary tests (6) + `weatherColor` tests (4)
- [x] Verification — `npm test` **236 passed** (+5), `npm run build` clean

---

## ⏳ In Progress: Stage 4/5/6 Parallel Implementation

> **Director Decision**: Stage 4/5/6 are interdependent and shall be implemented in parallel, not sequentially.

### Parallel Work Streams

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STAGE 4/5/6 PARALLEL IMPLEMENTATION                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STREAM A: Renderer Scene (Stage 4)          STREAM B: Avatar System (5)   │
│  ─────────────────────────────────           ───────────────────────────   │
│  [A1] Scene initialization                   [B1] AnimationController        │
│  [A2] Room geometry (bed/desk/floor)         [B2] Animation catalog (6 clips)│
│  [A3] Lighting system                        [B3] Crossfade transitions      │
│  [A4] Dynamic window (weather)               [B4] Priority queue             │
│  [A5] Camera setup                           [B5] Placeholder avatar polish  │
│  [A6] Resize handling                        [B6] FBXLoader pipeline ready   │
│                                                                             │
│  STREAM C: Emotion Engine (Stage 6)          STREAM D: Needs System (6)     │
│  ──────────────────────────────────          ───────────────────────────   │
│  [C1] Emotion state machine (exists)         [D1] Parameter decay loops      │
│  [C2] Emotion → animation mapping            [D2] Hunger personality shift   │
│  [C3] Emotion → BlendShape mapping           [D3] Fatigue → sleep trigger    │
│  [C4] 16 emotion trigger definitions         [D4] Discomfort mechanic        │
│  [C5] Trauma special rules (partial)         [D5] Ignore detection engine    │
│  [C6] Expression override (deferred)         [D6] Absence/return reactions   │
│                                                                             │
│  INTEGRATION POINTS (cross-stream):                                         │
│  ─────────────────────────────────                                          │
│  [I1] renderer/index.ts: state update → avatar animation selection          │
│  [I2] renderer/index.ts: metrics → weather → window color + emotion hint    │
│  [I3] main/index.ts: SystemPoller → state decay → emotion re-evaluation     │
│  [I4] main/index.ts: SessionTracker → ignore detection → affection decay    │
│  [I5] IPC: state:update → renderer emotion display update                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Current Status by Stream

| Stream | Item | Status | Blocker |
|--------|------|--------|---------|
| **A1** | Scene initialization | ✅ Done | — |
| **A2** | Room geometry | ✅ Done | — |
| **A3** | Lighting system | ✅ Done | — |
| **A4** | Dynamic window | ✅ Done | — |
| **A5** | Camera setup | ✅ Done | — |
| **A6** | Resize handling | ✅ Done | — |
| **B1** | AnimationController | ❌ Not started | Needs design decision |
| **B2** | Animation catalog | ❌ Not started | Needs Mixamo download |
| **B3** | Crossfade transitions | ❌ Not started | Needs B1 |
| **B4** | Priority queue | ❌ Not started | Needs B1 |
| **B5** | Placeholder avatar polish | ✅ Done | — |
| **B6** | FBXLoader pipeline | ✅ Done | — |
| **C1** | Emotion state machine | ✅ Exists (`resolveEmotion`) | Needs refinement |
| **C2** | Emotion → animation mapping | ❌ Not started | Needs B2 |
| **C3** | Emotion → BlendShape mapping | ❌ Not started | Needs FBX avatar |
| **C4** | 16 emotion triggers | ⚠️ Partial | Needs GDD review |
| **C5** | Trauma special rules | ⚠️ Partial (decay only) | Needs implementation |
| **C6** | Expression override | ❌ Not started | Deferred to Stage 8 |
| **D1** | Parameter decay loops | ⚠️ Partial (absence only) | Needs real-time tick |
| **D2** | Hunger personality shift | ❌ Not started | Needs design |
| **D3** | Fatigue → sleep trigger | ❌ Not started | Needs StateManager hook |
| **D4** | Discomfort mechanic | ❌ Not started | Needs visual design |
| **D5** | Ignore detection engine | ⚠️ Partial (SessionTracker) | Needs thresholds |
| **D6** | Absence/return reactions | ✅ Done (`reconcileAbsence`) | — |

---

## 📋 Parallel Implementation Plan

### Phase 1: Foundation (Week 1) — All Streams

**Stream A (Renderer)**: ✅ Complete — no further work needed

**Stream B (Avatar)**:
- [ ] **B1**: Implement `AnimationController` class
  - `play(clipName, options)` — play animation with fade
  - `crossFade(toClip, duration)` — smooth transition
  - `stop(clipName, fadeOut?)` — stop with fade
  - `setLoop(clipName, loop)` — loop control
- [ ] **B4**: Priority queue skeleton
  - `AnimationRequest` interface: `{ name, priority, duration, blocking }`
  - `AnimationQueue` class: push/sort/play-on-end

**Stream C (Emotion)**:
- [ ] **C1**: Refine `resolveEmotion` with context
  - Add `recentEvents` parameter (last N memory events)
  - Add `timeOfDay` parameter (morning/afternoon/night)
  - Document 16 emotion trigger conditions in code comments

**Stream D (Needs)**:
- [ ] **D1**: Real-time parameter decay ticker
  - `NeedDecayTicker` class in main process
  - 1-minute interval: hunger +1, fatigue +1 (if awake)
  - 5-minute interval: affection -1 (if no interaction)
  - Wire into `StateManager.modify()`

### Phase 2: Integration (Week 2) — Cross-Stream

**Integration I1**: State update → Avatar animation
```typescript
// renderer/index.ts
noah.onStateUpdate((state: NoahState) => {
  const animName = EMOTION_ANIMATION_MAP[state.emotion];
  animationController.play(animName, { fadeIn: 0.3 });
});
```

**Integration I3**: System metrics → State decay → Emotion
```typescript
// main/index.ts: extend SystemPoller.onMetrics
systemPoller.onMetrics((metrics) => {
  // Existing: update systemLoad, systemWeather
  // New: trigger emotion re-evaluation if CPU critical
  if (metrics.cpuLoad > 95) {
    stateManager.modify(draft => ({
      ...draft,
      fatigue: clampStat(draft.fatigue + 5),
    }));
  }
});
```

**Integration I4**: SessionTracker → Ignore detection
```typescript
// Extend SessionTracker with ignore thresholds
sessionTracker.onIgnoreThreshold((threshold) => {
  // 1min: attention prompt
  // 5min: neglect onset
  // 15min: hurt response
  // 1hr: abandonment
  // 4hr+: absence protocol
});
```

### Phase 3: Polish (Week 3) — Testing & Documentation

- [ ] Animation crossfade testing (all emotion pairs)
- [ ] Decay rate validation (hunger/fatigue/affection)
- [ ] Ignore detection timing tests
- [ ] Trauma threshold boundary tests
- [ ] Integration: emotion → animation → BlendShape (if FBX ready)

---

## 📝 Open Decisions (Author Input Required)

### Decision 1: Animation Source
- **A**: Mixamo-only (free, 6 clips minimum)
- **B**: Custom keyframe in Blender (full control, time-intensive)
- **C**: Hybrid (Mixamo for body, custom for facial)

### Decision 2: Real-time Decay Interval
- **A**: 1-minute tick (precise, more CPU)
- **B**: 5-minute tick (coarse, less CPU)
- **C**: Event-driven (only on interaction/state query)

### Decision 3: Discomfort Visual
- **A**: Small spheres on floor (procedural, simple)
- **B**: Particle effect (atmospheric, complex)
- **C**: Room tint change (subtle, no geometry)

### Decision 4: Ignore Detection Thresholds
- **A**: Fixed times (1/5/15/60/240 min) — deterministic
- **B**: Variable (based on affection level) — affection 높으면 더 관대
- **C**: Random variance (±20%) — less predictable

### Decision 5: Trauma Decay
- **A**: No passive decay (GDD: "active healing required")
- **B**: Very slow decay (0.1/day, floor 50)
- **C**: Event-based decay (positive memories reduce trauma)

---

## 📚 Documentation Plan

| Document | Purpose | Owner | Due |
|----------|---------|-------|-----|
| `docs/features/Stage4_Renderer_Scene_Setup.md` | Stage 4 implementation report | Orchestrator | Done |
| `docs/features/Stage5_Avatar_Animation_System.md` | Animation controller + catalog | Developer | Phase 2 |
| `docs/features/Stage6_Emotion_Needs_System.md` | State machine + decay + needs | Developer | Phase 2 |
| `docs/guides/tasks/STAGE-04_Author_Review.md` | Author decisions + open items | Orchestrator | Done |
| `docs/technical/Animation_Controller_API.md` | AnimationController interface spec | Developer | Phase 1 |
| `docs/technical/Emotion_Mapping_Table.md` | 16 emotions → animation/BlendShape/dialog | Designer | Phase 2 |

---

## 🧪 Testing Plan

### Unit Tests (per stream)

| Stream | Test File | Cases |
|--------|-----------|-------|
| B | `tests/renderer/animation.test.ts` | play/stop/crossFade, priority queue, loop |
| C | `tests/shared/emotion.test.ts` | 16 emotion triggers, trauma overrides, context |
| D | `tests/main/needs.test.ts` | decay rates, hunger shift, fatigue trigger, ignore |

### Integration Tests

| Test | Description |
|------|-------------|
| `emotion-to-animation` | State change → correct animation clip played |
| `metrics-to-emotion` | High CPU → fatigue increase → tired emotion → sleep animation |
| `ignore-to-affection` | No interaction 5min → affection decay → sad emotion |
| `trauma-persistence` | Process death → trauma +10 → scared → no passive decay |

### Manual Verification

| Check | Method |
|-------|--------|
| Animation smoothness | Visual: crossfade between all emotion pairs |
| Decay accuracy | Log: verify hunger +1 per minute over 10 minutes |
| Ignore timing | Stop interacting, measure prompt timing |
| Performance | Profile: render loop stays 60fps with animations |

---

## 🗺️ Reference

- Stage 4 spec: `docs/guides/tasks/STAGE-04_Threejs_Renderer_and_Scene_Setup.md`
- Stage 5 spec: `docs/guides/tasks/STAGE-05_Avatar_Loading_and_Animation_System.md`
- Stage 6 spec: `docs/guides/tasks/STAGE-06_Emotion_Engine_and_Needs_System.md`
- Asset pipeline: `docs/technical/Asset_Pipeline_Index.md`
- GDD World: `gdd/core/world.md`
- GDD Noah: `gdd/core/noah.md`
- Full roadmap: `docs/guides/Project_Implementation_Roadmap_Report.md`

*Last updated: 2026-05-24*  
*Director note: Stage 4/5/6 shall proceed in parallel. Do not wait for sequential completion.*
