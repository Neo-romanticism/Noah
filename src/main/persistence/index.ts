/**
 * Persistence layer — save/load state with auto-save controller.
 *
 * Provides:
 * - Atomic save with backup rotation
 * - Load with automatic backup recovery
 * - AutoSaveController with 3 triggers: debounced mutation, graceful shutdown, periodic checkpoint
 */

import fs from 'fs';

import type { NoahState } from '../../shared/types/index.js';
import {
  SAVE_DEBOUNCE_MS,
  CHECKPOINT_INTERVAL_MS,
  STATE_VERSION,
} from '../../shared/constants/index.js';
import { createDefaultState } from '../../shared/utils/index.js';
import type { StateManager } from '../state/index.js';
import type { MemoryStore } from '../memory/index.js';
import { getStateFilePath } from './paths.js';
import { rotateBackups, loadStateWithBackup } from './backup.js';

export { ensureDataDir, getDataPath } from './paths.js';

// ── Save / Load ─────────────────────────────────────────────

/**
 * Save state to disk atomically with backup rotation.
 */
export const saveState = (state: NoahState, dataDir: string): void => {
  const filePath = getStateFilePath(dataDir);

  // Rotate backups before writing
  rotateBackups(dataDir, filePath);

  // Atomic write: temp file + rename
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmp, filePath);
};

/**
 * Load state from disk with automatic backup recovery.
 * Returns the loaded state, or null if no valid state exists.
 */
export const loadState = (dataDir: string): NoahState | null => {
  const filePath = getStateFilePath(dataDir);
  const loaded = loadStateWithBackup(dataDir, filePath);
  if (loaded === null) return null;
  return migrateState(loaded);
};

// ── State Migration ───────────────────────────────────────────

/** Migration functions keyed by target version number. */
const MIGRATIONS: Record<number, (state: NoahState) => NoahState> = {};

/**
 * Apply sequential migrations to bring a loaded state up to the current version.
 * If the state version is missing or newer than expected, returns a fresh default state.
 */
export const migrateState = (state: NoahState): NoahState => {
  const currentVersion = state.version ?? 0;

  // If version is newer than we know about, reset to defaults (schema mismatch)
  if (currentVersion > STATE_VERSION) {
    return createDefaultState();
  }

  // Apply migrations sequentially from currentVersion + 1 up to STATE_VERSION
  let migrated = state;
  for (let v = currentVersion + 1; v <= STATE_VERSION; v++) {
    const migration = MIGRATIONS[v];
    if (migration !== undefined) {
      migrated = migration(migrated);
    }
  }

  // Ensure version is up to date
  if (migrated.version !== STATE_VERSION) {
    migrated = { ...migrated, version: STATE_VERSION };
  }

  return migrated;
};

// ── AutoSaveController ──────────────────────────────────────

export interface AutoSaveControllerOptions {
  debounceMs?: number;
  checkpointMs?: number;
}

/**
 * Controls automatic saving of state on three triggers:
 * 1. Debounced save after state mutations
 * 2. Immediate save on graceful shutdown
 * 3. Periodic checkpoint save
 */
export class AutoSaveController {
  private readonly stateManager: Pick<StateManager, 'getState' | 'onStateChange'>;
  private readonly memoryStore: Pick<MemoryStore, 'save'>;
  private readonly dataDir: string;
  private readonly debounceMs: number;
  private readonly checkpointMs: number;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private checkpointTimer: ReturnType<typeof setInterval> | null = null;
  private onStateChangeUnsubscribe: (() => void) | null = null;
  private running = false;

  constructor(
    stateManager: Pick<StateManager, 'getState' | 'onStateChange'>,
    memoryStore: Pick<MemoryStore, 'save'>,
    dataDir: string,
    options?: AutoSaveControllerOptions,
  ) {
    this.stateManager = stateManager;
    this.memoryStore = memoryStore;
    this.dataDir = dataDir;
    this.debounceMs = options?.debounceMs ?? SAVE_DEBOUNCE_MS;
    this.checkpointMs = options?.checkpointMs ?? CHECKPOINT_INTERVAL_MS;
  }

  /** Start listening for state changes and begin periodic checkpoint timer. */
  public start(): void {
    if (this.running) return;
    this.running = true;

    // Subscribe to state changes for debounced save
    this.onStateChangeUnsubscribe = this.stateManager.onStateChange(() => {
      this.scheduleDebouncedSave();
    });

    // Periodic checkpoint
    this.checkpointTimer = setInterval(() => {
      this.saveNow();
    }, this.checkpointMs);
  }

  /** Stop all timers and listeners. */
  public stop(): void {
    this.running = false;

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.checkpointTimer !== null) {
      clearInterval(this.checkpointTimer);
      this.checkpointTimer = null;
    }

    if (this.onStateChangeUnsubscribe !== null) {
      this.onStateChangeUnsubscribe();
      this.onStateChangeUnsubscribe = null;
    }
  }

  /** Force an immediate save. */
  public saveNow(): void {
    // Cancel any pending debounced save
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    const state = this.stateManager.getState();
    saveState(state, this.dataDir);
    this.memoryStore.save();
  }

  /** Schedule a debounced save. */
  private scheduleDebouncedSave(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.saveNow();
    }, this.debounceMs);
  }
}
