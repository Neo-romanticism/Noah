import { applyInteraction } from '../../../src/main/emotion/interaction-effects.js';
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

describe('applyInteraction', () => {
  it('should increase affection on pet', () => {
    const state = makeState({ affection: 50 });
    const result = applyInteraction(state, 'pet', {});
    expect(result.affection).toBe(53); // 50 + PET_AFFECTION_GAIN (3)
  });

  it('should decrease hunger on feed', () => {
    const state = makeState({ hunger: 50 });
    const result = applyInteraction(state, 'feed', {});
    expect(result.hunger).toBe(25); // 50 - 25
  });

  it('should increase affection and fatigue on play', () => {
    const state = makeState({ affection: 50, fatigue: 20 });
    const result = applyInteraction(state, 'play', {});
    expect(result.affection).toBe(52); // +2
    expect(result.fatigue).toBe(30); // +10
  });

  it('should decrease affection and increase trauma on click', () => {
    const state = makeState({ affection: 50, trauma: 0 });
    const result = applyInteraction(state, 'click', {});
    expect(result.affection).toBe(40); // -10
    expect(result.trauma).toBe(5); // +5
    expect(result.morality).toBe(45); // -5
  });

  it('should increase affection and decrease trauma on clean', () => {
    const state = makeState({ affection: 50, trauma: 10 });
    const result = applyInteraction(state, 'clean', {});
    expect(result.affection).toBe(55); // +5
    expect(result.trauma).toBe(8); // -2
    expect(result.morality).toBe(53); // +3
  });

  describe('throw velocity', () => {
    it('should be gentle throw when velocity <= 5', () => {
      const state = makeState({ affection: 50, trauma: 0, fatigue: 20 });
      const result = applyInteraction(state, 'throw', { velocity: 3 });
      expect(result.affection).toBe(52); // 50 + 2
      expect(result.trauma).toBe(0); // no trauma
      expect(result.fatigue).toBe(22); // 20 + 2
    });

    it('should be hard throw when velocity > 5', () => {
      const state = makeState({ affection: 50, trauma: 10, fatigue: 20 });
      const result = applyInteraction(state, 'throw', { velocity: 8 });
      expect(result.affection).toBe(45); // 50 - 5
      expect(result.trauma).toBe(15); // 10 + 5
      expect(result.fatigue).toBe(28); // 20 + 8
    });
  });

  it('should handle drag interaction', () => {
    const state = makeState({ affection: 50, fatigue: 20 });
    const result = applyInteraction(state, 'drag', {});
    expect(result.affection).toBe(51); // +1
    expect(result.fatigue).toBe(22); // +2
  });

  it('should return empty for sleep', () => {
    const state = makeState();
    const result = applyInteraction(state, 'sleep', {});
    expect(Object.keys(result).length).toBe(0);
  });

  it('should clamp affection to 0-100', () => {
    const state = makeState({ affection: 5 });
    const result = applyInteraction(state, 'click', {});
    expect(result.affection).toBe(0); // clamped
  });
});