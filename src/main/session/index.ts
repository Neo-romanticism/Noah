/**
 * SessionTracker — detects user presence transitions and reconciles state.
 *
 * Tracks idle → offline → return transitions and applies
 * absence decay to Noah's state when the user returns.
 */

import type { MemoryEvent, NoahState } from '../../shared/types/index.js';
import { calculateReturnSeverity } from '../../shared/utils/index.js';
import { SESSION_IDLE_THRESHOLD_MS, SESSION_OFFLINE_THRESHOLD_MS } from '../../shared/constants/index.js';
import { PresenceDetector } from './detector.js';

export type SessionState = 'online' | 'idle' | 'offline';

export interface SessionTrackerCallbacks {
  onReturn: (absenceSeconds: number) => void;
  onIdle: () => void;
  onOffline: () => void;
}

/**
 * Tracks user sessions and detects idle/offline/return transitions.
 *
 * Integrates with StateManager to apply absence reconciliation
 * and record memory events on return.
 */
export class SessionTracker {
  private readonly stateManager: {
    getState: () => NoahState;
    reconcileAbsence: (absenceSeconds: number) => NoahState;
  };
  private readonly memoryStore: {
    record: (event: Omit<MemoryEvent, 'id' | 'timestamp' | 'decay'>) => MemoryEvent;
  };
  private readonly detector: PresenceDetector;
  private readonly callbacks: SessionTrackerCallbacks;
  private lastAbsenceDuration: number = 0;
  private running = false;

  constructor(
    stateManager: {
      getState: () => NoahState;
      reconcileAbsence: (absenceSeconds: number) => NoahState;
    },
    memoryStore: {
      record: (event: Omit<MemoryEvent, 'id' | 'timestamp' | 'decay'>) => MemoryEvent;
    },
    options?: {
      idleThresholdMs?: number;
      offlineThresholdMs?: number;
    },
  ) {
    this.stateManager = stateManager;
    this.memoryStore = memoryStore;

    this.callbacks = {
      onReturn: (absenceSeconds: number) => {
        this.handleReturn(absenceSeconds);
      },
      onIdle: () => {
        this.callbacks.onIdle?.();
      },
      onOffline: () => {
        this.callbacks.onOffline?.();
      },
    };

    this.detector = new PresenceDetector(
      {
        onActive: () => this.handleReturnFromOffline(),
        onIdle: () => this.callbacks.onIdle(),
        onOffline: () => this.callbacks.onOffline(),
      },
      {
        idleThresholdMs: options?.idleThresholdMs ?? SESSION_IDLE_THRESHOLD_MS,
        offlineThresholdMs: options?.offlineThresholdMs ?? SESSION_OFFLINE_THRESHOLD_MS,
      },
    );
  }

  /** Start monitoring sessions. */
  public start(): void {
    if (this.running) return;
    this.running = true;
    this.detector.start();
  }

  /** Stop monitoring sessions. */
  public stop(): void {
    this.running = false;
    this.detector.stop();
  }

  /** Called when user activity is detected. */
  public onUserActivity(): void {
    this.detector.onUserActivity();
  }

  /** Check if the user is currently idle. */
  public isIdle(): boolean {
    return this.detector.isIdle();
  }

  /** Check if the user is currently offline. */
  public isOffline(): boolean {
    return this.detector.isOffline();
  }

  /** Get the current session state. */
  public getSessionState(): SessionState {
    if (this.detector.isOffline()) return 'offline';
    if (this.detector.isIdle()) return 'idle';
    return 'online';
  }

  /** Get the duration of the last absence in seconds. */
  public getLastAbsenceDuration(): number {
    return this.lastAbsenceDuration;
  }

  /** Handle return from offline state. */
  private handleReturnFromOffline(): void {
    const state = this.stateManager.getState();
    const absenceSeconds = Math.floor((Date.now() - state.lastSeen) / 1000);

    if (absenceSeconds > 0) {
      this.handleReturn(absenceSeconds);
    }
  }

  /** Handle return with absence reconciliation. */
  private handleReturn(absenceSeconds: number): void {
    this.lastAbsenceDuration = absenceSeconds;

    // Apply absence reconciliation
    this.stateManager.reconcileAbsence(absenceSeconds);

    // Record return memory event
    const severity = calculateReturnSeverity(absenceSeconds);
    const state = this.stateManager.getState();

    this.memoryStore.record({
      type: 'returned',
      severity,
      context: {
        emotion: state.emotion,
        affection: state.affection,
        morality: state.morality,
        hunger: state.hunger,
        fatigue: state.fatigue,
        trauma: state.trauma,
      },
      description: `Returned after ${this.formatAbsence(absenceSeconds)}`,
    });

    // Fire callback
    this.callbacks.onReturn(absenceSeconds);
  }

  /** Format absence duration for human-readable description. */
  private formatAbsence(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }
}
