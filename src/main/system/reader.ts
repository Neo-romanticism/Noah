/**
 * OS bridge — reads system metrics from the host computer.
 *
 * Currently supports CPU load only (Stage 3 minimal vertical slice).
 * Later stages will add RAM, temperature, and process list.
 */

import os from 'os';

import type { SystemMetrics } from '../../shared/types/index.js';

/**
 * Calculate CPU load as a percentage (0-100).
 *
 * Uses `os.loadavg()` on Unix-like systems (1-min average / num CPUs).
 * Falls back to `os.cpus()` idle time calculation on Windows or when
 * loadavg is not meaningful.
 */
export const getCpuLoad = (): number => {
  const cpus = os.cpus();
  if (cpus.length === 0) return 0;

  // On Unix, loadavg[0] is the 1-minute load average.
  // Normalize by CPU count to get a rough percentage.
  const loadAvg = os.loadavg()[0];
  if (loadAvg !== undefined && loadAvg >= 0) {
    const normalized = (loadAvg / cpus.length) * 100;
    return Math.min(100, Math.max(0, Math.round(normalized)));
  }

  // Fallback: measure idle time delta across all CPUs.
  // This is a one-shot snapshot, not a sustained average.
  let idleSum = 0;
  let totalSum = 0;
  for (const cpu of cpus) {
    const times = cpu.times;
    idleSum += times.idle;
    totalSum += times.user + times.nice + times.sys + times.idle + times.irq;
  }
  if (totalSum === 0) return 0;
  const idlePercent = (idleSum / totalSum) * 100;
  return Math.min(100, Math.max(0, Math.round(100 - idlePercent)));
};

/**
 * Build a complete SystemMetrics snapshot with real OS data.
 */
export const getSystemMetricsSnapshot = (): SystemMetrics => ({
  cpuTemp: 0, // TODO: platform-specific native module in later stage
  cpuLoad: getCpuLoad(),
  ramUsage: 0, // TODO: next vertical slice
  uptime: Math.floor(process.uptime()),
});
