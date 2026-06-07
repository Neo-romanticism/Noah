import {
  checkIgnore,
  createIgnoreState,
  resetIgnoreState,
  IGNORE_LEVELS,
  IGNORE_THRESHOLDS,
} from '../../../src/main/emotion/ignore-detection.js';
import type { NoahState } from '../../../src/shared/types/index.js';

function makeState(overrides: Partial<NoahState> = {}): NoahState {
  return {
    emotion: 'happy',
    affection: 50,
    morality: 50,
    hunger: 30,
    fatigue: 20,
    trauma: 0,
    level: 1,
    xp: 0,
    lastSeen: Date.now(),
    sessionStart: Date.now(),
    totalOnlineTime: 0,
    totalOfflineTime: 0,
    isSleeping: false,
    discomfortCount: 0,
    systemLoad: 0,
    systemWeather: 'sunny',
    version: 1,
    ...overrides,
  };
}

describe('createIgnoreState', () => {
  it('should create a fresh ignore state with zero triggered level', () => {
    const state = createIgnoreState();
    expect(state.triggeredLevel).toBe(0);
    expect(state.ignoreStart).toBeGreaterThan(0);
  });
});

describe('resetIgnoreState', () => {
  it('should reset triggered level to 0', () => {
    const state = { ignoreStart: Date.now(), lastActionTime: Date.now(), triggeredLevel: 4 };
    const reset = resetIgnoreState();
    expect(reset.triggeredLevel).toBe(0);
  });
});

describe('checkIgnore', () => {
  const now = Date.now();

  it('should trigger attention prompt at 1 minute', () => {
    const state = makeState({ affection: 50 });
    const ignoreState = {
      ignoreStart: now - 61_000, // 61 seconds ago
      lastActionTime: now - 61_000,
      triggeredLevel: 0,
    };
    const result = checkIgnore(state, ignoreState);
    expect(result.action).not.toBeNull();
    expect(result.action!.severity).toBe(IGNORE_LEVELS.ATTENTION);
  });

  it('should trigger neglect at 5 minutes', () => {
    const state = makeState({ affection: 50 });
    const ignoreState = {
      ignoreStart: now - 301_000, // 5 min 1 sec ago
      lastActionTime: now - 301_000,
      triggeredLevel: 0,
    };
    const result = checkIgnore(state, ignoreState);
    expect(result.action).not.toBeNull();
    expect(result.action!.severity).toBe(IGNORE_LEVELS.NEGLECT);
  });

  it('should trigger hurt at 15 minutes', () => {
    const state = makeState({ affection: 50 });
    const ignoreState = {
      ignoreStart: now - 901_000, // 15 min 1 sec ago
      lastActionTime: now - 901_000,
      triggeredLevel: 0,
    };
    const result = checkIgnore(state, ignoreState);
    expect(result.action).not.toBeNull();
    expect(result.action!.severity).toBe(IGNORE_LEVELS.HURT);
    // Should decrease affection
    expect(result.stateModifiers.affection).toBeLessThan(50);
  });

  it('should not trigger if level already triggered', () => {
    const state = makeState({ affection: 50 });
    const ignoreState = {
      ignoreStart: now - 61_000,
      lastActionTime: now - 61_000,
      triggeredLevel: IGNORE_LEVELS.ATTENTION, // Already triggered
    };
    const result = checkIgnore(state, ignoreState);
    expect(result.action).toBeNull();
  });

  it('should trigger abandonment at 1 hour', () => {
    const state = makeState({ affection: 50, trauma: 0 });
    const ignoreState = {
      ignoreStart: now - 3601_000, // 1 hour 1 sec ago
      lastActionTime: now - 3601_000,
      triggeredLevel: 0, // Start fresh so it goes through all levels
    };
    // First trigger all previous levels
    checkIgnore(state, ignoreState); // attention
    checkIgnore(state, ignoreState); // neglect
    checkIgnore(state, ignoreState); // hurt
    // Now ignoreState.triggeredLevel should be HURT (3)
    ignoreState.triggeredLevel = IGNORE_LEVELS.HURT;

    const result = checkIgnore(state, ignoreState);
    expect(result.action).not.toBeNull();
    expect(result.action!.severity).toBe(IGNORE_LEVELS.ABANDONMENT);
  });
});