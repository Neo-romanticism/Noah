import type { InteractionType } from '../../shared/types/index.js';

export interface CooldownConfig {
  drag: number;       // 0.5 seconds
  throw: number;      // 2 seconds
  pet: number;        // 3 seconds
  click: number;      // 1 second
  feed: number;       // 300 seconds (5 minutes)
  clean: number;      // 60 seconds (1 minute)
  sleep: number;      // 0 (handled by state)
  play: number;       // 600 seconds (10 minutes)
}

export const DEFAULT_COOLDOWNS: CooldownConfig = {
  drag: 0.5,
  throw: 2,
  pet: 3,
  click: 1,
  feed: 300,
  clean: 60,
  sleep: 0,
  play: 600,
};

export class CooldownManager {
  private cooldowns = new Map<InteractionType, number>();
  private config: CooldownConfig;

  constructor(config?: Partial<CooldownConfig>) {
    this.config = { ...DEFAULT_COOLDOWNS, ...config };
  }

  canExecute(type: InteractionType): boolean {
    const last = this.cooldowns.get(type);
    if (!last) return true;
    return Date.now() - last >= this.config[type] * 1000;
  }

  record(type: InteractionType): void {
    this.cooldowns.set(type, Date.now());
  }

  reset(): void {
    this.cooldowns.clear();
  }
}