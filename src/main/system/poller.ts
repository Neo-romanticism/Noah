/**
 * SystemPoller — periodic system metrics polling with callback dispatch.
 *
 * Lessons from Stage 2 applied:
 * - Deduplication on re-start (running flag)
 * - Clean stop() clears all timers
 * - WeakMap-like per-instance isolation
 */

import type { SystemMetrics, ProcessInfo } from '../../shared/types/index.js';
import { SYSTEM_METRICS_POLL_INTERVAL_MS } from '../../shared/constants/index.js';
import { translateCpuLoad, translateRamUsage, translateCpuTemp } from '../../shared/utils/sensory.js';

import { getSystemMetricsSnapshot } from './reader.js';

export type MetricsCallback = (
  metrics: SystemMetrics,
  sensation: string,
) => void;

export type ProcessChangeCallback = (
  changes: { started: ProcessInfo[]; terminated: ProcessInfo[] },
) => void;

const diffProcesses = (
  previous: ProcessInfo[],
  current: ProcessInfo[],
): { started: ProcessInfo[]; terminated: ProcessInfo[] } => {
  const prevPids = new Set(previous.map((p) => p.pid));
  const currPids = new Set(current.map((p) => p.pid));

  const started = current.filter((p) => !prevPids.has(p.pid));
  const terminated = previous.filter((p) => !currPids.has(p.pid));

  return { started, terminated };
};

export class SystemPoller {
  private intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private latestMetrics: SystemMetrics | null = null;
  private previousProcesses: ProcessInfo[] = [];

  /**
   * Process names to watch for termination.
   *
   * When empty, the poller falls back to Slice 4 behavior:
   * every process change (started + terminated) is emitted as-is.
   * When populated, only terminated processes whose `name` matches
   * an entry in this list are included in the callback payload.
   */
  private watchList: string[] = [];

  private readonly callbacks = new Set<MetricsCallback>();
  private readonly processCallbacks = new Set<ProcessChangeCallback>();


  constructor(intervalMs: number = SYSTEM_METRICS_POLL_INTERVAL_MS) {
    this.intervalMs = intervalMs;
  }

  /** Register a callback to receive metrics on each poll. */
  public onMetrics(callback: MetricsCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /** Register a callback to receive process change notifications. */
  public onProcessChange(callback: ProcessChangeCallback): () => void {
    this.processCallbacks.add(callback);
    return () => {
      this.processCallbacks.delete(callback);
    };
  }

  /**
   * Configure which process names should be monitored for termination.
   *
   * @param names - Array of process names to watch (e.g. ['chrome', 'code']).
   *                An empty array disables filtering (Slice 4 fallback).
   */
  public watchProcesses(names: string[]): void {
    this.watchList = [...names];
  }


  /** Start polling. Safe to call multiple times — deduplicated. */
  public start(): void {
    if (this.running) return;
    this.running = true;

    // Immediate first reading
    this.poll();

    this.timer = setInterval(() => {
      this.poll();
    }, this.intervalMs);
  }

  /** Stop polling and clear all timers. */
  public stop(): void {
    this.running = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Get the most recently polled metrics, or null if never polled. */
  public getLatestMetrics(): SystemMetrics | null {
    return this.latestMetrics;
  }

  /** Whether the poller is currently active. */
  public isRunning(): boolean {
    return this.running;
  }

  private poll(): void {
    const metrics = getSystemMetricsSnapshot();
    this.latestMetrics = metrics;

    // Diff processes and emit change events
    const changes = diffProcesses(this.previousProcesses, metrics.processes);
    this.previousProcesses = metrics.processes;

    // Slice 5: filter terminated processes by watch list.
    // If no watch list is configured, emit all terminated processes (Slice 4).
    const terminatedToEmit = this.watchList.length > 0
      ? changes.terminated.filter((p) => this.watchList.includes(p.name))
      : changes.terminated;

    if (changes.started.length > 0 || terminatedToEmit.length > 0) {
      for (const cb of this.processCallbacks) {
        try {
          cb({
            started: changes.started,
            terminated: terminatedToEmit,
          });
        } catch (err) {
          console.error('SystemPoller process callback error:', err);
        }
      }
    }


    const cpuSensation = translateCpuLoad(metrics.cpuLoad);
    const ramSensation = translateRamUsage(metrics.ramUsage);
    const tempSensation = translateCpuTemp(metrics.cpuTemp);
    const sensation = `CPU: ${cpuSensation}; RAM: ${ramSensation}; Temp: ${tempSensation}`;

    for (const cb of this.callbacks) {
      try {
        cb(metrics, sensation);
      } catch (err) {
        // Isolate callback errors so one bad listener doesn't break others
        console.error('SystemPoller callback error:', err);
      }
    }
  }
}
