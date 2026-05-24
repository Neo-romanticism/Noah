/**
 * Game constants — timings, thresholds, and default values.
 *
 * All values are pure numbers so they can be used in both
 * main and renderer processes without side effects.
 */

// ── Stat bounds ──────────────────────────────────────────────
export const STAT_MIN = 0;
export const STAT_MAX = 100;

// ── Default state ────────────────────────────────────────────
export const DEFAULT_AFFECTION = 50;
export const DEFAULT_MORALITY = 50;
export const DEFAULT_HUNGER = 30;
export const DEFAULT_FATIGUE = 20;
export const DEFAULT_TRAUMA = 0;
export const DEFAULT_LEVEL = 1;
export const DEFAULT_XP = 0;
export const DEFAULT_IS_SLEEPING = false;
export const DEFAULT_DISCOMFORT_COUNT = 0;
export const STATE_VERSION = 1;

// ── Decay / recovery rates (per tick, where 1 tick ≈ 1 s) ───
export const HUNGER_DECAY_RATE = 0.01;       // hunger ↑ over time
export const FATIGUE_DECAY_RATE = 0.005;      // fatigue ↑ over time
export const AFFECTION_DECAY_RATE = 0.002;    // affection ↓ when ignored
export const TRAUMA_DECAY_RATE = 0.0005;      // trauma ↓ very slowly

// ── Absence decay rates (per second of absence) ──────────────
export const ABSENCE_HUNGER_RATE = 1 / 60;          // +1 per minute
export const ABSENCE_FATIGUE_RATE = 0.5 / 60;       // +0.5 per minute
export const ABSENCE_AFFECTION_DECAY_RATE = 0.1 / 60; // -0.1 per minute
export const ABSENCE_AFFECTION_DECAY_THRESHOLD = 3600; // 1 hour in seconds

// ── Interaction effects ──────────────────────────────────────
export const PET_AFFECTION_GAIN = 3;
export const FEED_HUNGER_REDUCTION = 25;
export const SLEEP_FATIGUE_REDUCTION = 40;
export const PLAY_AFFECTION_GAIN = 2;
export const PLAY_FATIGUE_COST = 10;

// ── Persistence ──────────────────────────────────────────────
export const SAVE_DEBOUNCE_MS = 2_000;
export const CHECKPOINT_INTERVAL_MS = 60_000; // 1 min
export const SAVE_FILENAME = 'noah-state.json';
export const MEMORY_FILENAME = 'memories.json';
export const MAX_BACKUP_COUNT = 3;

// ── Session ──────────────────────────────────────────────────
export const SESSION_IDLE_THRESHOLD_MS = 300_000;    // 5 min idle
export const SESSION_OFFLINE_THRESHOLD_MS = 3_600_000; // 1 hour offline

// ── XP / Level ───────────────────────────────────────────────
export const XP_PER_LEVEL = 100;
export const XP_INTERACTION_BASE = 5;
export const XP_FEED_BONUS = 10;

// ── Emotion thresholds (affection ranges) ────────────────────
export const AFFECTION_HOSTAGE = 10;
export const AFFECTION_SAD = 25;
export const AFFECTION_NEUTRAL = 50;
export const AFFECTION_HAPPY = 70;
export const AFFECTION_EXCITED = 85;

// ── Trauma thresholds ────────────────────────────────────────
export const TRAUMA_MILD = 20;
export const TRAUMA_MODERATE = 50;
export const TRAUMA_SEVERE = 80;

// ── Memory decay ─────────────────────────────────────────────
export const MEMORY_MAX_EVENTS = 1000;

export const MEMORY_DECAY_INITIAL = 1.0;

export const MEMORY_DECAY_RATE_POSITIVE = 0.05;    // -0.05/day
export const MEMORY_DECAY_RATE_NEUTRAL = 0.1;      // -0.1/day
export const MEMORY_DECAY_RATE_NEGATIVE = 0.02;    // -0.02/day
export const MEMORY_DECAY_RATE_TRAUMATIC = 0.001;  // -0.001/day

export const MEMORY_DECAY_FLOOR_POSITIVE = 0.1;
export const MEMORY_DECAY_FLOOR_NEUTRAL = 0.0;
export const MEMORY_DECAY_FLOOR_NEGATIVE = 0.2;
export const MEMORY_DECAY_FLOOR_TRAUMATIC = 0.8;

// ── System metrics ───────────────────────────────────────────
export const SYSTEM_METRICS_POLL_INTERVAL_MS = 5_000; // 5 seconds

export const CPU_LOAD_COMFORTABLE_MAX = 30;
export const CPU_LOAD_WARM_MAX = 60;
export const CPU_LOAD_HOT_MAX = 85;

// ── Memory (RAM) severity thresholds
export const RAM_USAGE_LIGHT_MAX = 50;
export const RAM_USAGE_HEAVY_MAX = 80;


// ── Memory severity thresholds ───────────────────────────────
export const MEMORY_SEVERITY_TRAUMATIC = 7;  // severity >= 7 is traumatic

// ── Return severity by absence duration (seconds) ────────────
export const RETURN_SEVERITY_SHORT = 1;      // < 1h
export const RETURN_SEVERITY_MEDIUM = 2;     // 1-8h
export const RETURN_SEVERITY_LONG = 4;       // 8-24h
export const RETURN_SEVERITY_EXTENDED = 6;   // > 24h

export const RETURN_SEVERITY_THRESHOLD_MEDIUM = 3600;       // 1 hour
export const RETURN_SEVERITY_THRESHOLD_LONG = 28800;        // 8 hours
export const RETURN_SEVERITY_THRESHOLD_EXTENDED = 86400;    // 24 hours
