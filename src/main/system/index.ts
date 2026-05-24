/**
 * System module — public API for OS bridge and metrics polling.
 *
 * Exports:
 * - Reader: low-level metric reading (CPU load, etc.)
 * - Poller: periodic polling with callbacks
 */

export { getCpuLoad, getSystemMetricsSnapshot } from './reader.js';
export { SystemPoller } from './poller.js';
export type { MetricsCallback } from './poller.js';
