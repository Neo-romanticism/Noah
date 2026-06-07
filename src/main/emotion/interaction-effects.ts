import {
  PET_AFFECTION_GAIN,
  FEED_HUNGER_REDUCTION,
  PLAY_AFFECTION_GAIN,
  PLAY_FATIGUE_COST,
} from '../../shared/constants/index.js';
import { clampStat } from '../../shared/utils/index.js';
import { applyHungerPersonality } from './hunger-personality.js';
import type { InteractionType, NoahState } from '../../shared/types/index.js';

export interface InteractionEffect {
  affection?: number;
  morality?: number;
  hunger?: number;
  fatigue?: number;
  trauma?: number;
}

/**
 * Effect table — all values are deltas (positive = increase).
 * Uses existing constants where available.
 */
export const INTERACTION_EFFECTS: Record<InteractionType, InteractionEffect> = {
  drag: { affection: 1, fatigue: 2 },              // gentle
  throw: { affection: -5, fatigue: 5 },             // rough
  pet: { affection: PET_AFFECTION_GAIN },           // +3
  click: { affection: -10, morality: -5, trauma: 5 }, // "mouse beating"
  feed: { affection: 10, hunger: -FEED_HUNGER_REDUCTION }, // -25
  clean: { affection: 5, morality: 3, trauma: -2 },
  sleep: {}, // handled by OnlineNeedsDecay
  play: { affection: PLAY_AFFECTION_GAIN, fatigue: PLAY_FATIGUE_COST }, // +2, +10
};

export function applyInteraction(
  state: NoahState,
  type: InteractionType,
  context: { velocity?: number; isGentle?: boolean }
): Partial<NoahState> {
  let effect = INTERACTION_EFFECTS[type];
  let result: Partial<NoahState> = {};

  // Velocity modifier for throw
  if (type === 'throw' && context.velocity !== undefined) {
    const isHard = context.velocity > 5;
    result = {
      affection: clampStat(state.affection + (isHard ? -5 : 2)),
      trauma: clampStat(state.trauma + (isHard ? 5 : 0)),
      fatigue: clampStat(state.fatigue + (isHard ? 8 : 2)),
    };
  } else {
    // Apply standard effects
    for (const [key, delta] of Object.entries(effect)) {
      if (delta !== undefined && delta !== 0) {
        const current = state[key as keyof NoahState] as number;
        (result as Record<string, number>)[key] = clampStat(current + delta);
      }
    }
  }

  // Apply hunger personality shift to modify emotional responses
  // This adjusts affection gains/losses and trauma based on hunger level
  return applyHungerPersonality(state, type, result as Record<string, number>);
}
