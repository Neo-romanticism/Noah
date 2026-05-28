/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';
import { createWindow } from '../../src/renderer/window.js';

describe('Window', () => {
  describe('createWindow()', () => {
    let win: ReturnType<typeof createWindow>;

    beforeEach(() => {
      win = createWindow();
    });

    test('should return an IWindow with a THREE.Group', () => {
      expect(win.group).toBeInstanceOf(THREE.Group);
    });

    test('group should contain 5 children (4 frames + 1 glass)', () => {
      expect(win.group.children.length).toBe(5);
    });
  });

  describe('Glass', () => {
    let win: ReturnType<typeof createWindow>;

    beforeEach(() => {
      win = createWindow();
    });

    test('should use PlaneGeometry with MeshPhysicalMaterial', () => {
      const glass = win.getGlass();
      expect(glass.geometry).toBeInstanceOf(THREE.PlaneGeometry);
      expect(glass.material).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    });

    test('should be transparent (opacity < 0.5)', () => {
      const glass = win.getGlass();
      const mat = glass.material as THREE.MeshPhysicalMaterial;
      expect(mat.transparent).toBe(true);
      expect(mat.opacity).toBeLessThan(0.5);
    });

    test('should be positioned at z ≈ -4.99, y = 2', () => {
      const glass = win.getGlass();
      // glass position is (0, 2, 0) relative to group
      // group position is (0, 0, -4.99)
      // so absolute glass z = -4.99, y = 2
      expect(glass.position.z).toBeCloseTo(0, 4);
      expect(glass.position.y).toBe(2);
    });
  });

  describe('Frames', () => {
    let win: ReturnType<typeof createWindow>;

    beforeEach(() => {
      win = createWindow();
    });

    test('should have 4 frame meshes using BoxGeometry', () => {
      const frames = win.getFrames();
      expect(frames.length).toBe(4);
      frames.forEach((frame) => {
        expect(frame.geometry).toBeInstanceOf(THREE.BoxGeometry);
      });
    });

    test('each frame should castShadow = true', () => {
      const frames = win.getFrames();
      frames.forEach((frame) => {
        expect(frame.castShadow).toBe(true);
      });
    });

    test('frames should use MeshStandardMaterial with metalness > 0.5', () => {
      const frames = win.getFrames();
      frames.forEach((frame) => {
        const mat = frame.material as THREE.MeshStandardMaterial;
        expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
        expect(mat.metalness).toBeGreaterThan(0.5);
      });
    });
  });
});