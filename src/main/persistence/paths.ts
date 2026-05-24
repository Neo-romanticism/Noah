/**
 * Path utilities for the persistence layer.
 *
 * Consolidates all file path logic so that data directory,
 * state file, and memory file paths are derived consistently.
 */

import { app } from 'electron';
import fs from 'fs';
import path from 'path';

import { SAVE_FILENAME, MEMORY_FILENAME } from '../../shared/constants/index.js';

const DIR_NAME = 'noah';

/** Get the base data directory path. */
export const getDataPath = (): string => {
  const base = app.getPath('userData');
  return path.join(base, DIR_NAME);
};

/** Ensure the data directory exists, creating it if necessary. */
export const ensureDataDir = (dataDir?: string): string => {
  const dir = dataDir ?? getDataPath();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

/** Get the path to the state JSON file. */
export const getStateFilePath = (dataDir: string): string => {
  return path.join(dataDir, SAVE_FILENAME);
};

/** Get the path to the memories JSON file. */
export const getMemoryFilePath = (dataDir: string): string => {
  return path.join(dataDir, MEMORY_FILENAME);
};

/** Generate a backup file path for a given index (1-based). */
export const getBackupFilePath = (dataDir: string, index: number): string => {
  return path.join(dataDir, `${SAVE_FILENAME}.bak${index}`);
};
