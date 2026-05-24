/**
 * OS bridge — reads system metrics from the host computer.
 *
 * Currently supports CPU load + CPU temperature.
 */

import os from 'os';
import { execSync } from 'child_process';

import type { SystemMetrics, ProcessInfo } from '../../shared/types/index.js';

/**
 * Calculate CPU load as a percentage (0-100).
 */
export const getCpuLoad = (): number => {
  const cpus = os.cpus();
  if (cpus.length === 0) return 0;

  const loadAvg = os.loadavg()[0];
  if (loadAvg !== undefined && loadAvg >= 0) {
    const normalized = (loadAvg / cpus.length) * 100;
    return Math.min(100, Math.max(0, Math.round(normalized)));
  }

  // Fallback: measure idle time ratio.
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
 * Build a complete SystemMetrics snapshot with real OS RAM data.
 */
export const getRamUsage = (): number => {
  const total = os.totalmem();
  const free = os.freemem();
  if (total === 0) return 0;

  const usedRatio = (total - free) / total;
  return Math.min(100, Math.max(0, Math.round(usedRatio * 100)));
};

const parseFirstNumber = (text: string): number | null => {
  const m = text.match(/(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
};

const safeExecSyncString = (cmd: string, timeoutMs: number): string => {
  try {
    const out = execSync(cmd, { encoding: 'utf-8', timeout: timeoutMs, shell: 'true' });

    return typeof out === 'string' ? out : String(out ?? '');
  } catch (err) {
    console.warn(`[System] CPU temperature command failed: ${cmd}`);
    // eslint-disable-next-line no-console
    if (err instanceof Error) console.warn(err.message);
    return '';
  }
};


/**
 * Read CPU temperature in Celsius.
 * Returns 0 when unavailable/unparsable.
 */
export const getCpuTemp = (): number => {
  const platform = process.platform;

  if (platform === 'linux') {
    const output = safeExecSyncString('sensors -u 2>/dev/null || echo ""', 1000);

    const match = output.match(/temp\w*_input:\s*([\d.]+)/i);
    if (match) {
      const raw = parseFloat(match[1] ?? '');
      const celsius = raw > 200 ? raw / 1000 : raw;
      return Number.isFinite(celsius) ? Math.round(celsius) : 0;
    }

    const alt = output.match(/Core \d+.*?:\s*\+?([\d.]+)°?C/i);
    if (alt) {
      const n = parseFloat(alt[1] ?? '');
      return Number.isFinite(n) ? Math.round(n) : 0;
    }

    return 0;
  }

  if (platform === 'darwin') {
    const output = safeExecSyncString(
      'powermetrics --samplers smc -n 1 2>/dev/null || echo ""',
      2000,
    );

    const match = output.match(/CPU die temperature:\s*([\d.]+)/i);
    if (match) {
      const n = parseFloat(match[1] ?? '');
      return Number.isFinite(n) ? Math.round(n) : 0;
    }

    const tempMatch = output.match(/temperature[^\n]*\n?/i);
const tempBlockStr = tempMatch ? tempMatch[0] : '';
    const n = tempBlockStr ? parseFirstNumber(tempBlockStr) : null;
    return n !== null ? Math.round(n) : 0;

  }

  if (platform === 'win32') {
    const output = safeExecSyncString(
      'wmic /namespace:\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature 2>nul || echo 0',
      1000,
    );

    const m = output.match(/(-?\d+)/);
    if (!m) return 0;

    const kelvinTenths = parseInt(m[1] ?? '', 10);
    if (!Number.isFinite(kelvinTenths) || kelvinTenths === 0) return 0;

    const celsius = kelvinTenths / 10 - 273.15;
    return Math.round(celsius);
  }

  console.warn(`[System] CPU temperature reading not available on ${platform}`);
  return 0;
};

/**
 * Parse ps -eo output (Linux/macOS) into ProcessInfo array.
 * Format: PID COMMAND ARGS...
 */
const parsePsOutput = (output: string): ProcessInfo[] => {
  const lines = output.trim().split('\n');
  const processes: ProcessInfo[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match: leading spaces, pid (digits), space, command (non-space), space, rest (args)
    const match = trimmed.match(/^\s*(\d+)\s+(\S+)\s+(.+)$/);
    if (match) {
      const pidStr = match[1];
      const nameStr = match[2];
      const cmdStr = match[3];
      if (pidStr && nameStr) {
        processes.push({
          pid: parseInt(pidStr, 10),
          name: nameStr,
          cmd: cmdStr?.trim() ?? '',
        });
      }
    }
  }

  return processes;
};

/**
 * Parse wmic process output (Windows) into ProcessInfo array.
 * Format: CSV with Node,CommandLine,ProcessId,Name headers.
 */
const parseWmicProcessOutput = (output: string): ProcessInfo[] => {
  const lines = output.trim().split('\n');
  const processes: ProcessInfo[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('Node')) continue;

    // CSV format: NODE,CommandLine,ProcessId,Name
    const parts = trimmed.split(',');
    if (parts.length >= 4) {
      const pidStr = parts[2];
      const nameStr = parts[3];
      const cmdStr = parts[1];
      if (pidStr && nameStr) {
        const pid = parseInt(pidStr, 10);
        if (!Number.isNaN(pid)) {
          processes.push({ pid, name: nameStr.trim(), cmd: cmdStr?.trim() ?? '' });
        }
      }
    }
  }

  return processes;
};

/**
 * Read the list of currently running processes.
 * Returns empty array when unavailable.
 */
export const getProcessList = (): ProcessInfo[] => {
  const platform = process.platform;

  try {
    if (platform === 'linux' || platform === 'darwin') {
      const output = safeExecSyncString(
        'ps -eo pid,comm,args --no-headers 2>/dev/null || echo ""',
        2000,
      );
      return parsePsOutput(output);
    }

    if (platform === 'win32') {
      const output = safeExecSyncString(
        'wmic process get ProcessId,Name,CommandLine /format:csv 2>nul || echo ""',
        2000,
      );
      return parseWmicProcessOutput(output);
    }
  } catch {
    // Silently fall through
  }

  return [];
};

/**
 * Build a complete SystemMetrics snapshot.
 */
export const getSystemMetricsSnapshot = (): SystemMetrics => ({
  cpuTemp: getCpuTemp(),
  cpuLoad: getCpuLoad(),
  ramUsage: getRamUsage(),
  uptime: Math.floor(process.uptime()),
  processes: getProcessList(),
});

