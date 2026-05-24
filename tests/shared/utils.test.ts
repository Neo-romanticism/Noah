import {
  clampStat,
  clamp,
  createDefaultState,
  resolveEmotion,
  modifyStat,
  applyDecay,
  levelFromXp,
  xpForNextLevel,
  isValidState,
  isOffline,
  secondsSinceLastSeen,
  reconcileAbsence,
  calculateReturnSeverity,
} from '../../src/shared/utils/index.js';

describe('shared/utils', () => {
  // ── Clamping ─────────────────────────────────────────────
  describe('clampStat', () => {
    it('returns the value when within [0, 100]', () => {
      expect(clampStat(50)).toBe(50);
      expect(clampStat(0)).toBe(0);
      expect(clampStat(100)).toBe(100);
    });

    it('clamps values below 0 to 0', () => {
      expect(clampStat(-1)).toBe(0);
      expect(clampStat(-100)).toBe(0);
    });

    it('clamps values above 100 to 100', () => {
      expect(clampStat(101)).toBe(100);
      expect(clampStat(999)).toBe(100);
    });
  });

  describe('clamp', () => {
    it('clamps to custom bounds', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-1, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  // ── State factory ────────────────────────────────────────
  describe('createDefaultState', () => {
    it('returns a NoahState with default values', () => {
      const state = createDefaultState();

      expect(state.emotion).toBe('happy');
      expect(state.affection).toBe(50);
      expect(state.morality).toBe(50);
      expect(state.hunger).toBe(30);
      expect(state.fatigue).toBe(20);
      expect(state.trauma).toBe(0);
      expect(state.level).toBe(1);
      expect(state.xp).toBe(0);
      expect(state.isSleeping).toBe(false);
      expect(state.discomfortCount).toBe(0);
      expect(state.version).toBe(1);
      expect(state.totalOnlineTime).toBe(0);
      expect(state.totalOfflineTime).toBe(0);
    });

    it('sets lastSeen and sessionStart to a recent timestamp', () => {
      const state = createDefaultState();
      const now = Date.now();
      expect(state.lastSeen).toBeGreaterThanOrEqual(now - 100);
      expect(state.lastSeen).toBeLessThanOrEqual(now + 100);
      expect(state.sessionStart).toBeGreaterThanOrEqual(now - 100);
      expect(state.sessionStart).toBeLessThanOrEqual(now + 100);
    });
  });

  // ── Emotion resolution ───────────────────────────────────
  describe('resolveEmotion', () => {
    const base = {
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
      version: 1,
    };

    it('returns "traumatized" when trauma >= 80', () => {
      expect(resolveEmotion({ ...base, trauma: 80 })).toBe('traumatized');
      expect(resolveEmotion({ ...base, trauma: 95 })).toBe('traumatized');
    });

    it('returns "scared" when trauma >= 50 but < 80', () => {
      expect(resolveEmotion({ ...base, trauma: 50 })).toBe('scared');
      expect(resolveEmotion({ ...base, trauma: 65 })).toBe('scared');
    });

    it('returns "hungry" when hunger >= 80', () => {
      expect(resolveEmotion({ ...base, hunger: 80 })).toBe('hungry');
      expect(resolveEmotion({ ...base, hunger: 100 })).toBe('hungry');
    });

    it('returns "tired" when fatigue >= 80', () => {
      expect(resolveEmotion({ ...base, fatigue: 80 })).toBe('tired');
      expect(resolveEmotion({ ...base, fatigue: 100 })).toBe('tired');
    });

    it('returns "hostage" when affection <= 10', () => {
      expect(resolveEmotion({ ...base, affection: 0 })).toBe('hostage');
      expect(resolveEmotion({ ...base, affection: 10 })).toBe('hostage');
    });

    it('returns "sad" when affection <= 25', () => {
      expect(resolveEmotion({ ...base, affection: 11 })).toBe('sad');
      expect(resolveEmotion({ ...base, affection: 25 })).toBe('sad');
    });

    it('returns "bored" when affection <= 50', () => {
      expect(resolveEmotion({ ...base, affection: 26 })).toBe('bored');
      expect(resolveEmotion({ ...base, affection: 50 })).toBe('bored');
    });

    it('returns "happy" when affection <= 70', () => {
      expect(resolveEmotion({ ...base, affection: 51 })).toBe('happy');
      expect(resolveEmotion({ ...base, affection: 70 })).toBe('happy');
    });

    it('returns "excited" when affection <= 85', () => {
      expect(resolveEmotion({ ...base, affection: 71 })).toBe('excited');
      expect(resolveEmotion({ ...base, affection: 85 })).toBe('excited');
    });

    it('returns "happy" when affection > 85', () => {
      expect(resolveEmotion({ ...base, affection: 86 })).toBe('happy');
      expect(resolveEmotion({ ...base, affection: 100 })).toBe('happy');
    });

    it('gives trauma priority over hunger/fatigue', () => {
      expect(resolveEmotion({ ...base, trauma: 80, hunger: 90 })).toBe('traumatized');
    });

    it('gives hunger priority over affection', () => {
      expect(resolveEmotion({ ...base, hunger: 80, affection: 10 })).toBe('hungry');
    });
  });

  // ── Stat modifiers ───────────────────────────────────────
  describe('modifyStat', () => {
    it('adds a positive delta', () => {
      expect(modifyStat(50, 10)).toBe(60);
    });

    it('subtracts a negative delta', () => {
      expect(modifyStat(50, -10)).toBe(40);
    });

    it('clamps the result to [0, 100]', () => {
      expect(modifyStat(95, 10)).toBe(100);
      expect(modifyStat(5, -10)).toBe(0);
    });
  });

  describe('applyDecay', () => {
    it('moves current toward target (default 100)', () => {
      expect(applyDecay(50, 1)).toBe(51);
      expect(applyDecay(50, 5)).toBe(55);
    });

    it('does not exceed the target', () => {
      expect(applyDecay(99, 5)).toBe(100);
    });

    it('returns current if already at target', () => {
      expect(applyDecay(100, 5)).toBe(100);
    });

    it('moves toward a custom target', () => {
      expect(applyDecay(50, 5, 0)).toBe(45);
      expect(applyDecay(10, 5, 0)).toBe(5);
      expect(applyDecay(2, 5, 0)).toBe(0);
    });

    it('clamps the result', () => {
      expect(applyDecay(0, 5, 0)).toBe(0);
      expect(applyDecay(100, 5, 100)).toBe(100);
    });
  });

  // ── XP / Level ───────────────────────────────────────────
  describe('levelFromXp', () => {
    it('returns 1 for 0 XP', () => {
      expect(levelFromXp(0)).toBe(1);
    });

    it('returns 1 for XP < 100', () => {
      expect(levelFromXp(50)).toBe(1);
      expect(levelFromXp(99)).toBe(1);
    });

    it('returns 2 for XP >= 100', () => {
      expect(levelFromXp(100)).toBe(2);
      expect(levelFromXp(199)).toBe(2);
    });

    it('returns 3 for XP >= 200', () => {
      expect(levelFromXp(200)).toBe(3);
    });
  });

  describe('xpForNextLevel', () => {
    it('returns 100 for level 1', () => {
      expect(xpForNextLevel(1)).toBe(100);
    });

    it('returns 200 for level 2', () => {
      expect(xpForNextLevel(2)).toBe(200);
    });

    it('returns 500 for level 5', () => {
      expect(xpForNextLevel(5)).toBe(500);
    });
  });

  // ── Validation ───────────────────────────────────────────
  describe('isValidState', () => {
    it('returns true for an empty object', () => {
      expect(isValidState({})).toBe(true);
    });

    it('returns true for valid stat values', () => {
      expect(isValidState({ affection: 50, hunger: 30 })).toBe(true);
    });

    it('returns false for out-of-range affection', () => {
      expect(isValidState({ affection: -1 })).toBe(false);
      expect(isValidState({ affection: 101 })).toBe(false);
    });

    it('returns false for out-of-range trauma', () => {
      expect(isValidState({ trauma: -5 })).toBe(false);
      expect(isValidState({ trauma: 150 })).toBe(false);
    });

    it('returns false for negative XP', () => {
      expect(isValidState({ xp: -1 })).toBe(false);
    });

    it('returns false for level 0', () => {
      expect(isValidState({ level: 0 })).toBe(false);
    });

    it('returns true for valid level and XP', () => {
      expect(isValidState({ level: 5, xp: 400 })).toBe(true);
    });

    it('returns false for out-of-range discomfortCount', () => {
      expect(isValidState({ discomfortCount: -1 })).toBe(false);
      expect(isValidState({ discomfortCount: 4 })).toBe(false);
    });

    it('returns true for valid discomfortCount', () => {
      expect(isValidState({ discomfortCount: 0 })).toBe(true);
      expect(isValidState({ discomfortCount: 3 })).toBe(true);
    });

    it('returns false for version < 1', () => {
      expect(isValidState({ version: 0 })).toBe(false);
    });

    it('returns true for valid version', () => {
      expect(isValidState({ version: 1 })).toBe(true);
      expect(isValidState({ version: 2 })).toBe(true);
    });
  });

  // ── Time helpers ─────────────────────────────────────────
  describe('isOffline', () => {
    it('returns true when lastSeen is older than timeout', () => {
      const past = Date.now() - 600_000; // 10 min ago
      expect(isOffline(past, 300_000)).toBe(true); // 5 min timeout
    });

    it('returns false when lastSeen is within timeout', () => {
      const recent = Date.now() - 60_000; // 1 min ago
      expect(isOffline(recent, 300_000)).toBe(false); // 5 min timeout
    });
  });

  describe('secondsSinceLastSeen', () => {
    it('returns 0 for now', () => {
      expect(secondsSinceLastSeen(Date.now())).toBe(0);
    });

    it('returns ~60 for 1 minute ago', () => {
      const past = Date.now() - 60_000;
      const seconds = secondsSinceLastSeen(past);
      expect(seconds).toBeGreaterThanOrEqual(59);
      expect(seconds).toBeLessThanOrEqual(61);
    });
  });

  // ── Absence reconciliation ───────────────────────────────
  describe('reconcileAbsence', () => {
    const base = {
      emotion: 'happy' as const,
      affection: 50,
      morality: 50,
      hunger: 30,
      fatigue: 20,
      trauma: 0,
      level: 1,
      xp: 0,
      lastSeen: Date.now() - 3600_000, // 1 hour ago
      sessionStart: Date.now(),
      totalOnlineTime: 0,
      totalOfflineTime: 0,
      isSleeping: false,
      discomfortCount: 0,
      version: 1,
    };

    it('increases hunger during absence', () => {
      const result = reconcileAbsence(base, 3600); // 1 hour
      expect(result.hunger).toBeGreaterThan(base.hunger);
    });

    it('increases fatigue during absence when awake', () => {
      const result = reconcileAbsence(base, 3600);
      expect(result.fatigue).toBeGreaterThan(base.fatigue);
    });

    it('does not increase fatigue during absence when sleeping', () => {
      const result = reconcileAbsence({ ...base, isSleeping: true }, 3600);
      expect(result.fatigue).toBe(base.fatigue);
    });

    it('decays affection only after 1 hour threshold', () => {
      const shortAbsence = reconcileAbsence(base, 1800); // 30 min
      expect(shortAbsence.affection).toBe(base.affection);

      const longAbsence = reconcileAbsence(base, 7200); // 2 hours
      expect(longAbsence.affection).toBeLessThan(base.affection);
    });

    it('clamps hunger to 100', () => {
      const result = reconcileAbsence({ ...base, hunger: 99 }, 3600);
      expect(result.hunger).toBe(100);
    });

    it('clamps fatigue to 100', () => {
      const result = reconcileAbsence({ ...base, fatigue: 99 }, 3600);
      expect(result.fatigue).toBe(100);
    });

    it('preserves other state fields', () => {
      const result = reconcileAbsence(base, 3600);
      expect(result.morality).toBe(base.morality);
      expect(result.trauma).toBe(base.trauma);
      expect(result.level).toBe(base.level);
      expect(result.xp).toBe(base.xp);
      expect(result.version).toBe(base.version);
    });
  });

  // ── Return severity ──────────────────────────────────────
  describe('calculateReturnSeverity', () => {
    it('returns 1 for absence < 1 hour', () => {
      expect(calculateReturnSeverity(1800)).toBe(1);
    });

    it('returns 2 for absence between 1-8 hours', () => {
      expect(calculateReturnSeverity(3600)).toBe(2);
      expect(calculateReturnSeverity(28800 - 1)).toBe(2);
    });

    it('returns 4 for absence between 8-24 hours', () => {
      expect(calculateReturnSeverity(28800)).toBe(4);
      expect(calculateReturnSeverity(86400 - 1)).toBe(4);
    });

    it('returns 6 for absence >= 24 hours', () => {
      expect(calculateReturnSeverity(86400)).toBe(6);
      expect(calculateReturnSeverity(172800)).toBe(6);
    });
  });
});
