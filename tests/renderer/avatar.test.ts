/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';
import { createPlaceholderAvatar, updateAvatar } from '../../src/renderer/avatar';

describe('Avatar System', () => {
  test('createPlaceholderAvatar creates a visible avatar group', () => {
    const scene = new THREE.Scene();
    const avatar = createPlaceholderAvatar(scene);

    expect(avatar.group).toBeInstanceOf(THREE.Group);
    expect(avatar.mixer).toBeNull();
    expect(avatar.animations).toEqual([]);

    // Should be added to scene
    expect(scene.children).toContain(avatar.group);
  });

  test('placeholder avatar has body, head, and eyes', () => {
    const scene = new THREE.Scene();
    const avatar = createPlaceholderAvatar(scene);

    const meshes = avatar.group.children.filter((c) => (c as THREE.Mesh).isMesh);
    // body + head + 2 eyes = 4
    expect(meshes.length).toBe(4);
  });

  test('updateAvatar does not throw without mixer', () => {
    const scene = new THREE.Scene();
    const avatar = createPlaceholderAvatar(scene);

    expect(() => updateAvatar(avatar, 0.016)).not.toThrow();
  });

  test('placeholder avatar is positioned correctly', () => {
    const scene = new THREE.Scene();
    const avatar = createPlaceholderAvatar(scene);

    expect(avatar.group.position.x).toBe(0);
    expect(avatar.group.position.y).toBe(-0.5);
    expect(avatar.group.position.z).toBe(0);
  });

  test('body and head cast shadows, eyes do not', () => {
    const scene = new THREE.Scene();
    const avatar = createPlaceholderAvatar(scene);

    const meshes = avatar.group.children.filter((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh[];
    // Body and head cast shadows
    expect(meshes[0].castShadow).toBe(true); // body
    expect(meshes[1].castShadow).toBe(true); // head
    // Eyes (basic material) don't need castShadow
    expect(meshes[2].castShadow).toBe(false); // left eye
    expect(meshes[3].castShadow).toBe(false); // right eye
  });
});
