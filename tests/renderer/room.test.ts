import * as THREE from 'three';
import {
  createProceduralRoom,
  room,
  floor,
  backWall,
  leftWall,
  rightWall,
} from '../../src/renderer/room.js';
import type { IRoom } from '../../src/renderer/room.js';

// ── Backward‑compatibility tests (legacy named exports) ────────

describe('Room — legacy named exports', () => {
  test('room.group should be a THREE.Group with floor + 3 walls', () => {
    expect(room.group).toBeInstanceOf(THREE.Group);
    expect(room.group.children).toHaveLength(4);
  });

  test('should have a floor plane', () => {
    expect(floor).toBeInstanceOf(THREE.Mesh);
    expect(floor.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(floor.position.y).toBe(0);
    expect(floor.rotation.x).toBe(-Math.PI / 2);
  });

  test('should have a back wall', () => {
    expect(backWall).toBeInstanceOf(THREE.Mesh);
    expect(backWall.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(backWall.position.z).toBeCloseTo(-5);
    expect(backWall.position.y).toBeCloseTo(2);
  });

  test('should have a left wall', () => {
    expect(leftWall).toBeInstanceOf(THREE.Mesh);
    expect(leftWall.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(leftWall.position.x).toBeCloseTo(-5);
    expect(leftWall.position.y).toBeCloseTo(2);
    expect(leftWall.rotation.y).toBe(Math.PI / 2);
  });

  test('should have a right wall', () => {
    expect(rightWall).toBeInstanceOf(THREE.Mesh);
    expect(rightWall.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(rightWall.position.x).toBeCloseTo(5);
    expect(rightWall.position.y).toBeCloseTo(2);
    expect(rightWall.rotation.y).toBe(-Math.PI / 2);
  });

  test('floor should have warm gray color (#8B7D6B)', () => {
    const expectedColor = new THREE.Color(0x8b7d6b);
    const material = floor.material as THREE.MeshStandardMaterial;
    expect(material.color).toEqual(expectedColor);
  });

  test('walls should have light gray color (#C0C0C0)', () => {
    const expectedColor = new THREE.Color(0xc0c0c0);
    for (const wall of [backWall, leftWall, rightWall]) {
      const mat = wall.material as THREE.MeshStandardMaterial;
      expect(mat.color).toEqual(expectedColor);
    }
  });
});

// ── IRoom interface tests ──────────────────────────────────────

describe('IRoom interface', () => {
  let proceduralRoom: IRoom;

  beforeEach(() => {
    proceduralRoom = createProceduralRoom();
  });

  afterEach(() => {
    proceduralRoom.dispose();
  });

  test('createProceduralRoom() returns an IRoom', () => {
    expect(proceduralRoom.group).toBeInstanceOf(THREE.Group);
    expect(proceduralRoom.group.children).toHaveLength(4);
  });

  test('getFloor() returns the floor mesh', () => {
    const f = proceduralRoom.getFloor();
    expect(f).not.toBeNull();
    expect(f!.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(f!.position.y).toBe(0);
  });

  test('getWalls() returns 3 wall meshes', () => {
    const walls = proceduralRoom.getWalls();
    expect(walls).toHaveLength(3);
    walls.forEach((w) => {
      expect(w.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    });
  });

  test('group children match getFloor/getWalls', () => {
    const children = proceduralRoom.group.children;
    const floorMesh = proceduralRoom.getFloor()!;
    const walls = proceduralRoom.getWalls();

    expect(children).toContain(floorMesh);
    walls.forEach((w) => {
      expect(children).toContain(w);
    });
  });

  test('custom config overrides defaults', () => {
    const custom = createProceduralRoom({
      floorSize: 20,
      wallHeight: 6,
      floorColor: 0xff0000,
      wallColor: 0x00ff00,
    });

    // Floor at y=0, but half-extents changed
    expect(custom.getFloor()!.position.y).toBe(0);
    // Back wall at z = -floorSize/2 = -10
    expect(custom.getWalls()[0].position.z).toBeCloseTo(-10);
    // Left wall at x = -floorSize/2 = -10
    expect(custom.getWalls()[1].position.x).toBeCloseTo(-10);

    // Color overrides
    const floorMat = custom.getFloor()!.material as THREE.MeshStandardMaterial;
    expect(floorMat.color).toEqual(new THREE.Color(0xff0000));
    const wallMat = custom.getWalls()[0].material as THREE.MeshStandardMaterial;
    expect(wallMat.color).toEqual(new THREE.Color(0x00ff00));

    custom.dispose();
  });

  test('dispose() cleans up geometries and materials', () => {
    const r = createProceduralRoom();
    const meshes = [r.getFloor()!, ...r.getWalls()];

    // Sanity: before disposal everything is fine
    meshes.forEach((m) => {
      expect(m.geometry).toBeDefined();
    });

    r.dispose();

    // After disposal the IRoom can still be used but resources are freed.
    // We don't check disposed flags (Three.js doesn't set one),
    // but the method should not throw.
    expect(r.group.children).toHaveLength(4);
  });
});
