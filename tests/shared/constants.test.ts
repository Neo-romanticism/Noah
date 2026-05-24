import {
  STAT_MIN,
  STAT_MAX,
  DEFAULT_AFFECTION,
  DEFAULT_MORALITY,
  DEFAULT_HUNGER,
  DEFAULT_FATIGUE,
  DEFAULT_TRAUMA,
  DEFAULT_LEVEL,
  DEFAULT_XP,
  DEFAULT_IS_SLEEPING,
  DEFAULT_DISCOMFORT_COUNT,
  STATE_VERSION,
  HUNGER_DECAY_RATE,
  FATIGUE_DECAY_RATE,
  AFFECTION_DECAY_RATE,
  TRAUMA_DECAY_RATE,
  ABSENCE_HUNGER_RATE,
  ABSENCE_FATIGUE_RATE,
  ABSENCE_AFFECTION_DECAY_RATE,
  ABSENCE_AFFECTION_DECAY_THRESHOLD,
  PET_AFFECTION_GAIN,
  FEED_HUNGER_REDUCTION,
  SLEEP_FATIGUE_REDUCTION,
  PLAY_AFFECTION_GAIN,
  PLAY_FATIGUE_COST,
  SAVE_DEBOUNCE_MS,
  CHECKPOINT_INTERVAL_MS,
  SAVE_FILENAME,
  MEMORY_FILENAME,
  MAX_BACKUP_COUNT,
  SESSION_IDLE_THRESHOLD_MS,
  SESSION_OFFLINE_THRESHOLD_MS,
  XP_PER_LEVEL,
  XP_INTERACTION_BASE,
  XP_FEED_BONUS,
  AFFECTION_HOSTAGE,
  AFFECTION_SAD,
  AFFECTION_NEUTRAL,
  AFFECTION_HAPPY,
  AFFECTION_EXCITED,
  TRAUMA_MILD,
  TRAUMA_MODERATE,
  TRAUMA_SEVERE,
  MEMORY_MAX_EVENTS,
  MEMORY_DECAY_INITIAL,
  MEMORY_DECAY_RATE_POSITIVE,
  MEMORY_DECAY_RATE_NEUTRAL,
  MEMORY_DECAY_RATE_NEGATIVE,
  MEMORY_DECAY_RATE_TRAUMATIC,
  MEMORY_DECAY_FLOOR_POSITIVE,
  MEMORY_DECAY_FLOOR_NEUTRAL,
  MEMORY_DECAY_FLOOR_NEGATIVE,
  MEMORY_DECAY_FLOOR_TRAUMATIC,
  MEMORY_SEVERITY_TRAUMATIC,
  RETURN_SEVERITY_SHORT,
  RETURN_SEVERITY_MEDIUM,
  RETURN_SEVERITY_LONG,
  RETURN_SEVERITY_EXTENDED,
  RETURN_SEVERITY_THRESHOLD_MEDIUM,
  RETURN_SEVERITY_THRESHOLD_LONG,
  RETURN_SEVERITY_THRESHOLD_EXTENDED,
} from '../../src/shared/constants/index.js';

