import * as THREE from 'three';

// Room dimensions: 10x10 floor with 4 unit high walls
const FLOOR_SIZE = 10;
const WALL_HEIGHT = 4;
const WALL_DEPTH = 0.2; // Wall thickness

// Create floor geometry and material
const floorGeometry = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
const floorMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x8B7D6B, // Warm gray color
  roughness: 0.8,
  metalness: 0.2
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal (facing up)
floor.position.y = 0; // Place at y=0

// Create back wall geometry and material
const backWallGeometry = new THREE.PlaneGeometry(FLOOR_SIZE, WALL_HEIGHT);
const backWallMaterial = new THREE.MeshStandardMaterial({ 
  color: 0xC0C0C0, // Light gray color
  roughness: 0.7,
  metalness: 0.3
});
const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
backWall.position.z = -FLOOR_SIZE / 2; // Position at back of room
backWall.position.y = WALL_HEIGHT / 2; // Position halfway up vertically

// Create left wall geometry and material
const leftWallGeometry = new THREE.PlaneGeometry(WALL_DEPTH, WALL_HEIGHT);
const leftWallMaterial = new THREE.MeshStandardMaterial({ 
  color: 0xC0C0C0, // Light gray color
  roughness: 0.7,
  metalness: 0.3
});
const leftWall = new THREE.Mesh(leftWallGeometry, leftWallMaterial);
leftWall.position.x = -FLOOR_SIZE / 2; // Position at left of room
leftWall.position.y = WALL_HEIGHT / 2; // Position halfway up vertically
leftWall.rotation.y = Math.PI / 2; // Rotate to face inward

// Create right wall geometry and material
const rightWallGeometry = new THREE.PlaneGeometry(WALL_DEPTH, WALL_HEIGHT);
const rightWallMaterial = new THREE.MeshStandardMaterial({ 
  color: 0xC0C0C0, // Light gray color
  roughness: 0.7,
  metalness: 0.3
});
const rightWall = new THREE.Mesh(rightWallGeometry, rightWallMaterial);
rightWall.position.x = FLOOR_SIZE / 2; // Position at right of room
rightWall.position.y = WALL_HEIGHT / 2; // Position halfway up vertically
rightWall.rotation.y = -Math.PI / 2; // Rotate to face inward

// Group all room elements together
const room = new THREE.Group();
room.add(floor);
room.add(backWall);
room.add(leftWall);
room.add(rightWall);

export { room, floor, backWall, leftWall, rightWall };