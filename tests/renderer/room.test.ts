/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';
import { createBed } from '../../src/renderer/room/bed';
import { createDesk } from '../../src/renderer/room/desk';
import { createFloor } from '../../src/renderer/room/floor';
import { createWalls } from '../../src/renderer/room/walls';
import { createWindow } from '../../src/renderer/room/window';

describe('Room Components', () => {
  test('createBed returns a Group with expected meshes', () => {
    const bed = createBed();
    expect(bed).toBeInstanceOf(THREE.Group);

    const meshes = bed.children.filter((c) => (c as THREE.Mesh).isMesh);
    // frame, mattress, pillow, blanket, headboard = 5
    expect(meshes.length).toBe(5);
  });

  test('createDesk returns a Group with expected meshes', () => {
    const desk = createDesk();
    expect(desk).toBeInstanceOf(THREE.Group);

    const meshes = desk.children.filter((c) => (c as THREE.Mesh).isMesh);
    // top + 4 legs + monitor base + stand + screen + glow = 9
    expect(meshes.length).toBe(9);
  });

  test('createFloor returns a Mesh', () => {
    const floor = createFloor();
    expect(floor).toBeInstanceOf(THREE.Mesh);
    expect(floor.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(floor.receiveShadow).toBe(true);
  });

  test('createWalls returns a Group with wall pieces', () => {
    const walls = createWalls();
    expect(walls).toBeInstanceOf(THREE.Group);
    // back wall (4 pieces) + left wall + right wall = 6
    expect(walls.children.length).toBe(6);
  });

  test('createWindow returns a Group with frame pieces', () => {
    const windowGroup = createWindow();
    expect(windowGroup).toBeInstanceOf(THREE.Group);
    // top, bottom, left, right, midV, midH, sill = 7
    expect(windowGroup.children.length).toBe(7);
  });

  test('bed components have correct materials', () => {
    const bed = createBed();
    const meshes = bed.children.filter((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh[];

    for (const mesh of meshes) {
      expect(mesh.material).toBeDefined();
      expect(mesh.castShadow).toBe(true);
    }
  });

  test('desk monitor glow has basic material', () => {
    const desk = createDesk();
    const meshes = desk.children.filter((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh[];

    // Find the glow mesh (last child, PlaneGeometry)
    const glow = meshes.find((m) => m.geometry instanceof THREE.PlaneGeometry);
    expect(glow).toBeDefined();
    expect(glow!.material).toBeInstanceOf(THREE.MeshBasicMaterial);
  });
});
