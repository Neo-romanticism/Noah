import { CooldownManager, DEFAULT_COOLDOWNS } from '../../../src/main/emotion/cooldowns.js';

describe('CooldownManager', () => {
  let cooldowns: CooldownManager;

  beforeEach(() => {
    cooldowns = new CooldownManager();
  });

  it('should allow execution when no cooldown exists', () => {
    expect(cooldowns.canExecute('pet')).toBe(true);
    expect(cooldowns.canExecute('throw')).toBe(true);
    expect(cooldowns.canExecute('feed')).toBe(true);
  });

  it('should block execution immediately after recording', () => {
    cooldowns.record('pet');
    expect(cooldowns.canExecute('pet')).toBe(false);
  });

  it('should allow execution after cooldown expires', () => {
    const instant = new CooldownManager({ pet: 0 });
    instant.record('pet');
    expect(instant.canExecute('pet')).toBe(true);
  });

  it('should track different interaction types independently', () => {
    cooldowns.record('pet');
    expect(cooldowns.canExecute('pet')).toBe(false);
    expect(cooldowns.canExecute('throw')).toBe(true);
    expect(cooldowns.canExecute('click')).toBe(true);
  });

  it('should reset all cooldowns', () => {
    cooldowns.record('pet');
    cooldowns.record('throw');
    cooldowns.record('click');
    cooldowns.reset();
    expect(cooldowns.canExecute('pet')).toBe(true);
    expect(cooldowns.canExecute('throw')).toBe(true);
    expect(cooldowns.canExecute('click')).toBe(true);
  });

  it('should use default config values', () => {
    expect(DEFAULT_COOLDOWNS.pet).toBe(3);
    expect(DEFAULT_COOLDOWNS.throw).toBe(2);
    expect(DEFAULT_COOLDOWNS.feed).toBe(300);
    expect(DEFAULT_COOLDOWNS.play).toBe(600);
    expect(DEFAULT_COOLDOWNS.drag).toBe(0.5);
  });

  it('should allow custom config overrides', () => {
    const custom = new CooldownManager({ pet: 10, throw: 5 });
    custom.record('pet');
    custom.record('throw');
    expect(custom.canExecute('pet')).toBe(false);
    expect(custom.canExecute('throw')).toBe(false);
  });
});