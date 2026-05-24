/**
 * Pure helper functions shared across main and renderer processes.
 *
 * Every function here is deterministic and side-effect-free,
 * making them trivially unit-testable.
 */

import type { Emotion, MemoryEvent, NoahState } from '../types/index.js';
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
  AFFECTION_HOSTAGE,
  AFFECTION_SAD,
  AFFECTION_NEUTRAL,
  AFFECTION_HAPPY,
  TRAUMA_MODERATE,
  TRAUMA_SEVERE,
  ABSENCE_HUNGER_RATE,
  ABSENCE_FATIGUE_RATE,
  ABSENCE_AFFECTION_DECAY_RATE,
  ABSENCE_AFFECTION_DECAY_THRESHOLD,
  RETURN_SEVERITY_SHORT,
  RETURN_SEVERITY_MEDIUM,
  RETURN_SEVERITY_LONG,
  RETURN_SEVERITY_EXTENDED,
  RETURN_SEVERITY_THRESHOLD_MEDIUM,
  RETURN_SEVERITY_THRESHOLD_LONG,
  RETURN_SEVERITY_THRESHOLD_EXTENDED,
} from '../constants/index.js';

// ── Clamping ─────────────────────────────────────────────────

/** Clamp a numeric stat to [STAT_MIN, STAT_MAX]. */
export const clampStat = (value: number): number =>
  Math.max(STAT_MIN, Math.min(STAT_MAX, value));

/** Clamp an arbitrary number between min and max. */
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

// ── State factory ────────────────────────────────────────────

/** Create a fresh NoahState with default values. */
export const createDefaultState = (): NoahState => ({
  emotion: 'happy',
  affection: DEFAULT_AFFECTION,
  morality: DEFAULT_MORALITY,
  hunger: DEFAULT_HUNGER,
  fatigue: DEFAULT_FATIGUE,
  trauma: DEFAULT_TRAUMA,
  level: DEFAULT_LEVEL,
  xp: DEFAULT_XP,
  lastSeen: Date.now(),
  sessionStart: Date.now(),
  totalOnlineTime: 0,
  totalOfflineTime: 0,
  isSleeping: DEFAULT_IS_SLEEPING,
  discomfortCount: DEFAULT_DISCOMFORT_COUNT,
  systemLoad: 0,
  version: STATE_VERSION,
});

// ── Emotion resolution ───────────────────────────────────────

/**
 * Derive the primary emotion from the current stat vector.
 *
 * This is a simplified heuristic — the full emotion engine
 * will also consider recent events, memory, and context.
 */
export const resolveEmotion = (state: Omit<NoahState, 'emotion'>): Emotion => {
  // Trauma overrides almost everything
  if (state.trauma >= TRAUMA_SEVERE) return 'traumatized';
  if (state.trauma >= TRAUMA_MODERATE) return 'scared';

  // Critical needs
  if (state.hunger >= 80) return 'hungry';
  if (state.fatigue >= 80) return 'tired';

  // Affection-based mood
  if (state.affection <= AFFECTION_HOSTAGE && state.morality <= AFFECTION_HOSTAGE) return 'hostage';
  if (state.affection <= AFFECTION_SAD) return 'sad';
  if (state.affection <= AFFECTION_NEUTRAL) return 'bored';
  if (state.affection <= AFFECTION_HAPPY) return 'happy';
  return 'excited';
};

// ── Memory context builder ─────────────────────────────────

/** Build a memory context snapshot from the current state. */
export const buildMemoryContext = (
  state: NoahState,
): Omit<MemoryEvent, 'id' | 'timestamp' | 'severity' | 'type' | 'description' | 'decay'>['context'] => ({
  emotion: state.emotion,
  affection: state.affection,
  morality: state.morality,
  hunger: state.hunger,
  fatigue: state.fatigue,
  trauma: state.trauma,
});

// ── Stat modifiers ───────────────────────────────────────────

/** Apply a delta to a stat, clamping the result. */
export const modifyStat = (
  current: number,
  delta: number,
): number => clampStat(current + delta);

/** Apply decay to a stat (move toward a target, usually the extreme). */
export const applyDecay = (
  current: number,
  rate: number,
  target: number = STAT_MAX,
): number => {
  if (current === target) return current;
  const step = current < target
    ? Math.min(rate, target - current)
    : Math.max(-rate, target - current);
  return clampStat(current + step);
};

