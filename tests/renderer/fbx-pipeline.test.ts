/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';
import { loadAvatar, createPlaceholderAvatar } from '../../src/renderer/avatar.js';

describe('FBX Avatar Loading', () => {
  const createMockLoader = (group: THREE.Group) => {
    return {
      FBXLoader: jest.fn().mockImplementation(() => ({
        load: jest.fn((_path: string, onLoad: (obj: THREE.Group) => void) => {
          onLoad(group);
        }),
      })),
    };
  };

  const createFailingLoader = (error: Error) => {
    return {
      FBXLoader: jest.fn().mockImplementation(() => ({
        load: jest.fn((_path: string, _onLoad: unknown, _onProgress: unknown, onError: (err: Error) => void) => {
          onError(error);
        }),
      })),
    };
  };

  test('loadAvatar returns IAvatar with correct scale and position', async () => {
    const mockGroup = new THREE.Group();
    mockGroup.animations = [];
    const mockLoader = createMockLoader(mockGroup);

    const avatar = await loadAvatar(
      {
        modelPath: './models/noah.fbx',
        scale: 0.3,
        position: new THREE.Vector3(0, 0, 0.5),
      },
      async () => mockLoader as unknown as { FBXLoader: typeof import('three/examples/jsm/loaders/FBXLoader.js').FBXLoader }
    );

    expect(avatar.group).toBe(mockGroup);
    expect(avatar.group.scale.x).toBe(0.3);
    expect(avatar.group.position.z).toBe(0.5);
    expect(avatar.mixer).toBeNull();
  });

  test('loadAvatar sets up animation mixer when animations exist', async () => {
    const mockGroup = new THREE.Group();
    const mockClip = new THREE.AnimationClip('test', 1, []);
    mockGroup.animations = [mockClip];
    const mockLoader = createMockLoader(mockGroup);

    const avatar = await loadAvatar(
      {
        modelPath: './models/noah.fbx',
        scale: 0.3,
      },
      async () => mockLoader as unknown as { FBXLoader: typeof import('three/examples/jsm/loaders/FBXLoader.js').FBXLoader }
    );

    expect(avatar.mixer).not.toBeNull();
    expect(avatar.animations).toContain(mockClip);
  });

  test('loadAvatar applies material fixes to meshes', async () => {
    const mockGroup = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x000000 })
    );
    mesh.name = 'Face';
    mockGroup.add(mesh);
    mockGroup.animations = [];

    const mockLoader = createMockLoader(mockGroup);

    await loadAvatar(
      {
        modelPath: './models/noah.fbx',
        scale: 0.3,
      },
      async () => mockLoader as unknown as { FBXLoader: typeof import('three/examples/jsm/loaders/FBXLoader.js').FBXLoader }
    );

    const fixedMat = mesh.material as THREE.MeshPhysicalMaterial;
    expect(fixedMat).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    const intensity = fixedMat.color.r + fixedMat.color.g + fixedMat.color.b;
    expect(intensity).toBeGreaterThan(0.05);
  });

  test('loadAvatar removes embedded lights', async () => {
    const mockGroup = new THREE.Group();
    const light = new THREE.PointLight(0xffffff);
    mockGroup.add(light);
    mockGroup.animations = [];

    const mockLoader = createMockLoader(mockGroup);

    await loadAvatar(
      { modelPath: './models/noah.fbx', scale: 0.3 },
      async () => mockLoader as unknown as { FBXLoader: typeof import('three/examples/jsm/loaders/FBXLoader.js').FBXLoader }
    );

    expect(mockGroup.children).not.toContain(light);
  });

  test('loadAvatar throws on loader failure', async () => {
    const mockLoader = createFailingLoader(new Error('Network error'));

    await expect(
      loadAvatar(
        { modelPath: './models/noah.fbx' },
        async () => mockLoader as unknown as { FBXLoader: typeof import('three/examples/jsm/loaders/FBXLoader.js').FBXLoader }
      )
    ).rejects.toThrow('Network error');
  });

  test('placeholder avatar can be used as fallback', () => {
    const avatar = createPlaceholderAvatar();
    expect(avatar.group).toBeInstanceOf(THREE.Group);
    expect(avatar.mixer).toBeNull();
    avatar.update(0.016);
    expect(() => avatar.dispose()).not.toThrow();
  });
});
