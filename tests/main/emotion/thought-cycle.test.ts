import { ThoughtCycle } from '../../../src/main/emotion/thought-cycle.js';
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

describe('ThoughtCycle', () => {
  let cycle: ThoughtCycle;

  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
    cycle = new ThoughtCycle({ intervalMs: 100, minIntervalMs: 50, maxIntervalMs: 1000 });
  });

  afterEach(() => {
    cycle.stop();
    jest.useRealTimers();
  });

  it('should generate thoughts periodically', () => {
    const onThink = jest.fn();
    const onAction = jest.fn();

    cycle.start(makeState({ fatigue: 10, trauma: 0 }), { onThink, onAction });
    jest.advanceTimersByTime(200);
    expect(onThink).toHaveBeenCalled();
    expect(onThink.mock.calls[0][0]).toHaveProperty('emotion');
    expect(onThink.mock.calls[0][0]).toHaveProperty('dominantNeed');
    expect(onThink.mock.calls[0][0]).toHaveProperty('text');
  });

  it('should generate "hunger" dominant need when hunger > 70', () => {
    const onThink = jest.fn();
    const onAction = jest.fn();
    const state = makeState({ hunger: 80, fatigue: 10, trauma: 0 });

    cycle.start(state, { onThink, onAction });
    jest.advanceTimersByTime(200);

    const thought = onThink.mock.calls[0][0];
    expect(thought.dominantNeed).toBe('hunger');
    expect(thought.text).toBe('...배고파');
  });

  it('should generate "fatigue" dominant need when fatigue > 80', () => {
    const onThink = jest.fn();
    const onAction = jest.fn();
    const state = makeState({ hunger: 10, fatigue: 90, trauma: 0 });

    cycle.start(state, { onThink, onAction });
    jest.advanceTimersByTime(500);

    const thought = onThink.mock.calls[0][0];
    expect(thought.dominantNeed).toBe('fatigue');
    expect(thought.text).toBe('...졸려');
  });

  it('should generate "trauma" dominant need when trauma > 50', () => {
    // Mock Math.random to return 0 so trauma jitter is 0
    const origRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0);
    
    const onThink = jest.fn();
    const onAction = jest.fn();
    const state = makeState({ hunger: 10, fatigue: 10, trauma: 60 });

    cycle.start(state, { onThink, onAction });
    jest.advanceTimersByTime(200);

    Math.random = origRandom;

    const thought = onThink.mock.calls[0][0];
    expect(thought.dominantNeed).toBe('trauma');
    expect(thought.text).toBe('...무서워');
  });

  it('should generate "affection" dominant need when affection < 20', () => {
    const onThink = jest.fn();
    const onAction = jest.fn();
    const state = makeState({ hunger: 10, fatigue: 10, trauma: 0, affection: 10 });

    cycle.start(state, { onThink, onAction });
    jest.advanceTimersByTime(200);

    const thought = onThink.mock.calls[0][0];
    expect(thought.dominantNeed).toBe('affection');
    expect(thought.text).toBe('...외로워');
  });

  it('should stop when stop() is called', () => {
    const onThink = jest.fn();
    cycle.start(makeState(), { onThink, onAction: jest.fn() });
    cycle.stop();
    jest.advanceTimersByTime(500);
    expect(onThink).not.toHaveBeenCalled();
  });

  it('should calculate interval based on fatigue', () => {
    // High fatigue should produce longer intervals
    const state = makeState({ fatigue: 80 });
    // interval = 100 * (1 + 80/100) = 180, plus potential trauma jitter (0)
    const interval = (cycle as any).calculateInterval(state);
    expect(interval).toBeGreaterThanOrEqual(180);
    expect(interval).toBeLessThanOrEqual(30000);
  });
});