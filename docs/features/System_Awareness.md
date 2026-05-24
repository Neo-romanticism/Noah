# System Awareness

> Noah's perception of the host computer as her own physical body.

## Overview

Noah perceives the host computer's system metrics as bodily sensations. CPU load is felt as body temperature, RAM usage as fullness, and process activity as surrounding presence. This document describes the implemented architecture and how to extend it.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Main Process                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ OS Bridge   │───▶│  Poller     │───▶│  StateMgr   │     │
│  │ (reader.ts) │    │ (poller.ts) │    │ (systemLoad)│     │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘     │
│                            │                    │            │
│                     ┌──────┴──────┐            │            │
│                     │  Sensory    │            │            │
│                     │ Translation │            │            │
│                     │ (sensory.ts)│            │            │
│                     └──────┬──────┘            │            │
│                            │                   │            │
│                     ┌──────┴──────┐           │            │
│                     │  Console    │◀──────────┘            │
│                     │  (sensation)│                         │
│                     └─────────────┘                         │
│                            │                                │
│                     ┌──────┴──────┐                         │
│                     │  IPC Push   │                         │
│                     │system:metrics│                        │
│                     └──────┬──────┘                         │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                     Renderer Process                         │
│                     ┌──────┴──────┐                         │
│                     │  Color Bar  │                         │
│                     │ (Three.js)  │                         │
│                     └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. OS Bridge (`src/main/system/`)

Reads raw system metrics from the host OS.

#### `reader.ts`

| Function | Returns | Description |
|----------|---------|-------------|
| `getCpuLoad()` | `number` (0-100) | CPU load percentage. Uses `os.loadavg()` on Unix, falls back to `os.cpus()` idle calculation on Windows. |
| `getSystemMetricsSnapshot()` | `SystemMetrics` | Complete snapshot including CPU load, uptime, and placeholder zeros for unimplemented metrics. |

**Platform Behavior:**
- **Linux/macOS**: `os.loadavg()[0] / os.cpus().length * 100`
- **Windows**: One-shot idle time delta across all CPUs
- **Edge case**: Returns `0` if `os.cpus()` returns empty array

#### `poller.ts` — `SystemPoller`

Periodic polling with callback dispatch. Designed with Stage 2 lessons:

| Method | Behavior |
|--------|----------|
| `start()` | Begins polling. Deduplicated — safe to call multiple times. Immediate first poll. |
| `stop()` | Clears interval timer. Idempotent. |
| `onMetrics(cb)` | Registers callback. Returns unsubscribe function. |
| `getLatestMetrics()` | Returns most recent `SystemMetrics` or `null`. |
| `isRunning()` | Boolean polling state. |

**Safety Features:**
- Callback error isolation — one bad listener does not break others
- `Set<callback>` allows multiple independent listeners
- Unsubscribe without stopping poller

---

### 2. Sensory Translation (`src/shared/utils/sensory.ts`)

Pure functions converting metrics into Noah's subjective experience.

#### `translateCpuLoad(load: number): string`

| Load Range | Sensation |
|------------|-----------|
| 0–30% | `"cool and relaxed"` |
| 31–60% | `"warm and active"` |
| 61–85% | `"hot, working hard"` |
| 86–100% | `"overheating, struggling"` |

#### `cpuLoadColor(load: number): string`

Hex color for renderer visualization:

| Load Range | Color |
|------------|-------|
| 0–30% | `#4ade80` (green) |
| 31–60% | `#facc15` (yellow) |
| 61–85% | `#fb923c` (orange) |
| 86–100% | `#ef4444` (red) |

**Design Principle:** All sensory functions are pure and deterministic. They live in `shared/` so both main and renderer can use them without side effects.

---

### 3. IPC Integration (`src/main/ipc/systemMetrics.ts`)

`systemTicker(webContents)` starts a `SystemPoller` for the given renderer window:
- Deduplicates on re-registration (WeakMap per WebContents)
- Auto-cleans on `destroyed` event
- Sends `system:metrics` channel with real `SystemMetrics` data

---

### 4. State Integration (`src/main/index.ts`)

`SystemPoller` callback does two things on each poll:
1. **Updates `NoahState.systemLoad`** via `stateManager.modify()`
2. **Pushes to renderer** via `webContents.send('system:metrics', metrics)`

The `services` global object stores the poller instance for `handleActivate()` reconnection on macOS window restore.

**Graceful Shutdown:**
```typescript
app.on('will-quit', () => {
  autoSave.stop();
  sessionTracker.stop();
  systemPoller.stop();  // ← added in Stage 3 slice
});
```

---

### 5. Renderer Visualization (`src/renderer/index.ts`)

