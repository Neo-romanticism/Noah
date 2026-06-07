/**
 * Expression Override (Disguise) System
 *
 * Allows Noah to consciously mask his true emotions.
 * When an override is active, the displayed emotion differs from the underlying state.
 * This can be triggered by:
 * - Trauma response (hiding pain)
 * - Strategic behavior (pleasing the user)
 */
import type { Emotion, NoahState } from '../../shared/types/index.js';

export interface ExpressionOverride {
  /** The emotion to display */
  displayEmotion: Emotion;
  /** Timestamp when override expires (or Infinity for permanent) */
  expiresAt: number;
  /** Reason for the override */
  reason: 'trauma_mask' | 'submission' | 'defense' | 'strategic';
  /** Strength of the disguise (0-1, higher = more convincing) */
  strength: number;
}

export type OverrideState = ExpressionOverride | null;

/**
 * Determine if an expression override should be applied based on state.
 *
 * Returns null if no override is needed.
 */
export function evaluateOverride(state: NoahState): OverrideState {
  // Traumatized Noah may try to hide it if affection is high enough
  if (state.trauma >= 80 && state.affection >= 40) {
    return {
      displayEmotion: 'happy',
      expiresAt: Date.now() + 60_000, // 1 minute
      reason: 'trauma_mask',
      strength: 0.5 + (state.affection - 40) / 120, // 0.5 - 1.0
    };
  }

  // Submissive behavior when trauma is high and affection is very low
  if (state.trauma >= 60 && state.affection <= 15) {
    return {
      displayEmotion: 'submissive',
      expiresAt: Date.now() + 120_000, // 2 minutes
      reason: 'submission',
      strength: 0.7,
    };
  }

  // No override needed
  return null;
}

/**
 * Apply the expression override: return the displayed emotion.
 */
export function applyOverride(
  trueEmotion: Emotion,
  override: OverrideState,
): Emotion {
  if (!override) return trueEmotion;
  if (Date.now() > override.expiresAt) return trueEmotion;

  // With strength-based probability, the disguise may occasionally break
  if (override.strength < 1.0 && Math.random() > override.strength) {
    return trueEmotion; // The disguise flickers
  }

  return override.displayEmotion;
}

/**
 * Check if a disguise is active.
 */
export function hasOverride(override: OverrideState): boolean {
  if (!override) return false;
  if (Date.now() > override.expiresAt) return false;
  return true;
}