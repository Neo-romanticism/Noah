/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';

import {
  createPlaceholderAvatar,
  enhanceMaterial,
  fixMaterial,
  getFallbackColor,
  removeEmbeddedLights,
  removeGroundPlanes,
  hideOutlineMeshes,
  sortTransparentMeshes,
} from '../../src/renderer/avatar.js';
import type { AnimationController } from '../../src/renderer/animation/types.js';

describe('Avatar System', () => {
  describe('createPlaceholderAvatar', () => {
    test('returns IAvatar with group, null mixer, empty animations, and animationController', () => {
      const avatar = createPlaceholderAvatar();

      expect(avatar.group).toBeInstanceOf(THREE.Group);
      expect(avatar.mixer).toBeNull();
      expect(avatar.animations).toEqual([]);
      expect(avatar.animationController).toBeDefined();
      expect(avatar.animationController.play).toBeInstanceOf(Function);
      expect(avatar.animationController.update).toBeInstanceOf(Function);
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

    test('update() drives animation controller without throwing', () => {
      const avatar = createPlaceholderAvatar();
      expect(() => avatar.update(0.016)).not.toThrow();
    });

    test('update() animates body position via placeholder controller', () => {
      const avatar = createPlaceholderAvatar();
      const initialY = (avatar.group.children[0] as THREE.Mesh).position.y;
      avatar.update(0.5);
      const updatedY = (avatar.group.children[0] as THREE.Mesh).position.y;
      expect(updatedY).not.toBe(initialY);
    });

    test('dispose() cleans up geometries, materials, and animation controller', () => {
      const avatar = createPlaceholderAvatar();
      expect(() => avatar.dispose()).not.toThrow();
    });
  });

  describe('getFallbackColor', () => {
    test('returns bisque for skin', () => {
      expect(getFallbackColor('skin').getHex()).toBe(0xffe4c4);
    });

    test('returns dark brown for hair', () => {
      expect(getFallbackColor('hair').getHex()).toBe(0x4a3728);
    });

    test('returns light gray for unknown category', () => {
      expect(getFallbackColor('unknown').getHex()).toBe(0xbbbbbb);
    });
  });

  describe('enhanceMaterial', () => {
    test('returns MeshPhysicalMaterial', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const enhanced = enhanceMaterial(mat, 'default');
      expect(enhanced).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    });

    test('skin category has no sheen, no clearcoat, and low envMapIntensity', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
      const enhanced = enhanceMaterial(mat, 'skin');
      expect(enhanced.sheen).toBe(0);
      expect(enhanced.clearcoat).toBe(0);
      expect(enhanced.transmission).toBe(0);
      expect(enhanced.roughness).toBeLessThanOrEqual(0.5);
      expect(enhanced.envMapIntensity).toBe(0.15);
    });

    test('hair category has moderate sheen and low clearcoat', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x332211 });
      const enhanced = enhanceMaterial(mat, 'hair');
      expect(enhanced.sheen).toBe(0.25);
      expect(enhanced.clearcoat).toBe(0.08);
      expect(enhanced.envMapIntensity).toBe(0.4);
    });

    test('eye category has low roughness and moderate clearcoat', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x3366cc });
      const enhanced = enhanceMaterial(mat, 'eye');
      expect(enhanced.roughness).toBe(0.05);
      expect(enhanced.clearcoat).toBe(0.4);
      expect(enhanced.envMapIntensity).toBe(0.6);
    });

    test('clothing category has high roughness, no clearcoat, no sheen', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.3 });
      const enhanced = enhanceMaterial(mat, 'clothing');
      expect(enhanced.roughness).toBeGreaterThanOrEqual(0.6);
      expect(enhanced.clearcoat).toBe(0.0);
      expect(enhanced.sheen).toBe(0.0);
      expect(enhanced.envMapIntensity).toBe(0.2);
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
      expect(fixed.sheen).toBe(0);
      expect(fixed.clearcoat).toBe(0);
    });

    test('classifies hair mesh as hair', () => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x332211, name: 'Hair_Mat' });
      const fixed = fixMaterial(mat, 'Hair') as THREE.MeshPhysicalMaterial;
      expect(fixed.sheen).toBe(0.25);
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

  describe('hideOutlineMeshes', () => {
    test('hides meshes with "outline" in name', () => {
      const group = new THREE.Group();
      const normal = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial(),
      );
      normal.name = 'Hair';
      group.add(normal);

      const outline = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial(),
      );
      outline.name = 'Hair_outline';
      group.add(outline);

      hideOutlineMeshes(group);

      expect(normal.visible).toBe(true);
      expect(outline.visible).toBe(false);
    });

    test('hides meshes with outline material', () => {
      const group = new THREE.Group();
      const outlineMat = new THREE.MeshStandardMaterial();
      outlineMat.name = 'Outline_Mat';
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        outlineMat,
      );
      mesh.name = 'Hair001';
      group.add(mesh);

      hideOutlineMeshes(group);

      expect(mesh.visible).toBe(false);
    });

    test('hides single-material mesh with outline-named material', () => {
      const group = new THREE.Group();
      const outlineMat = new THREE.MeshStandardMaterial();
      outlineMat.name = 'Hair_Outline';
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        outlineMat,
      );
      mesh.name = 'Hair';
      group.add(mesh);

      hideOutlineMeshes(group);

      expect(mesh.visible).toBe(false);
    });

    test('keeps normal meshes visible', () => {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial(),
      );
      mesh.name = 'Face';
      group.add(mesh);

      hideOutlineMeshes(group);

      expect(mesh.visible).toBe(true);
    });

    test('handles multi-material meshes with outline material', () => {
      const group = new THREE.Group();
      const normalMat = new THREE.MeshStandardMaterial();
      normalMat.name = 'Skin';
      const outlineMat = new THREE.MeshStandardMaterial();
      outlineMat.name = 'Outline';
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        [normalMat, outlineMat],
      );
      mesh.name = 'Body';
      group.add(mesh);

      hideOutlineMeshes(group);

      // Mesh stays visible; outline material becomes transparent
      expect(mesh.visible).toBe(true);
      expect(outlineMat.opacity).toBe(0);
      expect(outlineMat.transparent).toBe(true);
      // Base material untouched
      expect(normalMat.opacity).toBe(1);
      expect(normalMat.transparent).toBe(false);
    });
  });

  describe('sortTransparentMeshes', () => {
    test('sets renderOrder on transparent meshes', () => {
      const group = new THREE.Group();
      const opaque = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial(),
      );
      opaque.name = 'Body';
      group.add(opaque);

      const transparent = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.5 }),
      );
      transparent.name = 'Hair';
      group.add(transparent);

      sortTransparentMeshes(group);

      expect(opaque.renderOrder).toBe(0);
      expect(transparent.renderOrder).toBeGreaterThan(0);
    });

    test('does not modify non-transparent meshes renderOrder', () => {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial(),
      );
      mesh.name = 'Face';
      group.add(mesh);

      sortTransparentMeshes(group);

      expect(mesh.renderOrder).toBe(0);
    });
  });
});
