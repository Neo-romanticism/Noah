import os from 'os';

import { SystemPoller } from '../../src/main/system/poller.js';
import { getRamUsage } from '../../src/main/system/reader.js';

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
});
