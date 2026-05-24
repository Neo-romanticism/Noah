/**
 * Sensory translation layer — converts system metrics into Noah's bodily sensations.
 *
 * All functions are pure and deterministic, making them trivially testable
 * and usable in both main and renderer processes.
 */

import type { SystemMetrics, SystemWeather } from '../types';
import {
  CPU_LOAD_COMFORTABLE_MAX,
  CPU_LOAD_WARM_MAX,
  CPU_LOAD_HOT_MAX,
  RAM_USAGE_HEAVY_MAX,
  RAM_USAGE_LIGHT_MAX,
  RAM_USAGE_WARM_MAX,
  CPU_TEMP_NORMAL_MAX,
  CPU_TEMP_WARNING_MAX,
  WEATHER_CLOUDY_MIN,
  WEATHER_RAINY_MIN,
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

/**
 * Translate CPU temperature (°C) into a bodily sensation description.
 * Returns 0 (unknown) or negative as 'temperature unknown'.
 */
export const translateCpuTemp = (temp: number): string => {
  if (temp <= 0) return 'temperature unknown';
  if (temp <= CPU_TEMP_NORMAL_MAX) return 'comfortable';
  if (temp <= CPU_TEMP_WARNING_MAX) return 'warm, slightly feverish';
  return 'burning up, dangerously hot';
};

/**
 * Get a color hex string representing CPU temperature.
 * Returns gray for unknown temperatures.
 */
export const cpuTempColor = (temp: number): string => {
  if (temp <= 0) return '#9ca3af';   // gray (unknown)
  if (temp <= CPU_TEMP_NORMAL_MAX) return '#4ade80'; // green
  if (temp <= CPU_TEMP_WARNING_MAX) return '#facc15'; // yellow
  return '#ef4444'; // red
};

export const deriveWeather = (metrics: SystemMetrics): SystemWeather => {
  // Critical overrides everything
  if (metrics.cpuLoad > CPU_LOAD_HOT_MAX) return 'stormy';
  if (metrics.ramUsage > RAM_USAGE_HEAVY_MAX) return 'stormy';
  if (metrics.cpuTemp > CPU_TEMP_WARNING_MAX) return 'stormy';

  let score = 0;
  if (metrics.cpuLoad > CPU_LOAD_WARM_MAX) score += 1;
  if (metrics.ramUsage > RAM_USAGE_WARM_MAX) score += 1;
  if (metrics.cpuTemp > CPU_TEMP_NORMAL_MAX) score += 1;

  if (score >= WEATHER_RAINY_MIN) return 'rainy';
  if (score >= WEATHER_CLOUDY_MIN) return 'cloudy';
  return 'sunny';
};

export const weatherColor = (weather: SystemWeather): string => {
  switch (weather) {
    case 'sunny':  return '#87ceeb';  // sky blue
    case 'cloudy': return '#b0c4de';  // light steel blue
    case 'rainy':  return '#708090';  // slate gray
    case 'stormy': return '#2f4f4f';  // dark slate gray
  }
};

