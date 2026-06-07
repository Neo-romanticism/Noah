import { getHungerPersonality, applyHungerPersonality } from '../../../src/main/emotion/hunger-personality.js';
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

describe('getHungerPersonality', () => {
  it('should return normal modifiers when hunger < 50', () => {
    const result = getHungerPersonality(30);
    expect(result.affectionGainMultiplier).toBe(1.0);
    expect(result.affectionLossMultiplier).toBe(1.0);
    expect(result.traumaMultiplier).toBe(1.0);
    expect(result.patienceLabel).toBe('normal');
  });

  it('should return peckish when hunger >= 50', () => {
    const result = getHungerPersonality(50);
    expect(result.affectionGainMultiplier).toBe(0.75);
    expect(result.affectionLossMultiplier).toBe(1.3);
    expect(result.traumaMultiplier).toBe(1.2);
    expect(result.patienceLabel).toBe('peckish');
  });

  it('should return irritable when hunger >= 70', () => {
    const result = getHungerPersonality(70);
    expect(result.affectionGainMultiplier).toBe(0.5);
    expect(result.affectionLossMultiplier).toBe(1.8);
    expect(result.traumaMultiplier).toBe(1.5);
    expect(result.patienceLabel).toBe('irritable');
  });

  it('should return extremely_irritable when hunger >= 90', () => {
    const result = getHungerPersonality(90);
    expect(result.affectionGainMultiplier).toBe(0.3);
    expect(result.affectionLossMultiplier).toBe(2.5);
    expect(result.traumaMultiplier).toBe(2.0);
    expect(result.patienceLabel).toBe('extremely_irritable');
  });

  it('should handle edge case at hunger 100', () => {
    const result = getHungerPersonality(100);
    expect(result.patienceLabel).toBe('extremely_irritable');
    expect(result.affectionGainMultiplier).toBe(0.3);
  });
});

describe('applyHungerPersonality', () => {
  it('should reduce affection gains when hungry', () => {
    const state = makeState({ hunger: 70 });
    const delta = { affection: 10 };
    const result = applyHungerPersonality(state, 'pet', delta);
    expect(result.affection).toBe(5); // 10 * 0.5 = 5
  });

  it('should amplify affection losses when hungry', () => {
    const state = makeState({ hunger: 70 });
    const delta = { affection: -10 };
    const result = applyHungerPersonality(state, 'click', delta);
    expect(result.affection).toBe(-18); // -10 * 1.8 = -18
  });

  it('should amplify trauma when hungry', () => {
    const state = makeState({ hunger: 70 });
    const delta = { trauma: 5 };
    const result = applyHungerPersonality(state, 'click', delta);
    expect(result.trauma).toBe(8); // 5 * 1.5 = 7.5, rounded to 8
  });

  it('should not modify non-emotional fields', () => {
    const state = makeState({ hunger: 70 });
    const delta = { hunger: -25, fatigue: 10 };
    const result = applyHungerPersonality(state, 'feed', delta);
    expect(result.hunger).toBe(-25);
    expect(result.fatigue).toBe(10);
  });

  it('should not modify values when not hungry', () => {
    const state = makeState({ hunger: 30 });
    const delta = { affection: 10, trauma: 5 };
    const result = applyHungerPersonality(state, 'pet', delta);
    expect(result.affection).toBe(10);
    expect(result.trauma).toBe(5);
  });
});