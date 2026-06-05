import { resolveEmotion } from '../../shared/utils/index.js';
import type { Emotion, NoahState } from '../../shared/types/index.js';

export interface ThoughtCycleConfig {
  intervalMs: number;      // 기본 5000ms (5초)
  minIntervalMs: number;   // 최소 1000ms
  maxIntervalMs: number;   // 최대 30000ms
}

export interface Thought {
  emotion: Emotion;
  dominantNeed: string;
  text: string;
}

export interface AutonomousAction {
  type: 'dialog' | 'animation' | 'expression';
  payload: string;        // dialog text, animation trigger, or expression name
}

export class ThoughtCycle {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private config: ThoughtCycleConfig;

  constructor(config?: Partial<ThoughtCycleConfig>) {
    this.config = {
      intervalMs: 5000,
      minIntervalMs: 1000,
      maxIntervalMs: 30000,
      ...config,
    };
  }

  start(state: NoahState, callbacks: {
    onThink: (thought: Thought) => void;
    onAction: (action: AutonomousAction) => void;
  }): void {
    this.scheduleNext(state, callbacks);
  }

  private scheduleNext(state: NoahState, callbacks: {
    onThink: (thought: Thought) => void;
    onAction: (action: AutonomousAction) => void;
  }): void {
    const interval = this.calculateInterval(state);
    this.timer = setTimeout(() => {
      const thought = this.generateThought(state);
      callbacks.onThink(thought);

      const action = this.decideAction(state, thought);
      if (action) callbacks.onAction(action);

      this.scheduleNext(state, callbacks);
    }, interval);
  }

  private calculateInterval(state: NoahState): number {
    const fatigueFactor = 1 + (state.fatigue / 100);
    const traumaJitter = state.trauma > 50 ? Math.random() * 5000 : 0;

    return Math.min(
      this.config.maxIntervalMs,
      Math.max(this.config.minIntervalMs, this.config.intervalMs * fatigueFactor + traumaJitter)
    );
  }

  private generateThought(state: NoahState): Thought {
    return {
      emotion: resolveEmotion(state),
      dominantNeed: this.findDominantNeed(state),
      text: this.pickRandomThought(state),
    };
  }

  private findDominantNeed(state: NoahState): string {
    if (state.hunger > 70) return 'hunger';
    if (state.fatigue > 80) return 'fatigue';
    if (state.trauma > 50) return 'trauma';
    if (state.affection < 20) return 'affection';
    return 'content';
  }

  private pickRandomThought(state: NoahState): string {
    if (state.hunger > 70) return '...배고파';
    if (state.fatigue > 80) return '...졸려';
    if (state.trauma > 50) return '...무서워';
    if (state.affection > 80) return '함께 있어서 행복해!';
    if (state.affection < 20) return '...외로워';
    return '...';
  }

  private decideAction(state: NoahState, _thought: Thought): AutonomousAction | null {
    if (state.hunger > 70 && Math.random() < 0.3) {
      return { type: 'dialog', payload: '...배고파' };
    }
    if (state.fatigue > 80 && Math.random() < 0.5) {
      return { type: 'animation', payload: 'sleep' };
    }
    if (state.trauma > 50 && Math.random() < 0.2) {
      return { type: 'expression', payload: 'scared' };
    }
    return null;
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}