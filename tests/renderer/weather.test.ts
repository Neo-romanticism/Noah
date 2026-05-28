/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';
import { createWeatherEffects } from '../../src/renderer/weather.js';

describe('Weather Effects', () => {
  describe('createWeatherEffects()', () => {
    let fx: ReturnType<typeof createWeatherEffects>;

    beforeEach(() => {
      fx = createWeatherEffects();
    });

    test('should return rain Points and sunBeams Group', () => {
      expect(fx.rain).toBeInstanceOf(THREE.Points);
      expect(fx.sunBeams).toBeInstanceOf(THREE.Group);
    });
  });

  describe('Rain', () => {
    let fx: ReturnType<typeof createWeatherEffects>;

    beforeEach(() => {
      fx = createWeatherEffects();
    });

    test('should use PointsMaterial', () => {
      expect(fx.rain.material).toBeInstanceOf(THREE.PointsMaterial);
    });

    test('should have RAIN_PARTICLE_COUNT particles (default 500)', () => {
      const positions = (fx.rain.geometry as THREE.BufferGeometry).attributes.position;
      expect(positions.count).toBe(500);
    });

    test("should be visible when weather is 'rainy' or 'stormy'", () => {
      fx.update('rainy', 0.016);
      expect(fx.rain.visible).toBe(true);

      fx.update('stormy', 0.016);
      expect(fx.rain.visible).toBe(true);
    });

    test("should be invisible when weather is 'sunny' or 'cloudy'", () => {
      fx.update('sunny', 0.016);
      expect(fx.rain.visible).toBe(false);

      fx.update('cloudy', 0.016);
      expect(fx.rain.visible).toBe(false);
    });
  });

  describe('Sun beams', () => {
    let fx: ReturnType<typeof createWeatherEffects>;

    beforeEach(() => {
      fx = createWeatherEffects();
    });

    test("should be visible when weather is 'sunny'", () => {
      fx.update('sunny', 0.016);
      expect(fx.sunBeams.visible).toBe(true);
    });

    test("should be invisible when weather is not 'sunny'", () => {
      fx.update('cloudy', 0.016);
      expect(fx.sunBeams.visible).toBe(false);

      fx.update('rainy', 0.016);
      expect(fx.sunBeams.visible).toBe(false);

      fx.update('stormy', 0.016);
      expect(fx.sunBeams.visible).toBe(false);
    });
  });

  describe('update()', () => {
    let fx: ReturnType<typeof createWeatherEffects>;

    beforeEach(() => {
      fx = createWeatherEffects();
    });

    test('should decrease particle y over time when rain is visible', () => {
      const positions = (fx.rain.geometry as THREE.BufferGeometry).attributes.position;
      const initialY = positions.getY(0);

      fx.update('rainy', 0.1); // 100ms delta

      const newY = positions.getY(0);
      expect(newY).toBeLessThan(initialY!);
    });

    test('should not change particle y when rain is hidden', () => {
      const positions = (fx.rain.geometry as THREE.BufferGeometry).attributes.position;
      const initialY = positions.getY(0);

      fx.update('sunny', 0.1); // rain hidden — no movement

      const newY = positions.getY(0);
      expect(newY).toBe(initialY);
    });
  });
});