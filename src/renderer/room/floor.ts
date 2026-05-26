import * as THREE from 'three';

export function createFloor(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(6, 4);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: 0x4a3d2e,
    roughness: 0.9,
    metalness: 0.0,
  });

  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  return floor;
}
