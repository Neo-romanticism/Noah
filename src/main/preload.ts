import { contextBridge, ipcRenderer } from 'electron';

import type { NoahState, InteractionEvent, SystemMetrics } from '../shared/types';

export interface NoahPreloadAPI {
  getState: () => Promise<NoahState>;
  onStateUpdate: (callback: (state: NoahState) => void) => void;
  sendInteraction: (action: InteractionEvent) => void;
  onSystemMetrics: (callback: (metrics: SystemMetrics) => void) => void;
  saveScreenshot: (dataUrl: string) => void;
}

contextBridge.exposeInMainWorld('noah', {
  // State
  getState: () => ipcRenderer.invoke('state:request'),
  onStateUpdate: (callback: (state: NoahState) => void) => {
    ipcRenderer.on('state:update', (_event, state) => callback(state as NoahState));
  },

  // Actions
  sendInteraction: (action: InteractionEvent) => {
    ipcRenderer.send('action:interaction', action);
  },

  // System metrics
  onSystemMetrics: (callback: (metrics: SystemMetrics) => void) => {
    ipcRenderer.on('system:metrics', (_event, metrics) => callback(metrics as SystemMetrics));
  },

  // Debug/Diagnostics
  saveScreenshot: (dataUrl: string) => {
    ipcRenderer.send('debug:save-screenshot', dataUrl);
  },
});

declare global {
  interface Window {
    noah: NoahPreloadAPI;
  }
}
