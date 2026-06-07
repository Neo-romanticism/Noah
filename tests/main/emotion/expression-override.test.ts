import { evaluateOverride, applyOverride, hasOverride } from '../../../src/main/emotion/expression-override.js';
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

describe('evaluateOverride', () => {
  it('should return null for normal state', () => {
    const state = makeState({ trauma: 30, affection: 50 });
    const result = evaluateOverride(state);
    expect(result).toBeNull();
  });

  it('should return trauma mask when trauma >= 80 and affection >= 40', () => {
    const state = makeState({ trauma: 85, affection: 50 });
    const result = evaluateOverride(state);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('trauma_mask');
    expect(result!.displayEmotion).toBe('happy');
  });

  it('should return submission when trauma >= 60 and affection <= 15', () => {
    const state = makeState({ trauma: 65, affection: 10 });
    const result = evaluateOverride(state);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('submission');
    expect(result!.displayEmotion).toBe('submissive');
  });

  it('should not return submission when affection is > 15', () => {
    const state = makeState({ trauma: 65, affection: 30 });
    const result = evaluateOverride(state);
    expect(result).toBeNull();
  });

  it('should not return trauma mask when affection < 40', () => {
    const state = makeState({ trauma: 85, affection: 20 });
    const result = evaluateOverride(state);
    expect(result).toBeNull();
  });
});

describe('applyOverride', () => {
  it('should return true emotion when no override', () => {
    const result = applyOverride('sad', null);
    expect(result).toBe('sad');
  });

  it('should return displayed emotion when override active', () => {
    const override = { displayEmotion: 'happy' as any, expiresAt: Date.now() + 60_000, reason: 'trauma_mask' as any, strength: 1.0 };
    const result = applyOverride('traumatized', override);
    expect(result).toBe('happy');
  });

  it('should return true emotion when override expired', () => {
    const override = { displayEmotion: 'happy' as any, expiresAt: Date.now() - 1000, reason: 'trauma_mask' as any, strength: 1.0 };
    const result = applyOverride('traumatized', override);
    expect(result).toBe('traumatized');
  });
});

describe('hasOverride', () => {
  it('should return false for null', () => {
    expect(hasOverride(null)).toBe(false);
  });

  it('should return false for expired override', () => {
    const override = { displayEmotion: 'happy' as any, expiresAt: Date.now() - 1000, reason: 'trauma_mask' as any, strength: 1.0 };
    expect(hasOverride(override)).toBe(false);
  });

  it('should return true for valid override', () => {
    const override = { displayEmotion: 'happy' as any, expiresAt: Date.now() + 60_000, reason: 'trauma_mask' as any, strength: 1.0 };
    expect(hasOverride(override)).toBe(true);
  });
});