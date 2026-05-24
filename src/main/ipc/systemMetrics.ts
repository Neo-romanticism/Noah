import type { WebContents } from 'electron';
import type { SystemMetrics } from '../../shared/types';

// Stage 1: simple placeholder metrics ticker.

// Later stages will replace with real OS/per-process metrics.
export const systemTicker = (webContents: WebContents): void => {
  const send = () => {
    const metrics: SystemMetrics = {
      cpuTemp: 0,
      cpuLoad: 0,
      ramUsage: 0,
      uptime: Math.floor(process.uptime()),
    };
    webContents.send('system:metrics', metrics);
  };

  send();

  const interval = setInterval(send, 5_000);

  webContents.once('destroyed', () => {
    clearInterval(interval);
  });
};

