/**
 * Memory decay calculation logic.
 *
 * Determines how memories fade over time based on their type.
 * Positive memories fade quickly, traumatic memories persist.
 */

import type { MemoryEventType } from '../../shared/types/index.js';
import {
  MEMORY_DECAY_INITIAL,
  MEMORY_DECAY_RATE_POSITIVE,
  MEMORY_DECAY_RATE_NEUTRAL,
  MEMORY_DECAY_RATE_NEGATIVE,
  MEMORY_DECAY_RATE_TRAUMATIC,
  MEMORY_DECAY_FLOOR_POSITIVE,
  MEMORY_DECAY_FLOOR_NEUTRAL,
  MEMORY_DECAY_FLOOR_NEGATIVE,
  MEMORY_DECAY_FLOOR_TRAUMATIC,
} from '../../shared/constants/index.js';

/**
 * Memory type categories for decay classification.
 */
export type MemoryCategory = 'positive' | 'neutral' | 'negative' | 'traumatic';

/**
 * Positive memory event types — fade quickly.
 */
const POSITIVE_TYPES: ReadonlySet<MemoryEventType> = new Set([
  'fed',
  'petted',
  'gifted',
  'clicked',
  'cleaned',
  'leveled_up',
]);

/**
 * Negative memory event types — fade slowly.
 */
const NEGATIVE_TYPES: ReadonlySet<MemoryEventType> = new Set([
  'ignored',
  'dragged_rough',
  'thrown_hard',
  'terminated',
  'command_refused',
]);

/**
 * Traumatic memory event types — barely fade at all.
 */
const TRAUMATIC_TYPES: ReadonlySet<MemoryEventType> = new Set([
  'terminated',
  'thrown_hard',
]);

/**
 * Classify a memory event type into a decay category.
 */
export const classifyMemoryType = (type: MemoryEventType): MemoryCategory => {
  if (TRAUMATIC_TYPES.has(type)) return 'traumatic';
  if (NEGATIVE_TYPES.has(type)) return 'negative';
  if (POSITIVE_TYPES.has(type)) return 'positive';
  return 'neutral';
};

/**
 * Get the decay rate for a given memory category (per day).
 */
export const getDecayRate = (category: MemoryCategory): number => {
  switch (category) {
    case 'positive': return MEMORY_DECAY_RATE_POSITIVE;
    case 'neutral': return MEMORY_DECAY_RATE_NEUTRAL;
    case 'negative': return MEMORY_DECAY_RATE_NEGATIVE;
    case 'traumatic': return MEMORY_DECAY_RATE_TRAUMATIC;
  }
};

/**
 * Get the decay floor for a given memory category.
 */
export const getDecayFloor = (category: MemoryCategory): number => {
  switch (category) {
    case 'positive': return MEMORY_DECAY_FLOOR_POSITIVE;
    case 'neutral': return MEMORY_DECAY_FLOOR_NEUTRAL;
    case 'negative': return MEMORY_DECAY_FLOOR_NEGATIVE;
    case 'traumatic': return MEMORY_DECAY_FLOOR_TRAUMATIC;
  }
};

/**
 * Calculate the new decay coefficient after a given time period.
 *
 * @param currentDecay - Current decay coefficient (0.0-1.0)
 * @param category - Memory category for rate/floor lookup
 * @param elapsedDays - Number of days that have passed
 * @returns New decay coefficient, clamped to [floor, 1.0]
 */
export const calculateDecay = (
  currentDecay: number,
  category: MemoryCategory,
  elapsedDays: number,
): number => {
  const rate = getDecayRate(category);
  const floor = getDecayFloor(category);
  const newDecay = currentDecay - rate * elapsedDays;
  return Math.max(floor, Math.min(MEMORY_DECAY_INITIAL, newDecay));
};

/**
 * Get the initial decay coefficient for a new memory event.
 */
export const getInitialDecay = (): number => MEMORY_DECAY_INITIAL;