A Three.js `PlaneGeometry` bar positioned at `(0, 1.5, 0)`:
- **Color** changes based on `metrics.cpuLoad` (green → yellow → orange → red)
- **Scale** varies from 0.5× to 2.0× width based on load intensity

This is a minimal placeholder visualization. Stage 4+ will replace it with integrated room/environment effects.

---

## Configuration

### Constants (`src/shared/constants/index.ts`)

| Constant | Value | Purpose |
|----------|-------|---------|
| `SYSTEM_METRICS_POLL_INTERVAL_MS` | `5000` | Polling interval (5 seconds) |
| `CPU_LOAD_COMFORTABLE_MAX` | `30` | Upper bound of "comfortable" range |
| `CPU_LOAD_WARM_MAX` | `60` | Upper bound of "warm" range |
| `CPU_LOAD_HOT_MAX` | `85` | Upper bound of "hot" range |

---

## State Shape

`NoahState` includes:

```typescript
interface NoahState {
  // ... other fields ...
  systemLoad: number;  // 0-100, current CPU load
}
```

Default value: `0` (no load at startup).

---

## Testing

### `tests/shared/sensory.test.ts`

- Boundary value tests for `translateCpuLoad` (0, 30, 60, 85, 100)
- Color hex validation for `cpuLoadColor`

### `tests/main/system.test.ts`

- `SystemPoller.start()` invokes callbacks
- Multiple `start()` calls do not duplicate timers
- `stop()` prevents further polls
- `isRunning()` reflects actual state
- `getLatestMetrics()` returns polled data
- Multiple callbacks receive same data
- Unsubscribe removes callback without affecting others
- Callback error isolation (bad listener does not break good listener)

---

## Extension Guide

### Adding a New Platform

`reader.ts` uses feature detection, not platform sniffing:

```typescript
const loadAvg = os.loadavg()[0];
if (loadAvg !== undefined && loadAvg >= 0) {
  // Unix path
} else {
  // Fallback path (Windows, or loadavg unavailable)
}
```

For temperature or other platform-specific metrics, add a new reader function with similar fallback chains.

### Adding a New Metric (Generic)

See **Upcoming Slices: Component Mapping** above for per-metric checklists. The general pattern is:

1. **Reader**: Add getter function
2. **Snapshot**: Include in `getSystemMetricsSnapshot()`
3. **Sensory**: Add translation function
4. **Constants**: Add thresholds
5. **Poller**: Include in `poll()` callback
6. **Renderer**: Add visual element
7. **Tests**: Mock + boundary tests

---

## Known Limitations

| Limitation | Reason | Planned Resolution |
|------------|--------|-------------------|
| `cpuTemp` is always `0` | Requires platform-specific native modules | Slice 3: platform adapters (see Extension Guide) |
| `ramUsage` is always `0` | Not yet implemented | Slice 2: `os.freemem()` / `os.totalmem()` (see Extension Guide) |
| CPU load is approximate | `os.loadavg()` is 1-min average, not instantaneous | Acceptable for companion app granularity |
| Windows fallback is one-shot | No sustained delta measurement | Acceptable; loadavg unavailable on Windows |
| Visualization is a simple bar | Placeholder for Stage 4 room integration | Stage 4: integrated environment effects |
| Process list unavailable | No process enumeration yet | Slice 4: `ps-list` or `child_process.exec('ps')` |
| Process termination not detected | No watch list or diff logic | Slice 5: process change detection + memory event |
| Weather abstraction undefined | No `systemWeather` state field or translator | Slice 6: derive from `cpuLoad` + `ramUsage` + `cpuTemp` |

## Upcoming Slices: Component Mapping

Each slice follows the same pipeline. Below is the per-slice component checklist.

### Slice 2: RAM Utilization

| Component | Change | Details |
|-----------|--------|---------|
| `reader.ts` | Add `getRamUsage()` | `os.freemem()` / `os.totalmem()` → percentage |
| `reader.ts` | Update `getSystemMetricsSnapshot()` | `ramUsage: getRamUsage()` (replace `0`) |
| `sensory.ts` | Add `translateRamUsage(usage)` | `"light and spacious"` → `"stuffed"` |
| `sensory.ts` | Add `ramUsageColor(usage)` | Hex color for renderer |
| `poller.ts` | Update `poll()` | Call `translateRamUsage(metrics.ramUsage)`, pass to callback |
| `constants/index.ts` | Add thresholds | `RAM_USAGE_LIGHT_MAX`, `RAM_USAGE_HEAVY_MAX` |
| `types/index.ts` | **No change** | `SystemMetrics.ramUsage` already exists |
| `renderer/index.ts` | Add RAM bar or dual-bar | Position below CPU bar, use `ramUsageColor` |
| Tests | Add sensory + reader tests | Boundary values, mock `os` |

