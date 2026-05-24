import type { BrowserWindow, WebContents } from 'electron';
import { ipcMain } from 'electron';

import type { InteractionEvent, NoahState } from '../../shared/types';

import { createDefaultState } from '../../shared/utils';

export type IpcDeps = {
  getState: () => NoahState;
  onAction: (event: InteractionEvent) => void;
  sendSystemMetrics: (wc: WebContents) => void;
};

export const registerIpc = (deps: IpcDeps): void => {
  // Renderer -> Main
  ipcMain.handle('state:request', async () => {
    return deps.getState();
  });

  ipcMain.on('action:interaction', (_event, payload: InteractionEvent) => {
    deps.onAction(payload);
  });

  // Main -> Renderer
  const setupForWebContents = (wc: WebContents) => {
    // Send initial metrics/state hook.
    deps.sendSystemMetrics(wc);
  };

  // Register handler for already created windows
  for (const win of (globalThis as any).__noahWins ?? []) {
    setupForWebContents(win.webContents);
  }

  // Subscribe to future windows via webContents event
  ipcMain.on('web-contents:ready', (_event) => {
    // no-op; placeholder if later we choose to notify.
  });
};

// Helpers to support window injection if needed later.
export const trackWindowForIpc = (win: BrowserWindow): void => {
  const g = globalThis as any;
  if (!g.__noahWins) g.__noahWins = [];
  g.__noahWins.push(win);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  void win;
};

export const defaultStateForFallback = (): NoahState => createDefaultState();

