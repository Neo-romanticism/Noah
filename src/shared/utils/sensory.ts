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
} from '../constants/index.js';

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
