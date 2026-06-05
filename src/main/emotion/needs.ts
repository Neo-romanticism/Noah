import {
  HUNGER_DECAY_RATE,
  FATIGUE_DECAY_RATE,
  TRAUMA_DECAY_RATE,
} from '../../shared/constants/index.js';
import { clampStat } from '../../shared/utils/index.js';
import type { NoahState } from '../../shared/types/index.js';

export interface NeedsConfig {
  hungerRate: number;         // per second (default: HUNGER_DECAY_RATE)
  fatigueRate: number;        // per second (default: FATIGUE_DECAY_RATE)
  traumaDecayRate: number;    // per second (default: TRAUMA_DECAY_RATE)
  activeHungerMultiplier: number;  // 1.5x when playing
  traumaHungerMultiplier: number;  // 2x when trauma > 50
}

export class OnlineNeedsDecay {
  private lastTick: number = Date.now();
  private config: NeedsConfig;

  constructor(config?: Partial<NeedsConfig>) {
    this.config = {
      hungerRate: HUNGER_DECAY_RATE,
      fatigueRate: FATIGUE_DECAY_RATE,
      traumaDecayRate: TRAUMA_DECAY_RATE,
      activeHungerMultiplier: 1.5,
      traumaHungerMultiplier: 2,
      ...config,
    };
  }

  tick(state: NoahState, isActive: boolean): Partial<NoahState> {
    const now = Date.now();
    const seconds = (now - this.lastTick) / 1000;
    this.lastTick = now;

    let hungerMod = 1;
    let fatigueMod = 1;

    if (isActive) {
      hungerMod = this.config.activeHungerMultiplier;
      fatigueMod = 2;
    }
    if (state.trauma > 50) {
      hungerMod *= this.config.traumaHungerMultiplier;
      fatigueMod *= 2;
    }

    return {
      hunger: clampStat(state.hunger + seconds * this.config.hungerRate * hungerMod),
      fatigue: clampStat(state.fatigue + seconds * this.config.fatigueRate * fatigueMod),
      trauma: clampStat(state.trauma - seconds * this.config.traumaDecayRate),
    };
  }

  reset(): void {
    this.lastTick = Date.now();
  }
}