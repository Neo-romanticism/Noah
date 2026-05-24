/**
 * SystemPoller — periodic system metrics polling with callback dispatch.
 *
 * Lessons from Stage 2 applied:
 * - Deduplication on re-start (running flag)
 * - Clean stop() clears all timers
 * - WeakMap-like per-instance isolation
 */

import type { SystemMetrics } from '../../shared/types/index.js';
import { SYSTEM_METRICS_POLL_INTERVAL_MS } from '../../shared/constants/index.js';
import { translateCpuLoad } from '../../shared/utils/sensory.js';
import { getSystemMetricsSnapshot } from './reader.js';

export type MetricsCallback = (
  metrics: SystemMetrics,
  sensation: string,
) => void;

export class SystemPoller {
  private intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private latestMetrics: SystemMetrics | null = null;
  private readonly callbacks = new Set<MetricsCallback>();

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
    const sensation = translateCpuLoad(metrics.cpuLoad);

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
