import { EventEmitter } from 'events';

import type { InteractionEvent, MemoryEvent, NoahState } from '../../shared/types/index.js';
import { createDefaultState, buildMemoryContext, reconcileAbsence as reconcileAbsenceUtil } from '../../shared/utils/index.js';

export class StateManager {
  private readonly emitter = new EventEmitter();
  private state: NoahState;
  private memoryStore: {
    record: (event: Omit<MemoryEvent, 'id' | 'timestamp' | 'decay'>) => MemoryEvent;
  } | null = null;

  constructor(initial?: NoahState) {
    this.state = initial ?? createDefaultState();
  }

  /**
   * Wire a MemoryStore instance to record events on interactions.
   */
  public setMemoryStore(
    memoryStore: {
      record: (event: Omit<MemoryEvent, 'id' | 'timestamp' | 'decay'>) => MemoryEvent;
    },
  ): void {
    this.memoryStore = memoryStore;
  }

  public getState(): NoahState {
    return this.state;
  }

  public onStateChange(listener: (state: NoahState) => void): () => void {
    this.emitter.on('state', listener);
    return () => this.emitter.off('state', listener);
  }

  /**
   * Apply an interaction and record a memory event.
   */
  public applyInteraction(event: InteractionEvent): NoahState {
    const next = {
      ...this.state,
      lastSeen: Date.now(),
    } satisfies NoahState;

    this.state = next;
    this.emitter.emit('state', this.state);

    // Record memory event if memory store is wired
    if (this.memoryStore) {
      this.memoryStore.record({
        type: this.interactionTypeToMemoryEvent(event.type),
        severity: this.getInteractionSeverity(event.type),
        context: buildMemoryContext(this.state),
        description: `User performed ${event.type} interaction`,
      });
    }

    return this.state;
  }

  /**
   * Tick hook for decay and totalOnlineTime accumulation.
   */
  public tick(now: number = Date.now()): NoahState {
    const elapsed = Math.max(0, Math.floor((now - this.state.lastSeen) / 1000));
    this.state = {
      ...this.state,
      lastSeen: now,
      totalOnlineTime: this.state.totalOnlineTime + elapsed,
    } satisfies NoahState;
    this.emitter.emit('state', this.state);
    return this.state;
  }

  /**
   * Convenience mutation API.
   */
  public modify(mutator: (draft: NoahState) => NoahState): NoahState {
    const next = mutator(this.state);
    this.state = next;
    this.emitter.emit('state', this.state);
    return this.state;
  }

  public setFromExternal(nextState: NoahState): void {
    this.state = nextState;
    this.emitter.emit('state', this.state);
  }

  /**
   * Reconcile state after a period of absence.
   * Applies decay to hunger, fatigue, and affection.
   */
  public reconcileAbsence(absenceSeconds: number): NoahState {
    const reconciled = reconcileAbsenceUtil(this.state, absenceSeconds);
    this.state = {
      ...reconciled,
      lastSeen: Date.now(),
      totalOfflineTime: this.state.totalOfflineTime + absenceSeconds,
    };
    this.emitter.emit('state', this.state);
    return this.state;
  }

  /**
   * Record a memory event directly.
   */
  public recordEvent(
    event: Omit<MemoryEvent, 'id' | 'timestamp' | 'decay'>,
  ): MemoryEvent | null {
    if (!this.memoryStore) return null;
    const recorded = this.memoryStore.record(event);
    return recorded;
  }

  /**
   * Map InteractionType to MemoryEventType.
   */
  private interactionTypeToMemoryEvent(
    type: InteractionEvent['type'],
  ): MemoryEvent['type'] {
    switch (type) {
      case 'drag': return 'dragged';
      case 'throw': return 'thrown';
      case 'pet': return 'petted';
      case 'click': return 'clicked';
      case 'feed': return 'fed';
      case 'clean': return 'cleaned';
      case 'sleep': return 'slept';
      case 'play': return 'petted'; // play maps to petted for now
    }
  }

  /**
   * Get severity for an interaction type.
   */
  private getInteractionSeverity(type: InteractionEvent['type']): number {
    switch (type) {
      case 'feed': return 3;
      case 'pet': return 2;
      case 'clean': return 2;
      case 'click': return 1;
      case 'sleep': return 2;
      case 'play': return 2;
      case 'drag': return 3;
      case 'throw': return 5;
    }
  }
}
