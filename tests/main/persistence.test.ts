import fs from 'fs';
import path from 'path';
import os from 'os';

import { saveState, loadState, AutoSaveController, migrateState } from '../../src/main/persistence/index.js';
import { ensureDataDir, getStateFilePath, getBackupFilePath } from '../../src/main/persistence/paths.js';
import { rotateBackups, loadStateWithBackup } from '../../src/main/persistence/backup.js';
import type { NoahState } from '../../src/shared/types/index.js';
import { createDefaultState } from '../../src/shared/utils/index.js';

describe('Persistence', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'noah-persistence-test-'));
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // ── saveState / loadState ────────────────────────────────
  describe('saveState / loadState', () => {
    it('saves and loads state', () => {
      const state = createDefaultState();
      saveState(state, dataDir);

      const loaded = loadState(dataDir);
      expect(loaded).not.toBeNull();
      expect(loaded?.affection).toBe(50);
      expect(loaded?.version).toBe(1);
    });

    it('returns null when no state file exists', () => {
      const loaded = loadState(dataDir);
      expect(loaded).toBeNull();
    });

    it('creates backup on save', () => {
      const state = createDefaultState();
      saveState(state, dataDir);

      // After first save, no backup yet (nothing to rotate)
      const bak1 = getBackupFilePath(dataDir, 1);
      expect(fs.existsSync(bak1)).toBe(false);

      // Second save should create bak1
      saveState({ ...state, affection: 60 }, dataDir);
      expect(fs.existsSync(bak1)).toBe(true);
    });

    it('rotates backups correctly', () => {
      const state = createDefaultState();

      // Save multiple times to create backups
      for (let i = 0; i < 5; i++) {
        saveState({ ...state, affection: 50 + i }, dataDir);
      }

      // Should have 3 backups
      expect(fs.existsSync(getBackupFilePath(dataDir, 1))).toBe(true);
      expect(fs.existsSync(getBackupFilePath(dataDir, 2))).toBe(true);
      expect(fs.existsSync(getBackupFilePath(dataDir, 3))).toBe(true);
    });
  });

  // ── Backup recovery ──────────────────────────────────────
  describe('backup recovery', () => {
    it('recovers from backup when primary file is corrupted', () => {
      const state = createDefaultState();
      saveState(state, dataDir);

      // Create a backup by saving again (first save becomes bak1)
      saveState({ ...state, affection: 60 }, dataDir);

      // Corrupt the primary file
      const stateFile = getStateFilePath(dataDir);
      fs.writeFileSync(stateFile, 'corrupted data', 'utf-8');

      // Should recover from backup (bak1 has the first state with affection=50)
      const loaded = loadState(dataDir);
      expect(loaded).not.toBeNull();
      expect(loaded?.affection).toBe(50);
    });

    it('returns null when all files are corrupted', () => {
      const state = createDefaultState();
      saveState(state, dataDir);

      // Corrupt all files
      const stateFile = getStateFilePath(dataDir);
      fs.writeFileSync(stateFile, 'corrupted', 'utf-8');

      // Also corrupt any backups that might exist
      for (let i = 1; i <= 3; i++) {
        const bak = getBackupFilePath(dataDir, i);
        if (fs.existsSync(bak)) {
          fs.writeFileSync(bak, 'corrupted', 'utf-8');
        }
      }

      const loaded = loadState(dataDir);
      expect(loaded).toBeNull();
    });
  });

  // ── rotateBackups ────────────────────────────────────────
  describe('rotateBackups', () => {
    it('rotates backups correctly', () => {
      const stateFile = getStateFilePath(dataDir);
      fs.writeFileSync(stateFile, JSON.stringify(createDefaultState()), 'utf-8');

      // First rotation
      rotateBackups(dataDir, stateFile);
      expect(fs.existsSync(getBackupFilePath(dataDir, 1))).toBe(true);
      expect(fs.existsSync(getBackupFilePath(dataDir, 2))).toBe(false);

      // Second rotation
      fs.writeFileSync(stateFile, JSON.stringify(createDefaultState()), 'utf-8');
      rotateBackups(dataDir, stateFile);
      expect(fs.existsSync(getBackupFilePath(dataDir, 1))).toBe(true);
      expect(fs.existsSync(getBackupFilePath(dataDir, 2))).toBe(true);

      // Third rotation
      fs.writeFileSync(stateFile, JSON.stringify(createDefaultState()), 'utf-8');
      rotateBackups(dataDir, stateFile);
      expect(fs.existsSync(getBackupFilePath(dataDir, 1))).toBe(true);
      expect(fs.existsSync(getBackupFilePath(dataDir, 2))).toBe(true);
      expect(fs.existsSync(getBackupFilePath(dataDir, 3))).toBe(true);

      // Fourth rotation - should still have 3 backups
      fs.writeFileSync(stateFile, JSON.stringify(createDefaultState()), 'utf-8');
      rotateBackups(dataDir, stateFile);
      expect(fs.existsSync(getBackupFilePath(dataDir, 1))).toBe(true);
      expect(fs.existsSync(getBackupFilePath(dataDir, 2))).toBe(true);
      expect(fs.existsSync(getBackupFilePath(dataDir, 3))).toBe(true);
    });
  });

  // ── AutoSaveController ───────────────────────────────────
  describe('AutoSaveController', () => {
    it('saves state on state change (debounced)', (done) => {
      const stateManager = {
        state: createDefaultState(),
        getState: function () { return this.state; },
        onStateChange: function (listener: (state: NoahState) => void) {
          this.listener = listener;
          return () => { this.listener = null; };
        },
        emitChange: function () {
          if (this.listener) this.listener(this.state);
        },
      };

      const memoryStore = { save: jest.fn() };

      const controller = new AutoSaveController(stateManager, memoryStore, dataDir, { debounceMs: 50, checkpointMs: 60000 });
      controller.start();

      // Mutate state and emit change
      stateManager.state = { ...stateManager.state, affection: 80 };
      stateManager.emitChange();

      // Wait for debounce
      setTimeout(() => {
        controller.stop();

        // Verify state was saved
        const loaded = loadState(dataDir);
        expect(loaded).not.toBeNull();
        expect(loaded?.affection).toBe(80);

        // Verify memoryStore.save() was called
        expect(memoryStore.save).toHaveBeenCalled();
        done();
      }, 150);
    });

    it('saveNow forces immediate save and saves memory', () => {
      const stateManager = {
        state: createDefaultState(),
        getState: function () { return this.state; },
        onStateChange: function () { return () => {}; },
      };

      const memoryStore = { save: jest.fn() };

      const controller = new AutoSaveController(stateManager, memoryStore, dataDir);
      controller.start();

      stateManager.state = { ...stateManager.state, affection: 90 };
      controller.saveNow();

      const loaded = loadState(dataDir);
      expect(loaded?.affection).toBe(90);

      // Verify memoryStore.save() was called
      expect(memoryStore.save).toHaveBeenCalledTimes(1);

      controller.stop();
    });

    it('stop cleans up timers', () => {
      const stateManager = {
        state: createDefaultState(),
        getState: function () { return this.state; },
        onStateChange: function () { return () => {}; },
      };

      const memoryStore = { save: jest.fn() };

      const controller = new AutoSaveController(stateManager, memoryStore, dataDir);
      controller.start();
      controller.stop();

      // Should not throw
      expect(() => controller.stop()).not.toThrow();
    });
  });

  // ── State Migration ────────────────────────────────────────
  describe('migrateState', () => {
    it('returns state unchanged when version is current', () => {
      const state = createDefaultState();
      const migrated = migrateState(state);
      expect(migrated.version).toBe(state.version);
      expect(migrated.affection).toBe(state.affection);
    });

    it('sets version to current when version field is missing', () => {
      const state = { ...createDefaultState(), version: undefined as unknown as number };
      const migrated = migrateState(state);
      expect(migrated.version).toBe(1);
    });

    it('returns fresh default state when version is newer than current', () => {
      const state = { ...createDefaultState(), version: 999 };
      const migrated = migrateState(state);
      expect(migrated.version).toBe(1);
      expect(migrated.affection).toBe(50); // default value
    });

    it('bumps version when no migrations are registered', () => {
      // With current STATE_VERSION = 1 and no migrations registered,
      // a state at version 0 should be bumped to version 1.
      const state = { ...createDefaultState(), version: 0 };
      const migrated = migrateState(state);

      expect(migrated.version).toBe(1);
      expect(migrated.affection).toBe(state.affection);
    });
  });
});
