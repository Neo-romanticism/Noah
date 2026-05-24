import * as THREE from 'three';

export function createWalls(): THREE.Group {
  const group = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0e8,
    roughness: 0.9,
    metalness: 0.0,
  });

  // Back wall (with window hole — built from 4 pieces)
  const backWallLeft = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.5), wallMat);
  backWallLeft.position.set(-1.55, 0.75, 0);
  group.add(backWallLeft);

  const backWallRight = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.5), wallMat);
  backWallRight.position.set(1.55, 0.75, 0);
  group.add(backWallRight);

  const backWallTop = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.65), wallMat);
  backWallTop.position.set(0, 1.925, 0);
  group.add(backWallTop);

  const backWallBottom = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.65), wallMat);
  backWallBottom.position.set(0, 0.325, 0);
  group.add(backWallBottom);

  // Left wall
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.5), wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-3, 0.75, 1);
  group.add(leftWall);

  // Right wall
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.5), wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(3, 0.75, 1);
  group.add(rightWall);

  return group;
}