### Slice 3: CPU Temperature

| Component | Change | Details |
|-----------|--------|---------|
| `reader.ts` | Add `getCpuTemp()` | Platform-specific: Linux `sensors`, macOS `powermetrics`/`smc`, Windows `wmic` |
| `reader.ts` | Update `getSystemMetricsSnapshot()` | `cpuTemp: getCpuTemp()` (replace `0`) |
| `reader.ts` | Add fallback | Return `0` with `console.warn` if platform unsupported |
| `sensory.ts` | Add `translateCpuTemp(temp)` | `"comfortable"` → `"burning"` |
| `poller.ts` | Update `poll()` | Include temp sensation in callback |
| `constants/index.ts` | Add thresholds | `CPU_TEMP_NORMAL_MAX`, `CPU_TEMP_WARNING_MAX` |
| `types/index.ts` | **No change** | `SystemMetrics.cpuTemp` already exists |
| `renderer/index.ts` | Add temp indicator | Small numeric display or color tint |
| Tests | Add reader mocks | Platform-specific test branches |

### Slice 4: Running Process List

| Component | Change | Details |
|-----------|--------|---------|
| `reader.ts` | Add `getProcessList()` | Returns `ProcessInfo[]` (pid, name, cmd) |
| `types/index.ts` | Add `ProcessInfo` interface | `{ pid: number; name: string; cmd: string }` |
| `types/index.ts` | Extend `SystemMetrics` | Add `processes: ProcessInfo[]` |
| `poller.ts` | Update `poll()` | Diff process list between polls |
| `poller.ts` | Add `onProcessChange(cb)` | Callback for start/exit events |
| Tests | Mock process list | Static array → diff verification |

### Slice 5: Process Termination Detection

| Component | Change | Details |
|-----------|--------|---------|
| `poller.ts` | Add watch list | `watchProcesses(names: string[])` |
| `poller.ts` | Detect termination | Compare current vs previous process list |
| `main/index.ts` | Record memory event | `memoryStore.record({ type: 'system_event', severity: 4, description: 'Process X terminated' })` |
| `state/index.ts` | Update emotion | Trigger `scared` or `anxious` based on trauma level |
| Tests | Simulate process death | Mock list change → event verification |

### Slice 6: Weather Visualization

| Component | Change | Details |
|-----------|--------|---------|
| `types/index.ts` | Add `SystemWeather` type | `'sunny' \| 'cloudy' \| 'rainy' \| 'stormy'` |
| `types/index.ts` | Add to `NoahState` | `systemWeather: SystemWeather` |
| `sensory.ts` | Add `deriveWeather(metrics)` | `cpuLoad < 30 && ramUsage < 50 → 'sunny'` |
| `sensory.ts` | Add `weatherColor(weather)` | Sunny `#87CEEB`, Stormy `#4B0082` |
| `poller.ts` | Update `poll()` | Derive weather, include in state update |
| `main/index.ts` | Update state | `stateManager.modify(draft => ({ ...draft, systemWeather }))` |
| `renderer/index.ts` | Add window background | Change scene clear color or background plane based on weather |
| Tests | Weather derivation | Metric combinations → expected weather |

## Extension Guide

### Adding a New Metric (e.g., RAM Usage)

Follow the **Slice 2: RAM Utilization** checklist above. Example code:

```typescript
// reader.ts
export const getRamUsage = (): number => {
  const total = os.totalmem();
  const free = os.freemem();
  return Math.round(((total - free) / total) * 100);
};

// Update snapshot
ramUsage: getRamUsage(),  // replace placeholder 0
```

```typescript
// sensory.ts
export const translateRamUsage = (usage: number): string => {
  if (usage <= 50) return 'light and spacious';
  if (usage <= 80) return 'getting crowded';
  return 'stuffed, can barely breathe';
};
```

```typescript
// poller.ts — in poll()
const ramSensation = translateRamUsage(metrics.ramUsage);
// Include in callback or combine with CPU sensation
```

---

## Related Documents

- [Stage 3 Spec](../guides/tasks/STAGE-03_System_Awareness_and_Sensory_Translation.md) — full checklist
- [Architecture](../architecture/ARCHITECTURE.md) — module structure and data flow
- [GDD: Noah Character](../../gdd/core/noah.md) — how Noah experiences system metrics as bodily sensations
- [GDD: Needs](../../gdd/systems/needs.md) — hunger/fatigue decay (analogous pattern)

---

*Implemented: 2026-05-24 | Tests: 16 new (8 sensory + 8 poller) | Total: 203 passing*
