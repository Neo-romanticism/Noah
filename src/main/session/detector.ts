/**
 * User presence detection for session tracking.
 *
 * Detects user activity via:
 * - powerMonitor for system lock/unlock
 * - Activity callback for IPC-driven input detection from renderer
 */

import { powerMonitor } from 'electron';
import {
  SESSION_IDLE_THRESHOLD_MS,
  SESSION_OFFLINE_THRESHOLD_MS,
} from '../../shared/constants/index.js';

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

  /** Bound listener references for clean removal. */
  private readonly onLockScreen: () => void;
  private readonly onUnlockScreen: () => void;

  constructor(
    callbacks: PresenceDetectorCallbacks,
    options?: {
      idleThresholdMs?: number;
      offlineThresholdMs?: number;
    },
  ) {
    this.callbacks = callbacks;
    this.idleThresholdMs = options?.idleThresholdMs ?? SESSION_IDLE_THRESHOLD_MS;
    this.offlineThresholdMs = options?.offlineThresholdMs ?? SESSION_OFFLINE_THRESHOLD_MS;
    this.lastActivity = Date.now();

    // Create bound listener references so we can remove them individually
    this.onLockScreen = () => this.transitionTo('offline');
    this.onUnlockScreen = () => this.onUserActivity();
  }

  /** Start monitoring presence. */
  public start(): void {
    if (this.running) return;
    this.running = true;

    // Poll for state transitions every 10 seconds
    this.checkInterval = setInterval(() => {
      this.checkPresence();
    }, 10_000);

    // Remove any previously registered listeners to prevent duplicates,
    // then register our own.
    powerMonitor.removeListener('lock-screen', this.onLockScreen);
    powerMonitor.removeListener('unlock-screen', this.onUnlockScreen);
    powerMonitor.on('lock-screen', this.onLockScreen);
    powerMonitor.on('unlock-screen', this.onUnlockScreen);
  }

  /** Stop monitoring presence. */
  public stop(): void {
    this.running = false;

    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Only remove our own listeners, not those from other modules
    powerMonitor.removeListener('lock-screen', this.onLockScreen);
    powerMonitor.removeListener('unlock-screen', this.onUnlockScreen);
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
