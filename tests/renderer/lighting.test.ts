/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';
import { createLighting } from '../../src/renderer/lighting.js';

describe('Lighting', () => {
  describe('createLighting()', () => {
    let setup: ReturnType<typeof createLighting>;

    beforeEach(() => {
      setup = createLighting();
    });

    test('should return ambient and sun lights', () => {
      expect(setup.ambient).toBeInstanceOf(THREE.AmbientLight);
      expect(setup.sun).toBeInstanceOf(THREE.DirectionalLight);
    });

    test('ambient should have intensity 0.3', () => {
      expect(setup.ambient.intensity).toBe(0.3);
    });

    test('sun should be DirectionalLight with castShadow = true', () => {
      expect(setup.sun.castShadow).toBe(true);
    });

    test('sun shadow mapSize should be 1024x1024', () => {
      expect(setup.sun.shadow.mapSize.width).toBe(1024);
      expect(setup.sun.shadow.mapSize.height).toBe(1024);
    });

    test('sun shadow camera should have near=0.5, far=50', () => {
      expect(setup.sun.shadow.camera.near).toBe(0.5);
      expect(setup.sun.shadow.camera.far).toBe(50);
    });
  });

  describe('dispose()', () => {
    test('should not throw', () => {
      const setup = createLighting();
      expect(() => setup.dispose()).not.toThrow();
    });
  });
});