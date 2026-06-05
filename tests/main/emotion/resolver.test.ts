import { resolveEmotion } from '../../../src/main/emotion/resolver.js';
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

describe('resolveEmotion (main wrapper)', () => {
  it('should return traumatized for trauma >= 80', () => {
    const state = makeState({ trauma: 85 });
    expect(resolveEmotion(state)).toBe('traumatized');
  });

  it('should return scared for trauma >= 50', () => {
    const state = makeState({ trauma: 55 });
    expect(resolveEmotion(state)).toBe('scared');
  });

  it('should return hungry for hunger >= 80', () => {
    const state = makeState({ hunger: 85, fatigue: 30 });
    expect(resolveEmotion(state)).toBe('hungry');
  });

  it('should return tired for fatigue >= 80', () => {
    const state = makeState({ fatigue: 85, hunger: 30 });
    expect(resolveEmotion(state)).toBe('tired');
  });

  it('should return hostage for affection <= 10 and morality <= 10', () => {
    const state = makeState({ affection: 5, morality: 5 });
    expect(resolveEmotion(state)).toBe('hostage');
  });

  it('should return sad for affection <= 25', () => {
    const state = makeState({ affection: 15 });
    expect(resolveEmotion(state)).toBe('sad');
  });

  it('should return happy for high affection', () => {
    const state = makeState({ affection: 65 });
    expect(resolveEmotion(state)).toBe('happy');
  });

  it('should pass through from shared resolver', () => {
    const state = makeState({ affection: 90 });
    expect(resolveEmotion(state)).toBe('excited');
  });
});