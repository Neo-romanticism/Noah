import * as THREE from 'three';

// ── Room Configuration ──────────────────────────────────────────

/** Config for procedural room generation. */
export interface RoomConfig {
  floorSize: number;
  wallHeight: number;
  wallColor?: number;
  floorColor?: number;
  wallRoughness?: number;
  wallMetalness?: number;
  floorRoughness?: number;
  floorMetalness?: number;
}

const DEFAULT_CONFIG: RoomConfig = {
  floorSize: 10,
  wallHeight: 4,
  wallColor: 0xc0c0c0,
  floorColor: 0x8b7d6b,
  wallRoughness: 0.7,
  wallMetalness: 0.3,
  floorRoughness: 0.8,
  floorMetalness: 0.2,
};

// ── Room interface ──────────────────────────────────────────────

/**
 * Contract for any room representation.
 *
 * - `group` — the root THREE.Group containing all room geometry.
 * - `getFloor()` — returns the floor mesh if available (procedural rooms
 *   will have one; FBX/GLTF‑loaded rooms may return `null`).
 * - `getWalls()` — returns wall meshes; an FBX/GLTF room may return an
 *   empty array if walls can't be isolated.
 *
 * Consumers should prefer `group` over individual exports so that the
 * room source can be swapped transparently.
 */
export interface IRoom {
  readonly group: THREE.Group;
  getFloor(): THREE.Mesh | null;
  getWalls(): THREE.Mesh[];
  /** Clean up GPU resources when the room is no longer needed. */
  dispose(): void;
}

// ── Procedural room (current approach) ─────────────────────────

/**
 * Builds a room entirely from Three.js primitives.
 *
 * Replace the call to `createProceduralRoom()` with
 * `await loadRoomFromFile('models/room.glb')` once a GLTF/FBX
 * pipeline is ready — the `IRoom` return type keeps the rest
 * of the code unchanged.
 */
export function createProceduralRoom(config?: Partial<RoomConfig>): IRoom {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const halfFloor = cfg.floorSize / 2;
  const halfWall = cfg.wallHeight / 2;

  // ── Materials ────────────────────────────────────────────────
  const floorMat = new THREE.MeshStandardMaterial({
    color: cfg.floorColor,
    roughness: cfg.floorRoughness,
    metalness: cfg.floorMetalness,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: cfg.wallColor,
    roughness: cfg.wallRoughness,
    metalness: cfg.wallMetalness,
  });

  // ── Geometries & meshes ──────────────────────────────────────
  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(cfg.floorSize, cfg.floorSize),
    floorMat,
  );
  floorMesh.rotation.x = -Math.PI / 2; // horizontal (facing up)
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = true;
  floorMesh.name = 'floor';

  function makeWall(
    width: number,
    height: number,
    position: THREE.Vector3,
    rotation?: THREE.Euler,
  ): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
    m.position.copy(position);
    if (rotation) m.rotation.copy(rotation);
    m.name = 'wall';
    return m;
  }

  const back = makeWall(
    cfg.floorSize,
    cfg.wallHeight,
    new THREE.Vector3(0, halfWall, -halfFloor),
  );
  back.name = 'wall-back';

  const left = makeWall(
    cfg.floorSize,
    cfg.wallHeight,
    new THREE.Vector3(-halfFloor, halfWall, 0),
    new THREE.Euler(0, Math.PI / 2, 0),
  );
  left.name = 'wall-left';

  const right = makeWall(
    cfg.floorSize,
    cfg.wallHeight,
    new THREE.Vector3(halfFloor, halfWall, 0),
    new THREE.Euler(0, -Math.PI / 2, 0),
  );
  right.name = 'wall-right';

  // ── Assemble ─────────────────────────────────────────────────
  const walls = [back, left, right];
  const group = new THREE.Group();
  group.add(floorMesh, ...walls);

  return {
    group,
    getFloor: () => floorMesh,
    getWalls: () => walls,
    dispose: () => {
      [floorMesh, ...walls].forEach((mesh) => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      });
    },
  };
}

// ── Currently active room (procedural) ─────────────────────────
// Singleton exported for immediate use.  To switch to a file‑loaded
// room later, change this one line:
//   export const room: IRoom = await loadRoomFromFile('...');
export const room: IRoom = createProceduralRoom();

// ── Named convenience exports (backwards‑compatible) ───────────
// These are kept for existing tests and quick access.
// New code should prefer `room.group` / `room.getFloor()` / `room.getWalls()`.
const floorMesh = room.getFloor();
const wallMeshes = room.getWalls();
export const floor = floorMesh!;
export const backWall = wallMeshes[0]!;
export const leftWall = wallMeshes[1]!;
export const rightWall = wallMeshes[2]!;

// ── Future: File‑based room loader (GLTF / FBX) ───────────────

// TODO(STAGE-05a): Implement once FBX loader is ready.
// Signature placeholder:
//
// import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
//
// export async function loadRoomFromFile(path: string): Promise<IRoom> {
//   // 1. Use GLTFLoader or FBXLoader to load the model
//   // 2. Extract floor / wall meshes by name or convention
//   // 3. Return an IRoom wrapper
// }