// ── XP / Level ───────────────────────────────────────────────

/** Calculate the level for a given total XP. */
export const levelFromXp = (xp: number): number =>
  Math.max(1, Math.floor(xp / 100) + 1);

/** Calculate XP needed to reach the next level. */
export const xpForNextLevel = (level: number): number => level * 100;

// ── Validation ───────────────────────────────────────────────

/** Check whether a partial state object has valid stat ranges. */
export const isValidState = (
  state: Partial<NoahState>,
): boolean => {
  const checks: boolean[] = [];

  if (state.affection !== undefined) {
    checks.push(state.affection >= STAT_MIN && state.affection <= STAT_MAX);
  }
  if (state.morality !== undefined) {
    checks.push(state.morality >= STAT_MIN && state.morality <= STAT_MAX);
  }
  if (state.hunger !== undefined) {
    checks.push(state.hunger >= STAT_MIN && state.hunger <= STAT_MAX);
  }
  if (state.fatigue !== undefined) {
    checks.push(state.fatigue >= STAT_MIN && state.fatigue <= STAT_MAX);
  }
  if (state.trauma !== undefined) {
    checks.push(state.trauma >= STAT_MIN && state.trauma <= STAT_MAX);
  }
  if (state.level !== undefined) {
    checks.push(state.level >= 1);
  }
  if (state.xp !== undefined) {
    checks.push(state.xp >= 0);
  }
  if (state.discomfortCount !== undefined) {
    checks.push(state.discomfortCount >= 0 && state.discomfortCount <= 3);
  }
  if (state.version !== undefined) {
    checks.push(state.version >= 1);
  }

  return checks.length === 0 || checks.every(Boolean);
};

// ── Time helpers ─────────────────────────────────────────────

/** Check if Noah has been offline longer than the session timeout. */
export const isOffline = (
  lastSeen: number,
  timeoutMs: number,
): boolean => Date.now() - lastSeen > timeoutMs;

/** Calculate seconds since last seen. */
export const secondsSinceLastSeen = (lastSeen: number): number =>
  Math.floor((Date.now() - lastSeen) / 1000);

// ── Absence reconciliation ───────────────────────────────────

/**
 * Apply absence decay to a state snapshot.
 * Returns a new state with decay applied for the given absence duration.
 */
export const reconcileAbsence = (
  state: NoahState,
  absenceSeconds: number,
): NoahState => {
  let { hunger, fatigue, affection } = state;

  // Hunger increases during absence
  hunger = clampStat(hunger + absenceSeconds * ABSENCE_HUNGER_RATE);

  // Fatigue increases during absence if Noah was awake
  if (!state.isSleeping) {
    fatigue = clampStat(fatigue + absenceSeconds * ABSENCE_FATIGUE_RATE);
  }

  // Affection decays only after a threshold of absence
  if (absenceSeconds > ABSENCE_AFFECTION_DECAY_THRESHOLD) {
    const decaySeconds = absenceSeconds - ABSENCE_AFFECTION_DECAY_THRESHOLD;
    affection = clampStat(affection - decaySeconds * ABSENCE_AFFECTION_DECAY_RATE);
  }

  return {
    ...state,
    hunger,
    fatigue,
    affection,
  };
};

/**
 * Calculate return severity based on absence duration.
 */
export const calculateReturnSeverity = (absenceSeconds: number): number => {
  if (absenceSeconds >= RETURN_SEVERITY_THRESHOLD_EXTENDED) {
    return RETURN_SEVERITY_EXTENDED;
  }
  if (absenceSeconds >= RETURN_SEVERITY_THRESHOLD_LONG) {
    return RETURN_SEVERITY_LONG;
  }
  if (absenceSeconds >= RETURN_SEVERITY_THRESHOLD_MEDIUM) {
    return RETURN_SEVERITY_MEDIUM;
  }
  return RETURN_SEVERITY_SHORT;
};

// ── Duration formatting ──────────────────────────────────────

/**
 * Format a duration in seconds to a human-readable string.
 * Uses the largest applicable unit: d (days), h (hours), m (minutes), s (seconds).
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};
