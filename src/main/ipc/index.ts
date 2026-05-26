import type { BrowserWindow, WebContents } from 'electron';
import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

import type { InteractionEvent, NoahState, SystemMetrics } from '../../shared/types';

import { createDefaultState } from '../../shared/utils';

declare global {
  // eslint-disable-next-line no-var
  var __noahWins: BrowserWindow[] | undefined;
}

export type IpcDeps = {
  getState: () => NoahState;
  onAction: (event: InteractionEvent) => void;
  sendSystemMetrics: (wc: WebContents, metrics: SystemMetrics) => void;
};

export const registerIpc = (deps: IpcDeps): void => {
  // Renderer -> Main
  ipcMain.handle('state:request', async () => {
    return deps.getState();
  });

  ipcMain.on('action:interaction', (_event, payload: InteractionEvent) => {
    deps.onAction(payload);
  });

  ipcMain.on('debug:save-screenshot', (_event, dataUrl: string) => {
    try {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `screenshot_${new Date().getTime()}.png`;
      const dir = path.join(process.cwd(), 'screenshots');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const fullPath = path.join(dir, filename);
      fs.writeFileSync(fullPath, buffer);
      console.log(`[Main] Screenshot saved: ${fullPath}`);
    } catch (err) {
      console.error('[Main] Failed to save screenshot:', err);
    }
  });

  // Main -> Renderer
  const setupForWebContents = (wc: WebContents) => {
    // Send initial metrics/state hook.
    const metrics: SystemMetrics = {
      cpuTemp: 0,
      cpuLoad: 0,
      ramUsage: 0,
      uptime: Math.floor(process.uptime()),
      processes: [],
    };
    deps.sendSystemMetrics(wc, metrics);
  };

  // Register handler for already created windows
  for (const win of globalThis.__noahWins ?? []) {
    setupForWebContents(win.webContents);
  }

  // Subscribe to future windows via webContents event
  ipcMain.on('web-contents:ready', (_event) => {
    // no-op; placeholder if later we choose to notify.
  });
};

// Helpers to support window injection if needed later.
export const trackWindowForIpc = (win: BrowserWindow): void => {
  if (!globalThis.__noahWins) globalThis.__noahWins = [];
  globalThis.__noahWins.push(win);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  void win;
};

export const defaultStateForFallback = (): NoahState => createDefaultState();

