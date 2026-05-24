/**
 * User presence detection for session tracking.
 *
 * Detects user activity via:
 * - powerMonitor for system lock/unlock
 * - Activity callback for IPC-driven input detection from renderer
 */

import { powerMonitor } from 'electron';

export type PresenceState = 'active' | 'idle' | 'offline';

export interface PresenceDetectorCallbacks {
  onActive: () => void;
  onIdle: () => void;
  onOffline: () => void;
}

/**
 * Detects user presence state transitions.
 *
 * Uses Electron's powerMonitor for system-level events
 * and an activity callback for renderer-driven input detection.
 */
export class PresenceDetector {
  private readonly callbacks: PresenceDetectorCallbacks;
  private readonly idleThresholdMs: number;
  private readonly offlineThresholdMs: number;
  private lastActivity: number;
  private state: PresenceState = 'active';
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    callbacks: PresenceDetectorCallbacks,
    options?: {
      idleThresholdMs?: number;
      offlineThresholdMs?: number;
    },
  ) {
    this.callbacks = callbacks;
    this.idleThresholdMs = options?.idleThresholdMs ?? 300_000; // 5 min
    this.offlineThresholdMs = options?.offlineThresholdMs ?? 3_600_000; // 1 hour
    this.lastActivity = Date.now();
  }

  /** Start monitoring presence. */
  public start(): void {
    if (this.running) return;
    this.running = true;

    // Poll for state transitions every 10 seconds
    this.checkInterval = setInterval(() => {
      this.checkPresence();
    }, 10_000);

    // Listen for system lock/unlock
    powerMonitor.on('lock-screen', () => {
      this.transitionTo('offline');
    });

    powerMonitor.on('unlock-screen', () => {
      this.onUserActivity();
    });
  }

  /** Stop monitoring presence. */
  public stop(): void {
    this.running = false;

    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    powerMonitor.removeAllListeners('lock-screen');
    powerMonitor.removeAllListeners('unlock-screen');
  }

  /** Called when user activity is detected (from IPC or system events). */
  public onUserActivity(): void {
    this.lastActivity = Date.now();

    if (this.state !== 'active') {
      this.transitionTo('active');
    }
  }

  /** Get the current presence state. */
  public getState(): PresenceState {
    return this.state;
  }

  /** Get milliseconds since last user activity. */
  public getTimeSinceLastActivity(): number {
    return Date.now() - this.lastActivity;
  }

  /** Check if the user is currently idle. */
  public isIdle(): boolean {
    return this.state === 'idle';
  }

  /** Check if the user is currently offline. */
  public isOffline(): boolean {
    return this.state === 'offline';
  }

  /** Polling check for state transitions. */
  private checkPresence(): void {
    const elapsed = this.getTimeSinceLastActivity();

    if (elapsed >= this.offlineThresholdMs) {
      this.transitionTo('offline');
    } else if (elapsed >= this.idleThresholdMs) {
      this.transitionTo('idle');
    }
  }

  /** Transition to a new presence state, calling callbacks. */
  private transitionTo(newState: PresenceState): void {
    if (this.state === newState) return;

    this.state = newState;

    switch (newState) {
      case 'active':
        this.callbacks.onActive();
        break;
      case 'idle':
        this.callbacks.onIdle();
        break;
      case 'offline':
        this.callbacks.onOffline();
        break;
    }
  }
}
