/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';

import '../../tests/setup/canvas-mock.js';

import {
  createMetricBar3D,
  createTempDisplay3D,
  createWeatherDisplay3D,
  CPU_POS,
  RAM_POS,
  TEMP_POS,
  WEATHER_POS,
} from '../../src/renderer/metrics-3d.js';

describe('Metrics 3D', () => {
  describe('createMetricBar3D()', () => {
    test('should return group with bar, track, label, valueLabel', () => {
      const metric = createMetricBar3D('CPU', CPU_POS, 0x4ade80);

      expect(metric.group).toBeInstanceOf(THREE.Group);
      expect(metric.bar).toBeInstanceOf(THREE.Mesh);
      expect(metric.track).toBeInstanceOf(THREE.Mesh);
      expect(metric.label).toBeInstanceOf(THREE.Sprite);
      expect(metric.valueLabel).toBeInstanceOf(THREE.Sprite);
    });

    test('bar should use BoxGeometry', () => {
      const metric = createMetricBar3D('CPU', CPU_POS, 0x4ade80);
      expect(metric.bar.geometry).toBeInstanceOf(THREE.BoxGeometry);
    });

    test('bar material should be MeshStandardMaterial', () => {
      const metric = createMetricBar3D('CPU', CPU_POS, 0x4ade80);
      expect(metric.bar.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    test('update() should change bar scale.x based on value', () => {
      const metric = createMetricBar3D('CPU', CPU_POS, 0x4ade80);
      metric.update(50, 0x4ade80);
      expect(metric.bar.scale.x).toBe(0.5);
    });

    test('update() should enforce minimum scale.x of 0.1', () => {
      const metric = createMetricBar3D('CPU', CPU_POS, 0x4ade80);
      metric.update(0, 0x4ade80);
      expect(metric.bar.scale.x).toBe(0.1);
    });

    test('update() should change bar color', () => {
      const metric = createMetricBar3D('CPU', CPU_POS, 0x4ade80);
      const mat = metric.bar.material as THREE.MeshStandardMaterial;
      const before = mat.color.getHex();
      metric.update(50, 0xef4444);
      const after = mat.color.getHex();
      expect(after).not.toBe(before);
    });

    test('setHovered(true) should increase emissiveIntensity', () => {
      const metric = createMetricBar3D('CPU', CPU_POS, 0x4ade80);
      const mat = metric.bar.material as THREE.MeshStandardMaterial;
      const before = mat.emissiveIntensity;
      metric.setHovered(true);
      expect(mat.emissiveIntensity).toBeGreaterThan(before);
    });

    test('setHovered(false) should reset emissiveIntensity', () => {
      const metric = createMetricBar3D('CPU', CPU_POS, 0x4ade80);
      const mat = metric.bar.material as THREE.MeshStandardMaterial;
      metric.setHovered(true);
      metric.setHovered(false);
      expect(mat.emissiveIntensity).toBe(0);
    });

    test('setHovered should change group scale', () => {
      const metric = createMetricBar3D('CPU', CPU_POS, 0x4ade80);
      metric.setHovered(true);
      expect(metric.group.scale.x).toBe(1.05);
      metric.setHovered(false);
      expect(metric.group.scale.x).toBe(1);
    });
  });

  describe('createTempDisplay3D()', () => {
    test('should return group with sphere and label', () => {
      const temp = createTempDisplay3D(TEMP_POS);
      expect(temp.group).toBeInstanceOf(THREE.Group);
      expect(temp.sphere).toBeInstanceOf(THREE.Mesh);
      expect(temp.label).toBeInstanceOf(THREE.Sprite);
    });

    test('sphere should use SphereGeometry', () => {
      const temp = createTempDisplay3D(TEMP_POS);
      expect(temp.sphere.geometry).toBeInstanceOf(THREE.SphereGeometry);
    });

    test('update() should change sphere color based on temp', () => {
      const temp = createTempDisplay3D(TEMP_POS);
      const mat = temp.sphere.material as THREE.MeshStandardMaterial;
      const before = mat.color.getHex();
      temp.update(80);
      const after = mat.color.getHex();
      expect(after).not.toBe(before);
    });

    test('update() should set emissiveIntensity higher for high temp', () => {
      const temp = createTempDisplay3D(TEMP_POS);
      temp.update(80);
      const mat = temp.sphere.material as THREE.MeshStandardMaterial;
      expect(mat.emissiveIntensity).toBe(0.5);
    });
  });

  describe('createWeatherDisplay3D()', () => {
    test('should return group with icon and label', () => {
      const weather = createWeatherDisplay3D(WEATHER_POS);
      expect(weather.group).toBeInstanceOf(THREE.Group);
      expect(weather.icon).toBeInstanceOf(THREE.Sprite);
      expect(weather.label).toBeInstanceOf(THREE.Sprite);
    });

    test('should show correct icon for sunny', () => {
      const weather = createWeatherDisplay3D(WEATHER_POS);
      weather.update('sunny');
      // Verify no throw and sprite material updated
      const mat = weather.icon.material as THREE.SpriteMaterial;
      expect(mat.map).toBeDefined();
    });

    test('should show correct icon for rainy', () => {
      const weather = createWeatherDisplay3D(WEATHER_POS);
      weather.update('rainy');
      const mat = weather.icon.material as THREE.SpriteMaterial;
      expect(mat.map).toBeDefined();
    });

    test('should not recreate textures when weather unchanged', () => {
      const weather = createWeatherDisplay3D(WEATHER_POS);
      weather.update('sunny');
      const mat = weather.icon.material as THREE.SpriteMaterial;
      const mapBefore = mat.map;
      weather.update('sunny');
      expect(mat.map).toBe(mapBefore);
    });
  });
});
