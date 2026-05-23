import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('noah', {
  // State
  getState: () => ipcRenderer.invoke('state:request'),
  onStateUpdate: (callback: (state: unknown) => void) => {
    ipcRenderer.on('state:update', (_event, state) => callback(state));
  },

  // Actions
  sendInteraction: (action: unknown) => {
    ipcRenderer.send('action:interaction', action);
  },

  // System metrics
  onSystemMetrics: (callback: (metrics: unknown) => void) => {
    ipcRenderer.on('system:metrics', (_event, metrics) => callback(metrics));
  },
});
