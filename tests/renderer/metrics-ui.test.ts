/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';
import { createMetricsUI, updateMetricsUI } from '../../src/renderer/ui/metrics';
import type { SystemMetrics } from '../../src/shared/types';

describe('Metrics UI', () => {
  test('createMetricsUI returns all UI elements', () => {
    const ui = createMetricsUI();

    expect(ui.cpuBar).toBeInstanceOf(THREE.Mesh);
    expect(ui.ramBar).toBeInstanceOf(THREE.Mesh);
    expect(ui.tempDot).toBeInstanceOf(THREE.Mesh);
    expect(ui.bgPlane).toBeInstanceOf(THREE.Mesh);
    expect(ui.group).toBeInstanceOf(THREE.Group);
  });

  test('updateMetricsUI changes colors based on CPU load', () => {
    const ui = createMetricsUI();

    // Low load → green
    const lowMetrics: SystemMetrics = {
      cpuLoad: 20,
      ramUsage: 30,
      cpuTemp: 40,
      uptime: 1000,
      processes: [],
    };
    updateMetricsUI(ui, lowMetrics);
    const cpuMatLow = ui.cpuBar.material as THREE.MeshBasicMaterial;
    expect(cpuMatLow.color.getHex()).toBe(0x4ade80);

    // High load → red
    const highMetrics: SystemMetrics = {
      cpuLoad: 95,
      ramUsage: 80,
      cpuTemp: 85,
      uptime: 1000,
      processes: [],
    };
    updateMetricsUI(ui, highMetrics);
    const cpuMatHigh = ui.cpuBar.material as THREE.MeshBasicMaterial;
    expect(cpuMatHigh.color.getHex()).toBe(0xef4444);
  });

  test('updateMetricsUI scales bars with usage', () => {
    const ui = createMetricsUI();

    const metrics: SystemMetrics = {
      cpuLoad: 50,
      ramUsage: 75,
      cpuTemp: 60,
      uptime: 1000,
      processes: [],
    };
    updateMetricsUI(ui, metrics);

    // scaleX = 0.5 + (load / 100) * 1.5
    expect(ui.cpuBar.scale.x).toBeCloseTo(0.5 + 0.5 * 1.5);
    expect(ui.ramBar.scale.x).toBeCloseTo(0.5 + 0.75 * 1.5);
  });

  test('updateMetricsUI updates background weather color', () => {
    const ui = createMetricsUI();

    // Stormy weather
    const stormyMetrics: SystemMetrics = {
      cpuLoad: 95,
      ramUsage: 90,
      cpuTemp: 90,
      uptime: 1000,
      processes: [],
    };
    updateMetricsUI(ui, stormyMetrics);

    const bgMat = ui.bgPlane.material as THREE.MeshBasicMaterial;
    // stormy color is '#2f4f4f' = 0x2f4f4f
    expect(bgMat.color.getHex()).toBe(0x2f4f4f);
  });
});
