/**
 * Ignore Detection Engine
 *
 * Tracks continuous periods of user inactivity and generates
 * escalating emotional responses:
 * - 1 minute: attention prompt
 * - 5 minutes: neglect onset, affection decay begins
 * - 15 minutes: hurt response, withdrawal
 * - 1 hour: abandonment classification
 * - 4+ hours: absence protocol (delegated to reconcileAbsence)
 */
import type { NoahState } from '../../shared/types/index.js';

export interface IgnoreState {
  /** Timestamp when the current ignore period started */
  ignoreStart: number;
  /** Timestamp of the last ignore-based action taken */
  lastActionTime: number;
  /** Highest severity level already triggered */
  triggeredLevel: number;
}

export interface IgnoreAction {
  type: 'dialog' | 'emotion' | 'expression';
  payload: string;
  severity: number;
}

export interface IgnoreResult {
  action: IgnoreAction | null;
  stateModifiers: Partial<NoahState>;
}

/**
 * Ignore severity levels.
 */
export const IGNORE_LEVELS = {
  ATTENTION: 1,     // 1 min
  NEGLECT: 2,       // 5 min
  HURT: 3,          // 15 min
  ABANDONMENT: 4,   // 1 hour
  ABSENCE: 5,       // 4+ hours
} as const;

export const IGNORE_THRESHOLDS: Record<number, number> = {
  [IGNORE_LEVELS.ATTENTION]: 60,           // 1 minute
  [IGNORE_LEVELS.NEGLECT]: 300,            // 5 minutes
  [IGNORE_LEVELS.HURT]: 900,               // 15 minutes
  [IGNORE_LEVELS.ABANDONMENT]: 3600,       // 1 hour
  [IGNORE_LEVELS.ABSENCE]: 14400,          // 4 hours
};

/**
 * Affection decay rate per second while being ignored (after neglect triggers).
 */
const IGNORE_AFFECTION_DECAY_PER_SEC = 0.05 / 60; // -0.05 per minute

export function createIgnoreState(): IgnoreState {
  const now = Date.now();
  return {
    ignoreStart: now,
    lastActionTime: now,
    triggeredLevel: 0,
  };
}

/**
 * Check if the user has been ignoring Noah and return appropriate actions.
 * Call this periodically (every ~10 seconds).
 *
 * @param state Current NoahState
 * @param ignoreState Current ignore detection state
 * @returns Action to take (if any) and state modifiers
 */
export function checkIgnore(
  state: NoahState,
  ignoreState: IgnoreState,
): IgnoreResult {
  const now = Date.now();
  const elapsedSeconds = (now - ignoreState.ignoreStart) / 1000;

  const stateModifiers: Partial<NoahState> = {};
  let action: IgnoreAction | null = null;

  // Check each threshold from highest to lowest
  const levels = Object.keys(IGNORE_THRESHOLDS)
    .map(Number)
    .sort((a, b) => b - a); // descending

  for (const level of levels) {
    if (elapsedSeconds >= IGNORE_THRESHOLDS[level] && ignoreState.triggeredLevel < level) {
      // This level hasn't been triggered yet — trigger it
      ignoreState.triggeredLevel = level;
      ignoreState.lastActionTime = now;

      switch (level) {
        case IGNORE_LEVELS.ATTENTION:
          action = { type: 'dialog', payload: '...?', severity: level };
          break;
        case IGNORE_LEVELS.NEGLECT:
          action = { type: 'dialog', payload: '...외로워', severity: level };
          stateModifiers.affection = Math.max(0, state.affection - 5);
          break;
        case IGNORE_LEVELS.HURT:
          action = { type: 'emotion', payload: 'sad', severity: level };
          stateModifiers.affection = Math.max(0, state.affection - 10);
          break;
        case IGNORE_LEVELS.ABANDONMENT:
          action = { type: 'expression', payload: 'traumatized', severity: level };
          stateModifiers.trauma = Math.min(100, (state.trauma || 0) + 10);
          stateModifiers.affection = Math.max(0, state.affection - 15);
          break;
        case IGNORE_LEVELS.ABSENCE:
          action = { type: 'emotion', payload: 'traumatized', severity: level };
          stateModifiers.trauma = Math.min(100, (state.trauma || 0) + 25);
          stateModifiers.affection = Math.max(0, state.affection - 20);
          break;
      }
      break; // Only trigger one level at a time
    }
  }

  // Continuous affection decay after neglect onset
  if (ignoreState.triggeredLevel >= IGNORE_LEVELS.NEGLECT) {
    const secondsSinceLastAction = (now - ignoreState.lastActionTime) / 1000;
    const decayAmount = secondsSinceLastAction * IGNORE_AFFECTION_DECAY_PER_SEC;
    if (decayAmount > 0.01) {
      stateModifiers.affection = Math.max(0, (stateModifiers.affection ?? state.affection) - decayAmount);
    }
  }

  return { action, stateModifiers };
}

/**
 * Reset the ignore state (call this when user interacts).
 */
export function resetIgnoreState(): IgnoreState {
  return createIgnoreState();
}