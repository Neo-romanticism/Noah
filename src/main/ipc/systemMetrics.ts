import type { WebContents } from 'electron';
import { SystemPoller } from '../system/poller.js';

// Track active pollers per WebContents to prevent leaks on re-registration.
const activePollers = new WeakMap<WebContents, SystemPoller>();

/**
 * @deprecated This module is no longer used. System metrics polling is now
 * managed centrally by a single SystemPoller in main/index.ts to prevent
 * duplicate IPC transmissions. Kept for reference; safe to remove once
 * Slice 4+ confirms no external consumers.
 *
 * Start a system metrics ticker for the given WebContents.
 *
 * Uses SystemPoller (real OS metrics) instead of placeholder values.
 * Deduplicates on re-registration to prevent timer leaks.
 */
export const systemTicker = (webContents: WebContents): void => {
  // Deduplicate: stop any existing poller for this WebContents.
  const existing = activePollers.get(webContents);
  if (existing !== undefined) {
    existing.stop();
  }

  const poller = new SystemPoller();

  poller.onMetrics((metrics) => {
    webContents.send('system:metrics', metrics);
  });

  poller.start();
  activePollers.set(webContents, poller);

  webContents.once('destroyed', () => {
    poller.stop();
    activePollers.delete(webContents);
  });
};

