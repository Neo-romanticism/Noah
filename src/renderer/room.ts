import * as THREE from 'three';

// ── Room dimensions ──────────────────────────────────────────────
const FLOOR_SIZE = 10;
const WALL_HEIGHT = 4;

// ── Material factories ───────────────────────────────────────────

function createFloorMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x8b7d6b, // warm gray
    roughness: 0.8,
    metalness: 0.2,
  });
}

function createWallMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xc0c0c0, // light gray
    roughness: 0.7,
    metalness: 0.3,
  });
}

// ── Geometry factories ───────────────────────────────────────────

function createFloor(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
  const mesh = new THREE.Mesh(geo, createFloorMaterial());
  mesh.rotation.x = -Math.PI / 2; // horizontal (facing up)
  mesh.position.y = 0;
  mesh.receiveShadow = true;
  return mesh;
}

function createWall(
  width: number,
  height: number,
  position: THREE.Vector3,
  rotation?: THREE.Euler,
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geo, createWallMaterial());
  mesh.position.copy(position);
  if (rotation) mesh.rotation.copy(rotation);
  return mesh;
}

// ── Room assembly ────────────────────────────────────────────────

const halfFloor = FLOOR_SIZE / 2;
const halfWall = WALL_HEIGHT / 2;

const floor = createFloor();

const backWall = createWall(
  FLOOR_SIZE,
  WALL_HEIGHT,
  new THREE.Vector3(0, halfWall, -halfFloor),
);

const leftWall = createWall(
  FLOOR_SIZE,
  WALL_HEIGHT,
  new THREE.Vector3(-halfFloor, halfWall, 0),
  new THREE.Euler(0, Math.PI / 2, 0),
);

const rightWall = createWall(
  FLOOR_SIZE,
  WALL_HEIGHT,
  new THREE.Vector3(halfFloor, halfWall, 0),
  new THREE.Euler(0, -Math.PI / 2, 0),
);

const room = new THREE.Group();
room.add(floor, backWall, leftWall, rightWall);

export { room, floor, backWall, leftWall, rightWall };
