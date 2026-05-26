import * as THREE from 'three';

export function createWalls(): THREE.Group {
  const group = new THREE.Group();

  // Use MeshStandardMaterial for better lighting response
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xa09078,
    roughness: 0.8,
    metalness: 0.1,
  });


  // Back wall (with window hole — built from 4 pieces)
  const backWallGeo = new THREE.PlaneGeometry(1.5, 2.5);
  backWallGeo.computeVertexNormals();
  const backWallLeft = new THREE.Mesh(backWallGeo, wallMat);
  backWallLeft.position.set(-1.55, 0.75, 0);
  group.add(backWallLeft);

  const backWallRightGeo = new THREE.PlaneGeometry(1.5, 2.5);
  backWallRightGeo.computeVertexNormals();
  const backWallRight = new THREE.Mesh(backWallRightGeo, wallMat);
  backWallRight.position.set(1.55, 0.75, 0);
  group.add(backWallRight);

  const backWallTopGeo = new THREE.PlaneGeometry(3, 0.65);
  backWallTopGeo.computeVertexNormals();
  const backWallTop = new THREE.Mesh(backWallTopGeo, wallMat);
  backWallTop.position.set(0, 1.925, 0);
  group.add(backWallTop);

  const backWallBottomGeo = new THREE.PlaneGeometry(3, 0.65);
  backWallBottomGeo.computeVertexNormals();
  const backWallBottom = new THREE.Mesh(backWallBottomGeo, wallMat);
  backWallBottom.position.set(0, 0.325, 0);
  group.add(backWallBottom);

  // Left wall
  const leftWallGeo = new THREE.PlaneGeometry(4, 2.5);
  leftWallGeo.computeVertexNormals();
  const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-3, 0.75, 1);
  group.add(leftWall);

  // Right wall
  const rightWallGeo = new THREE.PlaneGeometry(4, 2.5);
  rightWallGeo.computeVertexNormals();
  const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(3, 0.75, 1);
  group.add(rightWall);

  return group;
}
