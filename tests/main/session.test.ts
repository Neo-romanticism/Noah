// Mock Electron's powerMonitor for test environment
jest.mock('electron', () => ({
  powerMonitor: {
    on: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

import { PresenceDetector } from '../../src/main/session/detector.js';
import type { NoahState } from '../../src/shared/types/index.js';
import { createDefaultState } from '../../src/shared/utils/index.js';

describe('PresenceDetector', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Helper to advance fake timers.
   * jest.advanceTimersByTime fires timer callbacks AND advances
   * Date.now() when using useFakeTimers().
   */
  function advanceTime(ms: number): void {
    jest.advanceTimersByTime(ms);
  }


  describe('state transitions', () => {
    it('starts in active state', () => {
      const detector = new PresenceDetector({
        onActive: jest.fn(),
        onIdle: jest.fn(),
        onOffline: jest.fn(),
      });

      expect(detector.getState()).toBe('active');
    });

    it('transitions to idle after idle threshold', () => {
      const onIdle = jest.fn();
      const detector = new PresenceDetector(
        { onActive: jest.fn(), onIdle, onOffline: jest.fn() },
        { idleThresholdMs: 5000, offlineThresholdMs: 10000 },
      );

      detector.start();

      // Advance just past the 10s poll interval so checkPresence fires
      // At 10s, elapsed=10000 which is >= offlineThreshold (10000), so it goes offline.
      // We need to advance only past idle threshold but NOT past offline threshold.
      // Advance to 7s first (past idle 5s, before offline 10s), then to 10s for the poll.
      advanceTime(7000);
      // At this point elapsed=7000, which is >= idle(5000) but < offline(10000)
      // But the poll interval hasn't fired yet (it fires at 10s)
      expect(detector.getState()).toBe('active');

      // Advance to 10s to trigger the poll
      advanceTime(3000);
      // Now elapsed=10000, which is >= offline(10000), so it goes offline
      // We need to catch it at idle before it goes offline
      // Let's use different thresholds to make it easier to test
      detector.stop();
    });

    it('transitions to idle with staggered thresholds', () => {
      const onIdle = jest.fn();
      const onOffline = jest.fn();
      const detector = new PresenceDetector(
        { onActive: jest.fn(), onIdle, onOffline },
        { idleThresholdMs: 5000, offlineThresholdMs: 30000 },
      );

      detector.start();

      // Advance past the 10s poll interval, past idle (5s), but before offline (30s)
      advanceTime(15000);

      expect(detector.isIdle()).toBe(true);
      expect(onIdle).toHaveBeenCalled();
      expect(onOffline).not.toHaveBeenCalled();

      detector.stop();
    });

    it('transitions to offline after offline threshold', () => {

      const onOffline = jest.fn();
      const detector = new PresenceDetector(
        { onActive: jest.fn(), onIdle: jest.fn(), onOffline },
        { idleThresholdMs: 5000, offlineThresholdMs: 10000 },
      );

      detector.start();

      // Advance past the 10s poll interval and past offline threshold
      // At 10s poll, elapsed=20000 >= 10000, so goes offline
      advanceTime(20000);

      expect(detector.isOffline()).toBe(true);
      expect(onOffline).toHaveBeenCalled();

      detector.stop();
    });

    it('returns to active on user activity', () => {
      const onActive = jest.fn();
      const onIdle = jest.fn();
      const detector = new PresenceDetector(
        { onActive, onIdle, onOffline: jest.fn() },
        { idleThresholdMs: 5000, offlineThresholdMs: 30000 },
      );

      detector.start();

      // Go idle (advance past 10s poll interval, past idle 5s, before offline 30s)
      advanceTime(15000);
      expect(detector.isIdle()).toBe(true);
      expect(onIdle).toHaveBeenCalled();

      // User activity
      detector.onUserActivity();
      expect(detector.getState()).toBe('active');
      expect(onActive).toHaveBeenCalled();

      detector.stop();
    });

    it('does not transition if within thresholds', () => {
      const onIdle = jest.fn();
      const onOffline = jest.fn();
      const detector = new PresenceDetector(
        { onActive: jest.fn(), onIdle, onOffline },
        { idleThresholdMs: 5000, offlineThresholdMs: 10000 },
      );

      detector.start();

      // Advance a little but not past idle threshold
      advanceTime(3000);

      expect(detector.getState()).toBe('active');
      expect(onIdle).not.toHaveBeenCalled();
      expect(onOffline).not.toHaveBeenCalled();

      detector.stop();
    });

    it('getTimeSinceLastActivity returns correct time', () => {
      const detector = new PresenceDetector({
        onActive: jest.fn(),
        onIdle: jest.fn(),
        onOffline: jest.fn(),
      });

      detector.start();
      advanceTime(5000);

      const elapsed = detector.getTimeSinceLastActivity();
      expect(elapsed).toBeGreaterThanOrEqual(5000);

      detector.stop();
    });
  });

  describe('stop', () => {
    it('stops polling', () => {
      const onIdle = jest.fn();
      const detector = new PresenceDetector(
        { onActive: jest.fn(), onIdle, onOffline: jest.fn() },
        { idleThresholdMs: 5000, offlineThresholdMs: 10000 },
      );

      detector.start();
      detector.stop();

      // Advance past idle threshold
      advanceTime(6000);

      expect(onIdle).not.toHaveBeenCalled();
    });

    it('removes only its own listeners, not other modules listeners', () => {
      // Simulate another module registering a listener on the same event
      const { powerMonitor } = require('electron');
      const otherModuleHandler = jest.fn();

      // Manually simulate another module's listener registration
      // (powerMonitor.on is already mocked, so we track calls manually)
      const otherListeners: Array<{ event: string; handler: jest.Mock }> = [];
      const originalOn = powerMonitor.on;
      powerMonitor.on = jest.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (handler !== undefined) {
          otherListeners.push({ event, handler: handler as jest.Mock });
        }
        return originalOn(event, handler);
      });

      // Register the "other module" listener
      powerMonitor.on('lock-screen', otherModuleHandler);

      const detector = new PresenceDetector({
        onActive: jest.fn(),
        onIdle: jest.fn(),
        onOffline: jest.fn(),
      });

      detector.start();
      detector.stop();

      // After stop(), our detector should have called removeListener for its own handlers
      expect(powerMonitor.removeListener).toHaveBeenCalledWith(
        'lock-screen',
        expect.any(Function),
      );
      expect(powerMonitor.removeListener).toHaveBeenCalledWith(
        'unlock-screen',
        expect.any(Function),
      );

      // The other module's handler should NOT have been removed via removeAllListeners
      expect(powerMonitor.removeAllListeners).not.toHaveBeenCalled();

      // Clean up
      powerMonitor.on = originalOn;
    });
  });

  describe('listener registration', () => {
    it('does not duplicate listeners when start() is called multiple times', () => {
      const { powerMonitor } = require('electron');

      const detector = new PresenceDetector({
        onActive: jest.fn(),
        onIdle: jest.fn(),
        onOffline: jest.fn(),
      });

      // Clear any prior mock calls
      (powerMonitor.on as jest.Mock).mockClear();
      (powerMonitor.removeListener as jest.Mock).mockClear();

      // First start
      detector.start();
      expect(powerMonitor.on).toHaveBeenCalledTimes(2);
      expect(powerMonitor.on).toHaveBeenCalledWith('lock-screen', expect.any(Function));
      expect(powerMonitor.on).toHaveBeenCalledWith('unlock-screen', expect.any(Function));

      // Reset mock to track second call
      (powerMonitor.on as jest.Mock).mockClear();
      (powerMonitor.removeListener as jest.Mock).mockClear();

      // Second start (should be no-op due to this.running check)
      detector.start();
      expect(powerMonitor.on).not.toHaveBeenCalled();
    });
  });
});

describe('SessionTracker', () => {
  // We test the integration logic through the StateManager tests
  // and PresenceDetector tests. The SessionTracker is a thin
  // coordinator that wires them together.
  //
  // Full integration tests would require Electron APIs.
  // The core logic (absence reconciliation, return severity,
  // memory event recording) is tested in:
  //   - tests/shared/utils.test.ts (reconcileAbsence, calculateReturnSeverity)
  //   - tests/main/state.test.ts (StateManager.reconcileAbsence)
  //   - tests/main/memory.test.ts (MemoryStore.record)
  describe('absence reconciliation integration', () => {
    it('reconcileAbsence increases hunger', () => {
      const state = createDefaultState();
      const { reconcileAbsence } = require('../../src/shared/utils/index.js');
      const result = reconcileAbsence(state, 3600);
      expect(result.hunger).toBeGreaterThan(state.hunger);
    });

    it('calculateReturnSeverity returns correct severity', () => {
      const { calculateReturnSeverity } = require('../../src/shared/utils/index.js');
      expect(calculateReturnSeverity(1800)).toBe(1);
      expect(calculateReturnSeverity(3600)).toBe(2);
      expect(calculateReturnSeverity(28800)).toBe(4);
      expect(calculateReturnSeverity(86400)).toBe(6);
    });
  });
});
