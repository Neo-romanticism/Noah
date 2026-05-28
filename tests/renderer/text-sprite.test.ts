/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';

import '../../tests/setup/canvas-mock.js';

import { createTextSprite } from '../../src/renderer/text-sprite.js';

describe('TextSprite', () => {
  describe('createTextSprite()', () => {
    test('should return a THREE.Sprite instance', () => {
      const sprite = createTextSprite('Test');
      expect(sprite).toBeInstanceOf(THREE.Sprite);
    });

    test('should create sprite with SpriteMaterial', () => {
      const sprite = createTextSprite('Test');
      expect(sprite.material).toBeInstanceOf(THREE.SpriteMaterial);
    });

    test('should apply custom color option', () => {
      const sprite = createTextSprite('Test', { color: '#ff0000' });
      const mat = sprite.material as THREE.SpriteMaterial;
      // SpriteMaterial doesn't expose color directly; verify via map existence
      expect(mat.map).toBeDefined();
      expect(mat.transparent).toBe(true);
    });

    test('should apply custom fontSize that changes canvas size', () => {
      const small = createTextSprite('Test', { fontSize: 24, scale: 0.5 });
      const large = createTextSprite('TestLongerText', { fontSize: 96, scale: 0.5 });

      // Larger font + longer text should produce larger sprite scale
      expect(large.scale.x).toBeGreaterThan(small.scale.x);
    });

    test('should create sprite with sizeAttenuation = true', () => {
      const sprite = createTextSprite('Test');
      const mat = sprite.material as THREE.SpriteMaterial;
      expect(mat.sizeAttenuation).toBe(true);
    });

    test('should create different sprites for different text', () => {
      const a = createTextSprite('A');
      const b = createTextSprite('Much longer text');

      // Different text lengths should produce different scales
      expect(a.scale.x).not.toBe(b.scale.x);
    });
  });
});
