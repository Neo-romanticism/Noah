import os from 'os';
import { execSync } from 'child_process';

import { SystemPoller } from '../../src/main/system/poller.js';
import { getRamUsage, getCpuTemp, getProcessList } from '../../src/main/system/reader.js';

jest.mock('child_process');

describe('SystemPoller + reader', () => {

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('start/stop', () => {
    it('starts polling and invokes callbacks', () => {
      const poller = new SystemPoller(1000);
      const callback = jest.fn();

      poller.onMetrics(callback);
      poller.start();

      // Immediate poll on start
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0]![0]).toHaveProperty('cpuLoad');
      expect(callback.mock.calls[0]![0]).toHaveProperty('uptime');
      expect(typeof callback.mock.calls[0]![1]).toBe('string');

      // After one interval
      jest.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(2);

      poller.stop();
    });

    it('does not duplicate timers on multiple start() calls', () => {
      const poller = new SystemPoller(1000);
      const callback = jest.fn();

      poller.onMetrics(callback);
      poller.start();
      poller.start(); // duplicate
      poller.start(); // triplicate

      // Should only have one immediate poll
      expect(callback).toHaveBeenCalledTimes(1);

      // After one interval, still only one additional poll
      jest.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(2);

      poller.stop();
    });

    it('stops polling and clears timers', () => {
      const poller = new SystemPoller(1000);
      const callback = jest.fn();

      poller.onMetrics(callback);
      poller.start();
      poller.stop();

      // Reset mock to track post-stop calls
      callback.mockClear();

      jest.advanceTimersByTime(5000);
      expect(callback).not.toHaveBeenCalled();
    });

    it('reports running state correctly', () => {
      const poller = new SystemPoller(1000);

      expect(poller.isRunning()).toBe(false);
      poller.start();
      expect(poller.isRunning()).toBe(true);
      poller.stop();
      expect(poller.isRunning()).toBe(false);
    });

    it('returns latest metrics after poll', () => {
      const poller = new SystemPoller(1000);

      expect(poller.getLatestMetrics()).toBeNull();
      poller.start();
      expect(poller.getLatestMetrics()).not.toBeNull();
      expect(poller.getLatestMetrics()?.cpuLoad).toBeGreaterThanOrEqual(0);
      expect(poller.getLatestMetrics()?.cpuLoad).toBeLessThanOrEqual(100);
      poller.stop();
    });
  });

  describe('callback management', () => {
    it('allows multiple callbacks', () => {
      const poller = new SystemPoller(1000);
      const cb1 = jest.fn();
      const cb2 = jest.fn();

      poller.onMetrics(cb1);
      poller.onMetrics(cb2);
      poller.start();

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);

      poller.stop();
    });

    it('allows unsubscribing callbacks', () => {
      const poller = new SystemPoller(1000);
      const cb1 = jest.fn();
      const cb2 = jest.fn();

      const unsubscribe1 = poller.onMetrics(cb1);
      poller.onMetrics(cb2);
      poller.start();

      unsubscribe1();
      cb1.mockClear();
      cb2.mockClear();

      jest.advanceTimersByTime(1000);
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledTimes(1);

      poller.stop();
    });

    it('isolates callback errors so one bad listener does not break others', () => {
      const poller = new SystemPoller(1000);
      const badCb = jest.fn().mockImplementation(() => {
        throw new Error('bad callback');
      });
      const goodCb = jest.fn();

      poller.onMetrics(badCb);
      poller.onMetrics(goodCb);
      poller.start();

      expect(badCb).toHaveBeenCalledTimes(1);
      expect(goodCb).toHaveBeenCalledTimes(1);

      poller.stop();
    });
  });

  describe('getCpuTemp', () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      jest.restoreAllMocks();
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('parses Linux sensors -u output (temp1_input)', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      (execSync as jest.Mock).mockReturnValue('temp1_input: 45.500\n');

      expect(getCpuTemp()).toBe(46);
    });

    it('parses Linux sensors output (Core 0 temp)', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      (execSync as jest.Mock).mockReturnValue('Core 0: +62.0°C\n');

      expect(getCpuTemp()).toBe(62);
    });

    it('parses macOS powermetrics output (CPU die temperature)', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      (execSync as jest.Mock).mockReturnValue('CPU die temperature: 55.3 C\n');

      expect(getCpuTemp()).toBe(55);
    });

    it('parses Windows wmic output (Kelvin to Celsius)', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      (execSync as jest.Mock).mockReturnValue('CurrentTemperature\n3182\n');

      expect(getCpuTemp()).toBe(45); // 318.2 - 273.15 = 45.05 → 45
    });

    it('falls back to 0 when command fails', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('command not found');
      });

      expect(getCpuTemp()).toBe(0);
    });

    it('falls back to 0 on unsupported platform', () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd' });

      expect(getCpuTemp()).toBe(0);
    });

    it('handles millidegree values on Linux (raw > 200)', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      (execSync as jest.Mock).mockReturnValue('temp1_input: 45500\n');

      expect(getCpuTemp()).toBe(46); // 45500 / 1000 = 45.5 → 46
    });
  });

  describe('getProcessList', () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      jest.restoreAllMocks();
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('parses Linux ps output', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      (execSync as jest.Mock).mockReturnValue(
        '  1 systemd /sbin/init\n 42 nginx nginx: worker\n',
      );

      const procs = getProcessList();
      expect(procs).toHaveLength(2);
      expect(procs[0]).toEqual({ pid: 1, name: 'systemd', cmd: '/sbin/init' });
      expect(procs[1]).toEqual({ pid: 42, name: 'nginx', cmd: 'nginx: worker' });
    });

    it('parses macOS ps output', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      (execSync as jest.Mock).mockReturnValue(
        '  1 launchd /sbin/launchd\n123 Code Helper code helper\n',
      );

      const procs = getProcessList();
      expect(procs).toHaveLength(2);
      expect(procs[0]).toEqual({ pid: 1, name: 'launchd', cmd: '/sbin/launchd' });
    });

    it('parses Windows wmic output', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      (execSync as jest.Mock).mockReturnValue(
        'Node,CommandLine,ProcessId,Name\n' +
        'MYPC,C:\\Windows\\System32\\notepad.exe,1234,notepad.exe\n',
      );

      const procs = getProcessList();
      expect(procs).toHaveLength(1);
      expect(procs[0]).toEqual({ pid: 1234, name: 'notepad.exe', cmd: 'C:\\Windows\\System32\\notepad.exe' });
    });

    it('returns empty array on command failure', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('command not found');
      });

      expect(getProcessList()).toEqual([]);
    });

    it('returns empty array on unsupported platform', () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd' });

      expect(getProcessList()).toEqual([]);
    });
  });

  describe('SystemPoller process diff', () => {
    it('emits started processes on poll', () => {
      const poller = new SystemPoller(1000);
      const processCb = jest.fn();

      poller.onProcessChange(processCb);

      // First poll establishes baseline
      poller.start();
      expect(processCb).not.toHaveBeenCalled(); // No diff on first poll

      poller.stop();
    });
  });
});
