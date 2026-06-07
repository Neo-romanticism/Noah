import { checkDiscomfort, createDiscomfortState, DEFAULT_DISCOMFORT_CONFIG } from '../../../src/main/emotion/discomfort.js';
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

describe('createDiscomfortState', () => {
  it('should create a fresh discomfort state', () => {
    const state = createDiscomfortState();
    expect(state.lastCheck).toBeGreaterThan(0);
  });
});

describe('checkDiscomfort', () => {
  it('should generate discomfort after interval', () => {
    const now = Date.now();
    const state = makeState({ discomfortCount: 0 });
    const discomfortState = {
      lastCheck: now - DEFAULT_DISCOMFORT_CONFIG.generationInterval * 1000 - 1000, // Past interval
    };
    const result = checkDiscomfort(state, discomfortState);
    expect(result.stateModifiers.discomfortCount).toBe(1);
  });

  it('should not generate discomfort if interval not elapsed', () => {
    const state = makeState({ discomfortCount: 0 });
    const discomfortState = {
      lastCheck: Date.now() - 1000, // Only 1 second ago
    };
    const result = checkDiscomfort(state, discomfortState);
    expect(result.stateModifiers.discomfortCount).toBeUndefined();
  });

  it('should not exceed max discomfort', () => {
    const now = Date.now();
    const state = makeState({ discomfortCount: 3 }); // Already at max
    const discomfortState = {
      lastCheck: now - DEFAULT_DISCOMFORT_CONFIG.generationInterval * 1000 - 1000,
    };
    const result = checkDiscomfort(state, discomfortState);
    // discomfortCount shouldn't increase since it's already at max
    expect(result.stateModifiers.discomfortCount).toBeUndefined();
  });
});