import { OnlineNeedsDecay } from '../../../src/main/emotion/needs.js';
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

describe('OnlineNeedsDecay', () => {
  let decay: OnlineNeedsDecay;

  beforeEach(() => {
    decay = new OnlineNeedsDecay();
  });

  it('should increase hunger and fatigue over time', () => {
    const state = makeState({ hunger: 50, fatigue: 50 });
    // Fast-forward by using a high rate config
    const fastDecay = new OnlineNeedsDecay({
      hungerRate: 10,
      fatigueRate: 10,
      traumaDecayRate: 0,
    });
    // Manually set lastTick to simulate time passage
    (fastDecay as any).lastTick = Date.now() - 1000; // 1 second ago

    const result = fastDecay.tick(state, false);
    expect(result.hunger!).toBeGreaterThan(50);
    expect(result.fatigue!).toBeGreaterThan(50);
  });

  it('should decrease trauma slowly when trauma < 50', () => {
    const state = makeState({ trauma: 40, hunger: 50, fatigue: 20 });
    const fastDecay = new OnlineNeedsDecay({
      hungerRate: 0,
      fatigueRate: 0,
      traumaDecayRate: 10,
    });
    (fastDecay as any).lastTick = Date.now() - 1000;

    const result = fastDecay.tick(state, false);
    expect(result.trauma!).toBeLessThan(40);
  });

  it('should NOT decrease trauma when trauma >= 50 (trauma special rule)', () => {
    const state = makeState({ trauma: 50, hunger: 50, fatigue: 20 });
    const fastDecay = new OnlineNeedsDecay({
      hungerRate: 0,
      fatigueRate: 0,
      traumaDecayRate: 10,
    });
    (fastDecay as any).lastTick = Date.now() - 1000;

    const result = fastDecay.tick(state, false);
    expect(result.trauma).toBeUndefined();
  });

  it('should apply active multiplier when isActive is true', () => {
    const state = makeState({ hunger: 50, fatigue: 50, trauma: 0 });
    const fastDecay = new OnlineNeedsDecay({
      hungerRate: 10,
      fatigueRate: 10,
      traumaDecayRate: 0,
      activeHungerMultiplier: 2,
    });
    (fastDecay as any).lastTick = Date.now() - 1000;

    const active = fastDecay.tick(state, true);
    const inactive = fastDecay.tick(state, false);
    // Active should produce higher values
    expect(active.hunger!).toBeGreaterThanOrEqual(inactive.hunger!);
    expect(active.fatigue!).toBeGreaterThanOrEqual(inactive.fatigue!);
  });

  it('should apply trauma multiplier when trauma > 50', () => {
    const state = makeState({ hunger: 50, fatigue: 50, trauma: 60 });
    const fastDecay = new OnlineNeedsDecay({
      hungerRate: 10,
      fatigueRate: 10,
      traumaDecayRate: 0,
      traumaHungerMultiplier: 3,
    });
    (fastDecay as any).lastTick = Date.now() - 1000;

    const highTrauma = fastDecay.tick(state, false);
    const lowTrauma = fastDecay.tick(makeState({ hunger: 50, fatigue: 50, trauma: 10 }), false);
    expect(highTrauma.hunger!).toBeGreaterThan(lowTrauma.hunger!);
    expect(highTrauma.fatigue!).toBeGreaterThan(lowTrauma.fatigue!);
  });

  it('should clamp stats', () => {
    const state = makeState({ hunger: 99, fatigue: 50, trauma: 1 });
    const fastDecay = new OnlineNeedsDecay({
      hungerRate: 100,
      fatigueRate: 100,
      traumaDecayRate: 100,
    });
    (fastDecay as any).lastTick = Date.now() - 1000;

    const result = fastDecay.tick(state, false);
    expect(result.hunger).toBeLessThanOrEqual(100);
    expect(result.fatigue).toBeLessThanOrEqual(100);
    expect(result.trauma).toBeGreaterThanOrEqual(0);
  });

  it('should reset timer', () => {
    const state = makeState({ hunger: 50 });
    const before = decay.tick(state, false);
    // Without reset, small time passes
    decay.reset();
    const after = decay.tick(state, false);
    // Both should produce similar results since reset resets the timer
    expect(after.hunger).toBe(before.hunger);
  });
});