/**
 * Hunger Personality Shift
 *
 * When hunger is high, Noah's emotional responses are modified:
 * - patience decreases (affection gains are reduced)
 * - irritability increases (affection losses are amplified)
 * - Affection gains from interaction are reduced
 * - Negative interactions cause more trauma
 */
import type { NoahState, InteractionType } from '../../shared/types/index.js';
import { clampStat } from '../../shared/utils/index.js';

export interface HungerModifiers {
  affectionGainMultiplier: number;   // < 1.0 reduces gains
  affectionLossMultiplier: number;   // > 1.0 amplifies losses
  traumaMultiplier: number;          // > 1.0 amplifies trauma
  patienceLabel: string;             // description of current mood
}

/**
 * Calculate hunger-based personality modifiers.
 */
export function getHungerPersonality(hunger: number): HungerModifiers {
  if (hunger >= 90) {
    return {
      affectionGainMultiplier: 0.3,
      affectionLossMultiplier: 2.5,
      traumaMultiplier: 2.0,
      patienceLabel: 'extremely_irritable',
    };
  }
  if (hunger >= 70) {
    return {
      affectionGainMultiplier: 0.5,
      affectionLossMultiplier: 1.8,
      traumaMultiplier: 1.5,
      patienceLabel: 'irritable',
    };
  }
  if (hunger >= 50) {
    return {
      affectionGainMultiplier: 0.75,
      affectionLossMultiplier: 1.3,
      traumaMultiplier: 1.2,
      patienceLabel: 'peckish',
    };
  }
  // Normal state
  return {
    affectionGainMultiplier: 1.0,
    affectionLossMultiplier: 1.0,
    traumaMultiplier: 1.0,
    patienceLabel: 'normal',
  };
}

/**
 * Apply hunger personality modifiers to an interaction effect's delta values.
 * Modifies affection gains/losses and trauma based on current hunger level.
 */
export function applyHungerPersonality(
  state: NoahState,
  type: InteractionType,
  delta: Partial<Record<string, number>>,
): Partial<Record<string, number>> {
  const mod = getHungerPersonality(state.hunger);
  const result: Partial<Record<string, number>> = { ...delta };

  // Modify affection changes
  if (result.affection !== undefined) {
    if (result.affection > 0) {
      // Positive affection gains are reduced when hungry
      result.affection = Math.round(result.affection * mod.affectionGainMultiplier);
    } else if (result.affection < 0) {
      // Negative affection losses are amplified when hungry
      result.affection = Math.round(result.affection * mod.affectionLossMultiplier);
    }
  }

  // Modify trauma changes (trauma from negative interactions is amplified)
  if (result.trauma !== undefined && result.trauma > 0) {
    result.trauma = Math.round(result.trauma * mod.traumaMultiplier);
  }

  return result;
}