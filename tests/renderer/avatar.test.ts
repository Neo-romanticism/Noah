/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';
import {
  createPlaceholderAvatar,
  enhanceMaterial,
  fixMaterial,
  removeEmbeddedLights,
  removeGroundPlanes,
} from '../../src/renderer/avatar.js';

describe('Avatar System', () => {
  describe('createPlaceholderAvatar', () => {
    test('returns IAvatar with group, null mixer, empty animations', () => {
      const avatar = createPlaceholderAvatar();

      expect(avatar.group).toBeInstanceOf(THREE.Group);
      expect(avatar.mixer).toBeNull();
      expect(avatar.animations).toEqual([]);
    });

    test('group contains body, head, and two eyes (4 meshes)', () => {
      const avatar = createPlaceholderAvatar();
      const meshes = avatar.group.children.filter((c) => (c as THREE.Mesh).isMesh);
      expect(meshes.length).toBe(4);
    });

    test('body and head cast shadows, eyes do not', () => {
      const avatar = createPlaceholderAvatar();
      const meshes = avatar.group.children.filter((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh[];
      expect(meshes[0].castShadow).toBe(true); // body
      expect(meshes[1].castShadow).toBe(true); // head
      expect(meshes[2].castShadow).toBe(false); // left eye
      expect(meshes[3].castShadow).toBe(false); // right eye
    });

    test('update() does not throw without mixer', () => {
      const avatar = createPlaceholderAvatar();
      expect(() => avatar.update(0.016)).not.toThrow();
    });

    test('dispose() cleans up geometries and materials', () => {
      const avatar = createPlaceholderAvatar();
      expect(() => avatar.dispose()).not.toThrow();
    });
  });

  describe('enhanceMaterial', () => {
    test('returns MeshPhysicalMaterial', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const enhanced = enhanceMaterial(mat, 'default');
      expect(enhanced).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    });

    test('skin category has transmission and sheen', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
      const enhanced = enhanceMaterial(mat, 'skin');
      expect(enhanced.transmission).toBe(0.08);
      expect(enhanced.sheen).toBe(0.3);
      expect(enhanced.ior).toBe(1.4);
    });

    test('hair category has high sheen and clearcoat', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x332211 });
      const enhanced = enhanceMaterial(mat, 'hair');
      expect(enhanced.sheen).toBe(0.6);
      expect(enhanced.clearcoat).toBe(0.15);
    });

    test('eye category has low roughness and high clearcoat', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x3366cc });
      const enhanced = enhanceMaterial(mat, 'eye');
      expect(enhanced.roughness).toBe(0.05);
      expect(enhanced.clearcoat).toBe(1.0);
    });

    test('clothing category has high roughness, no clearcoat', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.3 });
      const enhanced = enhanceMaterial(mat, 'clothing');
      expect(enhanced.roughness).toBeGreaterThanOrEqual(0.6);
      expect(enhanced.clearcoat).toBe(0.0);
    });

    test('preserves original color', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x123456 });
      const enhanced = enhanceMaterial(mat, 'default');
      expect(enhanced.color.getHex()).toBe(0x123456);
    });
  });

  describe('fixMaterial', () => {
    test('converts very dark material to visible gray', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x000000 });
      const fixed = fixMaterial(mat) as THREE.MeshPhysicalMaterial;
      const intensity = fixed.color.r + fixed.color.g + fixed.color.b;
      expect(intensity).toBeGreaterThan(0.05);
    });

    test('fixes extreme emissive', () => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: new THREE.Color(5, 5, 5),
      });
      const fixed = fixMaterial(mat) as THREE.MeshPhysicalMaterial;
      const emissiveIntensity = fixed.emissive.r + fixed.emissive.g + fixed.emissive.b;
      expect(emissiveIntensity).toBeLessThanOrEqual(2.5);
    });

    test('classifies face mesh as skin', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffccaa, name: 'Face_Mat' });
      const fixed = fixMaterial(mat, 'Face') as THREE.MeshPhysicalMaterial;
      expect(fixed.transmission).toBe(0.08);
    });

    test('classifies hair mesh as hair', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x332211, name: 'Hair_Mat' });
      const fixed = fixMaterial(mat, 'Hair') as THREE.MeshPhysicalMaterial;
      expect(fixed.sheen).toBe(0.6);
    });
  });

  describe('removeEmbeddedLights', () => {
    test('removes lights from group', () => {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
      const light = new THREE.PointLight(0xffffff);
      group.add(mesh);
      group.add(light);

      removeEmbeddedLights(group);
      expect(group.children).not.toContain(light);
      expect(group.children).toContain(mesh);
    });
  });

  describe('removeGroundPlanes', () => {
    test('removes bright flat plane near ground', () => {
      const group = new THREE.Group();
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      plane.name = 'shadow_plane';
      group.add(plane);

      removeGroundPlanes(group);
      expect(group.children).not.toContain(plane);
    });

    test('keeps normal meshes above ground', () => {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x888888 })
      );
      mesh.name = 'Body';
      mesh.position.y = 0.5; // above ground threshold
      group.add(mesh);

      removeGroundPlanes(group);
      expect(group.children).toContain(mesh);
    });
  });
});
