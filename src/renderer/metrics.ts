import * as THREE from 'three';
import type { SystemMetrics } from '../shared/types/index.js';
import {
  ramUsageColor,
  deriveWeather,
  weatherColor,
} from '../shared/utils/sensory.js';
import {
  createMetricBar3D,
  createTempDisplay3D,
  createWeatherDisplay3D,
  CPU_POS,
  RAM_POS,
  TEMP_POS,
  WEATHER_POS,
} from './metrics-3d.js';

export interface MetricsDisplay {
  cpuMetric: ReturnType<typeof createMetricBar3D>;
  ramMetric: ReturnType<typeof createMetricBar3D>;
  tempDisplay: ReturnType<typeof createTempDisplay3D>;
  weatherDisplay: ReturnType<typeof createWeatherDisplay3D>;
  weatherPlane: THREE.Mesh;
  addToScene(scene: THREE.Scene): void;
  update(metrics: SystemMetrics): void;
}

export function createMetricsDisplay(): MetricsDisplay {
  const cpuMetric = createMetricBar3D('CPU', CPU_POS, 0x4ade80);
  const ramMetric = createMetricBar3D('RAM', RAM_POS, 0x60a5fa);
  const tempDisplay = createTempDisplay3D(TEMP_POS);
  const weatherDisplay = createWeatherDisplay3D(WEATHER_POS);

  const weatherMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb });
  const weatherPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    weatherMat,
  );
  weatherPlane.position.set(0, 0, -5.01);

  return {
    cpuMetric,
    ramMetric,
    tempDisplay,
    weatherDisplay,
    weatherPlane,

    addToScene(scene: THREE.Scene): void {
      scene.add(cpuMetric.group);
      scene.add(ramMetric.group);
      scene.add(tempDisplay.group);
      scene.add(weatherDisplay.group);
      scene.add(weatherPlane);
    },

    update(metrics: SystemMetrics): void {
      const cpuColor = metrics.cpuLoad <= 30 ? 0x4ade80
        : metrics.cpuLoad <= 60 ? 0xfacc15
        : metrics.cpuLoad <= 85 ? 0xfb923c
        : 0xef4444;
      cpuMetric.update(metrics.cpuLoad, new THREE.Color(cpuColor));

      ramMetric.update(metrics.ramUsage, ramUsageColor(metrics.ramUsage));
      tempDisplay.update(metrics.cpuTemp);

      const weather = deriveWeather(metrics);
      weatherDisplay.update(weather);
      weatherMat.color.set(weatherColor(weather));
    },
  };
}
