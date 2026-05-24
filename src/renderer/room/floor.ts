import * as THREE from 'three';

export function createFloor(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(6, 4);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 0.8,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  return floor;
}
