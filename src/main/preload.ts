import { contextBridge, ipcRenderer } from 'electron';

import type { NoahState, InteractionEvent, SystemMetrics } from '../shared/types';

export interface NoahPreloadAPI {
  /** `true` when the app was started via `npm start` (development mode). */
  readonly isDev: boolean;
  getState: () => Promise<NoahState>;
  onStateUpdate: (callback: (state: NoahState) => void) => void;
  sendInteraction: (action: InteractionEvent) => void;
  onSystemMetrics: (callback: (metrics: SystemMetrics) => void) => void;
}

contextBridge.exposeInMainWorld('noah', {
  isDev: process.env.NODE_ENV !== 'production',

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
});

declare global {
  interface Window {
    noah: NoahPreloadAPI;
  }
}
