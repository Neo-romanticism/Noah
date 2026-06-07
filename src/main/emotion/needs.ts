import {
  HUNGER_DECAY_RATE,
  FATIGUE_DECAY_RATE,
  AFFECTION_DECAY_RATE,
  TRAUMA_DECAY_RATE,
} from '../../shared/constants/index.js';
import { clampStat } from '../../shared/utils/index.js';
import type { NoahState } from '../../shared/types/index.js';

export interface NeedsConfig {
  hungerRate: number;             // per second (default: HUNGER_DECAY_RATE)
  fatigueRate: number;            // per second (default: FATIGUE_DECAY_RATE)
  affectionDecayRate: number;     // per second (default: AFFECTION_DECAY_RATE)
  traumaDecayRate: number;        // per second (default: TRAUMA_DECAY_RATE)
  activeHungerMultiplier: number;  // 1.5x when playing
  traumaHungerMultiplier: number;  // 2x when trauma > 50
  sleepFatigueReductionRate: number; // per second when sleeping
}

export interface NeedsTickResult {
  hunger?: number;
  fatigue?: number;
  affection?: number;
  trauma?: number;
  isSleeping?: boolean;
  autoSleepTriggered?: boolean;
}

export class OnlineNeedsDecay {
  private lastTick: number = Date.now();
  private config: NeedsConfig;

  constructor(config?: Partial<NeedsConfig>) {
    this.config = {
      hungerRate: HUNGER_DECAY_RATE,
      fatigueRate: FATIGUE_DECAY_RATE,
      affectionDecayRate: AFFECTION_DECAY_RATE,
      traumaDecayRate: TRAUMA_DECAY_RATE,
      activeHungerMultiplier: 1.5,
      traumaHungerMultiplier: 2,
      sleepFatigueReductionRate: 1, // -1 per second while sleeping
      ...config,
    };
  }

  tick(state: NoahState, isActive: boolean): NeedsTickResult {
    const now = Date.now();
    const seconds = (now - this.lastTick) / 1000;
    this.lastTick = now;

    const result: NeedsTickResult = {};

    // ── Sleep handling ──────────────────────────────────────────
    if (state.isSleeping) {
      // Recover fatigue during sleep
      result.fatigue = clampStat(state.fatigue - seconds * this.config.sleepFatigueReductionRate);
      // Wake up when fatigue is fully recovered
      if (result.fatigue <= 5) {
        result.isSleeping = false;
      }
      // Slight hunger increase even while sleeping
      result.hunger = clampStat(state.hunger + seconds * this.config.hungerRate * 0.5);
      return result;
    }

    // ── Automatic sleep trigger (fatigue > 80) ──────────────────
    if (state.fatigue > 80 && !state.isSleeping) {
      result.isSleeping = true;
      result.autoSleepTriggered = true;
      result.fatigue = clampStat(state.fatigue - seconds * this.config.sleepFatigueReductionRate);
      // Slight hunger increase while sleeping
      result.hunger = clampStat(state.hunger + seconds * this.config.hungerRate * 0.5);
      return result;
    }

    // ── Normal awake decay ──────────────────────────────────────
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

    // Hunger increases over time
    result.hunger = clampStat(state.hunger + seconds * this.config.hungerRate * hungerMod);
    // Fatigue increases over time
    result.fatigue = clampStat(state.fatigue + seconds * this.config.fatigueRate * fatigueMod);

    // Affection gradually decays when ignored (only in awake state)
    // This is a slow decay that represents Noah feeling lonely without interaction
    result.affection = clampStat(state.affection - seconds * this.config.affectionDecayRate);

    // Trauma: NO passive decay when in trauma state (trauma special rule)
    // Trauma only heals through active care (clean, affection) or very slow natural decay
    // Natural decay is only applied when trauma < TRAUMA_MODERATE (50)
    if (state.trauma < 50) {
      result.trauma = clampStat(state.trauma - seconds * this.config.traumaDecayRate);
    }
    // If trauma >= 50, it does NOT passively decay — requires active healing

    return result;
  }

  reset(): void {
    this.lastTick = Date.now();
  }
}
