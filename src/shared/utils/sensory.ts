/**
 * Sensory translation layer — converts system metrics into Noah's bodily sensations.
 *
 * All functions are pure and deterministic, making them trivially testable
 * and usable in both main and renderer processes.
 */

import {
  CPU_LOAD_COMFORTABLE_MAX,
  CPU_LOAD_WARM_MAX,
  CPU_LOAD_HOT_MAX,
  RAM_USAGE_HEAVY_MAX,
  RAM_USAGE_LIGHT_MAX,
} from '../constants';


/**
 * Translate CPU load (0-100) into a bodily sensation description.
 *
 * Returns a short phrase Noah might use to describe how she feels.
 */
export const translateCpuLoad = (load: number): string => {
  if (load <= CPU_LOAD_COMFORTABLE_MAX) {
    return 'cool and relaxed';
  }
  if (load <= CPU_LOAD_WARM_MAX) {
    return 'warm and active';
  }
  if (load <= CPU_LOAD_HOT_MAX) {
    return 'hot, working hard';
  }
  return 'overheating, struggling';
};

/**
 * Get a color hex string representing CPU load intensity.
 * Useful for renderer visualization.
 */
export const cpuLoadColor = (load: number): string => {
  if (load <= CPU_LOAD_COMFORTABLE_MAX) return '#4ade80'; // green
  if (load <= CPU_LOAD_WARM_MAX) return '#facc15';       // yellow
  if (load <= CPU_LOAD_HOT_MAX) return '#fb923c';        // orange
  return '#ef4444';                                      // red
};

/**
 * Translate RAM usage (0-100) into a bodily sensation description.
 */
export const translateRamUsage = (usage: number): string => {
  if (usage <= RAM_USAGE_LIGHT_MAX) return 'light and spacious';
  if (usage <= RAM_USAGE_HEAVY_MAX) return 'getting crowded';
  return 'stuffed, can barely breathe';
};

/**
 * Get a color hex string representing RAM usage intensity.
 * Useful for renderer visualization.
 */
export const ramUsageColor = (usage: number): string => {
  if (usage <= RAM_USAGE_LIGHT_MAX) return '#60a5fa'; // blue
  if (usage <= RAM_USAGE_HEAVY_MAX) return '#a78bfa'; // purple
  return '#f472b6'; // pink
};

