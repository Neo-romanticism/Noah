import fs from 'fs';
import path from 'path';
import os from 'os';

import { saveState, loadState, AutoSaveController } from '../../src/main/persistence/index.js';
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

      const controller = new AutoSaveController(stateManager as any, dataDir, { debounceMs: 50, checkpointMs: 60000 });
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
        done();
      }, 150);
    });

    it('saveNow forces immediate save', () => {
      const stateManager = {
        state: createDefaultState(),
        getState: function () { return this.state; },
        onStateChange: function () { return () => {}; },
      };

      const controller = new AutoSaveController(stateManager as any, dataDir);
      controller.start();

      stateManager.state = { ...stateManager.state, affection: 90 };
      controller.saveNow();

      const loaded = loadState(dataDir);
      expect(loaded?.affection).toBe(90);

      controller.stop();
    });

    it('stop cleans up timers', () => {
      const stateManager = {
        state: createDefaultState(),
        getState: function () { return this.state; },
        onStateChange: function () { return () => {}; },
      };

      const controller = new AutoSaveController(stateManager as any, dataDir);
      controller.start();
      controller.stop();

      // Should not throw
      expect(() => controller.stop()).not.toThrow();
    });
  });
});
