/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';

import '../../tests/setup/canvas-mock.js';

import { createMetricsDisplay } from '../../src/renderer/metrics.js';

describe('Metrics', () => {
  let scene: THREE.Scene;
  let display: ReturnType<typeof createMetricsDisplay>;

  beforeEach(() => {
    scene = new THREE.Scene();
    display = createMetricsDisplay();
  });

  describe('addToScene()', () => {
    test('should add all metric groups to scene', () => {
      display.addToScene(scene);

      expect(scene.children).toContain(display.cpuMetric.group);
      expect(scene.children).toContain(display.ramMetric.group);
      expect(scene.children).toContain(display.tempDisplay.group);
      expect(scene.children).toContain(display.weatherDisplay.group);
      expect(scene.children).toContain(display.weatherPlane);
    });

    test('should place weatherPlane at z=-5.01', () => {
      display.addToScene(scene);
      expect(display.weatherPlane.position.z).toBeCloseTo(-5.01);
    });
  });

  describe('update()', () => {
    test('should update CPU bar with load value', () => {
      const beforeScale = display.cpuMetric.bar.scale.x;
      display.update({
        cpuLoad: 50,
        ramUsage: 0,
        cpuTemp: 0,
        uptime: 0,
        processes: [],
      });
      expect(display.cpuMetric.bar.scale.x).not.toBe(beforeScale);
    });

    test('should update RAM bar with usage value', () => {
      const beforeScale = display.ramMetric.bar.scale.x;
      display.update({
        cpuLoad: 0,
        ramUsage: 75,
        cpuTemp: 0,
        uptime: 0,
        processes: [],
      });
      expect(display.ramMetric.bar.scale.x).not.toBe(beforeScale);
    });

    test('should update temp display with temp value', () => {
      const beforeColor = (display.tempDisplay.sphere.material as THREE.MeshStandardMaterial).color.getHex();
      display.update({
        cpuLoad: 0,
        ramUsage: 0,
        cpuTemp: 80,
        uptime: 0,
        processes: [],
      });
      const afterColor = (display.tempDisplay.sphere.material as THREE.MeshStandardMaterial).color.getHex();
      expect(afterColor).not.toBe(beforeColor);
    });

    test('should update weather display with derived weather', () => {
      display.update({
        cpuLoad: 10,
        ramUsage: 20,
        cpuTemp: 30,
        uptime: 0,
        processes: [],
      });
      const mat = display.weatherDisplay.label.material as THREE.SpriteMaterial;
      expect(mat.map).toBeDefined();
    });

    test('should update weatherPlane color', () => {
      const beforeColor = (display.weatherPlane.material as THREE.MeshBasicMaterial).color.getHex();
      display.update({
        cpuLoad: 95,
        ramUsage: 95,
        cpuTemp: 95,
        uptime: 0,
        processes: [],
      });
      const afterColor = (display.weatherPlane.material as THREE.MeshBasicMaterial).color.getHex();
      expect(afterColor).not.toBe(beforeColor);
    });
  });

  describe('Metric positions', () => {
    test('CPU metric should be on left side of back wall', () => {
      expect(display.cpuMetric.group.position.x).toBeLessThan(0);
      expect(display.cpuMetric.group.position.z).toBeCloseTo(-4.6, 1);
    });

    test('RAM metric should be on right side of back wall', () => {
      expect(display.ramMetric.group.position.x).toBeGreaterThan(0);
      expect(display.ramMetric.group.position.z).toBeCloseTo(-4.6, 1);
    });

    test('Temp display should be below RAM', () => {
      expect(display.tempDisplay.group.position.y).toBeLessThan(display.ramMetric.group.position.y);
      expect(display.tempDisplay.group.position.x).toBe(display.ramMetric.group.position.x);
    });

    test('Weather display should be above window', () => {
      expect(display.weatherDisplay.group.position.y).toBeGreaterThan(2.5);
      expect(display.weatherDisplay.group.position.x).toBe(0);
    });
  });
});
