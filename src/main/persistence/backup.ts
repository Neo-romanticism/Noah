/**
 * Backup rotation and corruption recovery for state persistence.
 *
 * Maintains up to MAX_BACKUP_COUNT rotating backups.
 * On load, if the primary file is corrupted, attempts recovery
 * from backups in order (bak1 → bak2 → bak3).
 */

import fs from 'fs';

import type { NoahState } from '../../shared/types/index.js';
import { isValidState } from '../../shared/utils/index.js';
import { MAX_BACKUP_COUNT } from '../../shared/constants/index.js';
import { getBackupFilePath } from './paths.js';

/**
 * Rotate backups before writing a new state file.
 * bak3 → remove, bak2 → bak3, bak1 → bak2, current → bak1
 */
export const rotateBackups = (dataDir: string, currentFilePath: string): void => {
  // Remove the oldest backup
  const oldest = getBackupFilePath(dataDir, MAX_BACKUP_COUNT);
  if (fs.existsSync(oldest)) {
    fs.unlinkSync(oldest);
  }

  // Shift backups
  for (let i = MAX_BACKUP_COUNT - 1; i >= 1; i--) {
    const src = getBackupFilePath(dataDir, i);
    const dst = getBackupFilePath(dataDir, i + 1);
    if (fs.existsSync(src)) {
      fs.renameSync(src, dst);
    }
  }

  // Rename current file to bak1
  if (fs.existsSync(currentFilePath)) {
    const bak1 = getBackupFilePath(dataDir, 1);
    fs.renameSync(currentFilePath, bak1);
  }
};

/**
 * Attempt to load a valid state from a file path.
 * Returns the parsed state if valid, null otherwise.
 */
const tryLoadFile = (filePath: string): NoahState | null => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as NoahState;
    return isValidState(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Load state with automatic backup recovery.
 *
 * Tries the primary file first, then each backup in order.
 * Returns null only if all files are corrupted or missing.
 */
export const loadStateWithBackup = (
  dataDir: string,
  stateFilePath: string,
): NoahState | null => {
  // Try primary file
  const primary = tryLoadFile(stateFilePath);
  if (primary !== null) return primary;

  // Try backups in order
  for (let i = 1; i <= MAX_BACKUP_COUNT; i++) {
    const backupPath = getBackupFilePath(dataDir, i);
    const backup = tryLoadFile(backupPath);
    if (backup !== null) return backup;
  }

  return null;
};
