/**
 * Discomfort (Waste) Mechanic
 *
 * Noah produces waste over time. If left uncleaned:
 * - Maximum discomfortCount: 3
 * - Each uncleaned waste item affects mood
 * - Clean interaction removes all waste
 * - Waste generation rate: 1 per X minutes (configurable)
 */
import type { NoahState } from '../../shared/types/index.js';
import { clampStat } from '../../shared/utils/index.js';

export interface DiscomfortConfig {
  /** Time in seconds between discomfort generation (default: 600 = 10 min) */
  generationInterval: number;
  /** Maximum discomfort count (default: 3) */
  maxDiscomfort: number;
  /** Affection loss per uncleared discomfort per tick */
  affectionPenaltyPerTick: number;
  /** Fatigue increase per uncleared discomfort per tick */
  fatiguePenaltyPerTick: number;
}

export const DEFAULT_DISCOMFORT_CONFIG: DiscomfortConfig = {
  generationInterval: 600, // 10 minutes
  maxDiscomfort: 3,
  affectionPenaltyPerTick: 0.5,
  fatiguePenaltyPerTick: 0.3,
};

export interface DiscomfortState {
  /** Timestamp of last discomfort generation check */
  lastCheck: number;
}

export function createDiscomfortState(): DiscomfortState {
  return { lastCheck: Date.now() };
}

/**
 * Check and update discomfort state.
 * Returns state modifiers if discomfort should be added or if penalties apply.
 */
export function checkDiscomfort(
  state: NoahState,
  discomfortState: DiscomfortState,
  config: DiscomfortConfig = DEFAULT_DISCOMFORT_CONFIG,
): { stateModifiers: Partial<NoahState>; newDiscomfortState: DiscomfortState } {
  const now = Date.now();
  const elapsedSeconds = (now - discomfortState.lastCheck) / 1000;

  const stateModifiers: Partial<NoahState> = {};
  const newDiscomfortState = { ...discomfortState };

  // Check if it's time to generate new discomfort
  if (elapsedSeconds >= config.generationInterval && state.discomfortCount < config.maxDiscomfort) {
    newDiscomfortState.lastCheck = now;
    stateModifiers.discomfortCount = (state.discomfortCount ?? 0) + 1;
  }

  // Apply penalties for existing discomfort
  if ((state.discomfortCount ?? 0) > 0) {
    const count = state.discomfortCount ?? 0;
    const affectionPenalty = config.affectionPenaltyPerTick * count * (elapsedSeconds / 60);
    const fatiguePenalty = config.fatiguePenaltyPerTick * count * (elapsedSeconds / 60);

    if (affectionPenalty > 0.1) {
      stateModifiers.affection = clampStat((state.affection ?? 50) - affectionPenalty);
    }
    if (fatiguePenalty > 0.1) {
      stateModifiers.fatigue = clampStat((state.fatigue ?? 20) + fatiguePenalty);
    }
  }

  return { stateModifiers, newDiscomfortState };
}