describe('shared/constants', () => {
  // ── Stat bounds ──────────────────────────────────────────
  describe('stat bounds', () => {
    it('STAT_MIN is 0', () => {
      expect(STAT_MIN).toBe(0);
    });

    it('STAT_MAX is 100', () => {
      expect(STAT_MAX).toBe(100);
    });
  });

  // ── Default state ────────────────────────────────────────
  describe('default state', () => {
    it('default affection is 50', () => {
      expect(DEFAULT_AFFECTION).toBe(50);
    });

    it('default morality is 50', () => {
      expect(DEFAULT_MORALITY).toBe(50);
    });

    it('default hunger is 30', () => {
      expect(DEFAULT_HUNGER).toBe(30);
    });

    it('default fatigue is 20', () => {
      expect(DEFAULT_FATIGUE).toBe(20);
    });

    it('default trauma is 0', () => {
      expect(DEFAULT_TRAUMA).toBe(0);
    });

    it('default level is 1', () => {
      expect(DEFAULT_LEVEL).toBe(1);
    });

    it('default XP is 0', () => {
      expect(DEFAULT_XP).toBe(0);
    });

    it('default isSleeping is false', () => {
      expect(DEFAULT_IS_SLEEPING).toBe(false);
    });

    it('default discomfortCount is 0', () => {
      expect(DEFAULT_DISCOMFORT_COUNT).toBe(0);
    });

    it('STATE_VERSION is 1', () => {
      expect(STATE_VERSION).toBe(1);
    });
  });

  // ── Decay rates ──────────────────────────────────────────
  describe('decay rates', () => {
    it('hunger decay rate is positive (hunger increases)', () => {
      expect(HUNGER_DECAY_RATE).toBeGreaterThan(0);
    });

    it('fatigue decay rate is positive (fatigue increases)', () => {
      expect(FATIGUE_DECAY_RATE).toBeGreaterThan(0);
    });

    it('affection decay rate is positive (affection decreases)', () => {
      expect(AFFECTION_DECAY_RATE).toBeGreaterThan(0);
    });

    it('trauma decay rate is positive (trauma decreases slowly)', () => {
      expect(TRAUMA_DECAY_RATE).toBeGreaterThan(0);
    });

    it('trauma decays slower than hunger rises', () => {
      expect(TRAUMA_DECAY_RATE).toBeLessThan(HUNGER_DECAY_RATE);
    });
  });

  // ── Absence decay rates ──────────────────────────────────
  describe('absence decay rates', () => {
    it('absence hunger rate is positive', () => {
      expect(ABSENCE_HUNGER_RATE).toBeGreaterThan(0);
    });

    it('absence fatigue rate is positive', () => {
      expect(ABSENCE_FATIGUE_RATE).toBeGreaterThan(0);
    });

    it('absence affection decay rate is positive', () => {
      expect(ABSENCE_AFFECTION_DECAY_RATE).toBeGreaterThan(0);
    });

    it('absence affection decay threshold is 1 hour', () => {
      expect(ABSENCE_AFFECTION_DECAY_THRESHOLD).toBe(3600);
    });
  });

  // ── Interaction effects ──────────────────────────────────
  describe('interaction effects', () => {
    it('petting gives a small affection boost', () => {
      expect(PET_AFFECTION_GAIN).toBeGreaterThan(0);
      expect(PET_AFFECTION_GAIN).toBeLessThan(10);
    });

    it('feeding reduces hunger significantly', () => {
      expect(FEED_HUNGER_REDUCTION).toBeGreaterThan(10);
    });

    it('sleep reduces fatigue significantly', () => {
      expect(SLEEP_FATIGUE_REDUCTION).toBeGreaterThan(20);
    });

    it('playing gives a small affection boost', () => {
      expect(PLAY_AFFECTION_GAIN).toBeGreaterThan(0);
    });

    it('playing costs fatigue', () => {
      expect(PLAY_FATIGUE_COST).toBeGreaterThan(0);
    });
  });

  // ── Persistence ──────────────────────────────────────────
  describe('persistence', () => {
    it('save debounce is a reasonable positive number', () => {
      expect(SAVE_DEBOUNCE_MS).toBeGreaterThan(0);
      expect(SAVE_DEBOUNCE_MS).toBeLessThan(10000);
    });

    it('checkpoint interval is longer than debounce', () => {
      expect(CHECKPOINT_INTERVAL_MS).toBeGreaterThan(SAVE_DEBOUNCE_MS);
    });

    it('save filename is a non-empty string', () => {
      expect(SAVE_FILENAME).toBeTruthy();
      expect(typeof SAVE_FILENAME).toBe('string');
    });

    it('memory filename is a non-empty string', () => {
      expect(MEMORY_FILENAME).toBeTruthy();
      expect(typeof MEMORY_FILENAME).toBe('string');
    });

    it('max backup count is a positive number', () => {
      expect(MAX_BACKUP_COUNT).toBeGreaterThan(0);
    });
  });

  // ── Session ──────────────────────────────────────────────
  describe('session', () => {
    it('idle threshold is a positive number', () => {
      expect(SESSION_IDLE_THRESHOLD_MS).toBeGreaterThan(0);
    });

    it('offline threshold is larger than idle threshold', () => {
      expect(SESSION_OFFLINE_THRESHOLD_MS).toBeGreaterThan(SESSION_IDLE_THRESHOLD_MS);
    });
  });

  // ── XP / Level ───────────────────────────────────────────
  describe('XP / Level', () => {
    it('XP per level is positive', () => {
      expect(XP_PER_LEVEL).toBeGreaterThan(0);
    });

    it('interaction XP is positive', () => {
      expect(XP_INTERACTION_BASE).toBeGreaterThan(0);
    });

    it('feed bonus XP is larger than base interaction XP', () => {
      expect(XP_FEED_BONUS).toBeGreaterThan(XP_INTERACTION_BASE);
    });
  });

  // ── Emotion thresholds ───────────────────────────────────
  describe('emotion thresholds', () => {
    it('thresholds are in ascending order', () => {
      expect(AFFECTION_HOSTAGE).toBeLessThan(AFFECTION_SAD);
      expect(AFFECTION_SAD).toBeLessThan(AFFECTION_NEUTRAL);
      expect(AFFECTION_NEUTRAL).toBeLessThan(AFFECTION_HAPPY);
      expect(AFFECTION_HAPPY).toBeLessThan(AFFECTION_EXCITED);
    });

    it('all thresholds are within [0, 100]', () => {
      const thresholds = [
        AFFECTION_HOSTAGE,
        AFFECTION_SAD,
        AFFECTION_NEUTRAL,
        AFFECTION_HAPPY,
        AFFECTION_EXCITED,
      ];
      for (const t of thresholds) {
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(100);
      }
    });
  });

  // ── Trauma thresholds ────────────────────────────────────
  describe('trauma thresholds', () => {
    it('thresholds are in ascending order', () => {
      expect(TRAUMA_MILD).toBeLessThan(TRAUMA_MODERATE);
      expect(TRAUMA_MODERATE).toBeLessThan(TRAUMA_SEVERE);
    });

    it('all thresholds are within [0, 100]', () => {
      expect(TRAUMA_MILD).toBeGreaterThanOrEqual(0);
      expect(TRAUMA_MODERATE).toBeLessThanOrEqual(100);
      expect(TRAUMA_SEVERE).toBeLessThanOrEqual(100);
    });
  });

  // ── Memory decay ─────────────────────────────────────────
  describe('memory decay', () => {
    it('MEMORY_MAX_EVENTS is positive', () => {
      expect(MEMORY_MAX_EVENTS).toBeGreaterThan(0);
    });

    it('MEMORY_DECAY_INITIAL is 1.0', () => {
      expect(MEMORY_DECAY_INITIAL).toBe(1.0);
    });

    it('decay rates are positive', () => {
      expect(MEMORY_DECAY_RATE_POSITIVE).toBeGreaterThan(0);
      expect(MEMORY_DECAY_RATE_NEUTRAL).toBeGreaterThan(0);
      expect(MEMORY_DECAY_RATE_NEGATIVE).toBeGreaterThan(0);
      expect(MEMORY_DECAY_RATE_TRAUMATIC).toBeGreaterThan(0);
    });

    it('traumatic decays slowest', () => {
      expect(MEMORY_DECAY_RATE_TRAUMATIC).toBeLessThan(MEMORY_DECAY_RATE_NEGATIVE);
      expect(MEMORY_DECAY_RATE_NEGATIVE).toBeLessThan(MEMORY_DECAY_RATE_POSITIVE);
    });

    it('decay floors are in [0, 1]', () => {
      expect(MEMORY_DECAY_FLOOR_POSITIVE).toBeGreaterThanOrEqual(0);
      expect(MEMORY_DECAY_FLOOR_POSITIVE).toBeLessThanOrEqual(1);
      expect(MEMORY_DECAY_FLOOR_NEUTRAL).toBeGreaterThanOrEqual(0);
      expect(MEMORY_DECAY_FLOOR_NEUTRAL).toBeLessThanOrEqual(1);
      expect(MEMORY_DECAY_FLOOR_NEGATIVE).toBeGreaterThanOrEqual(0);
      expect(MEMORY_DECAY_FLOOR_NEGATIVE).toBeLessThanOrEqual(1);
      expect(MEMORY_DECAY_FLOOR_TRAUMATIC).toBeGreaterThanOrEqual(0);
      expect(MEMORY_DECAY_FLOOR_TRAUMATIC).toBeLessThanOrEqual(1);
    });

    it('traumatic floor is highest', () => {
      expect(MEMORY_DECAY_FLOOR_TRAUMATIC).toBeGreaterThan(MEMORY_DECAY_FLOOR_NEGATIVE);
      expect(MEMORY_DECAY_FLOOR_NEGATIVE).toBeGreaterThan(MEMORY_DECAY_FLOOR_POSITIVE);
    });

    it('MEMORY_SEVERITY_TRAUMATIC is 7', () => {
      expect(MEMORY_SEVERITY_TRAUMATIC).toBe(7);
    });
  });

  // ── Return severity thresholds ───────────────────────────
  describe('return severity thresholds', () => {
    it('thresholds are in ascending order', () => {
      expect(RETURN_SEVERITY_THRESHOLD_MEDIUM).toBeLessThan(RETURN_SEVERITY_THRESHOLD_LONG);
      expect(RETURN_SEVERITY_THRESHOLD_LONG).toBeLessThan(RETURN_SEVERITY_THRESHOLD_EXTENDED);
    });

    it('severity values are in ascending order', () => {
      expect(RETURN_SEVERITY_SHORT).toBeLessThan(RETURN_SEVERITY_MEDIUM);
      expect(RETURN_SEVERITY_MEDIUM).toBeLessThan(RETURN_SEVERITY_LONG);
      expect(RETURN_SEVERITY_LONG).toBeLessThan(RETURN_SEVERITY_EXTENDED);
    });
  });
});
