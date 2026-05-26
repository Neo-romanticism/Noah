import * as THREE from 'three';

export function createBed(): THREE.Group {
  const group = new THREE.Group();

  // Bed frame
  const frameGeo = new THREE.BoxGeometry(1.2, 0.2, 1.8);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.8 });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.y = 0.1;
  frame.castShadow = true;
  frame.receiveShadow = true;
  group.add(frame);

  // Mattress
  const mattressGeo = new THREE.BoxGeometry(1.1, 0.15, 1.7);
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0xc0b8a8, roughness: 0.9 });
  const mattress = new THREE.Mesh(mattressGeo, mattressMat);
  mattress.position.y = 0.275;
  mattress.castShadow = true;
  group.add(mattress);

  // Pillow
  const pillowGeo = new THREE.BoxGeometry(0.7, 0.1, 0.35);
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xb0a898, roughness: 0.9 });
  const pillow = new THREE.Mesh(pillowGeo, pillowMat);
  pillow.position.set(0, 0.375, -0.6);
  pillow.castShadow = true;
  group.add(pillow);

  // Blanket (slightly larger than mattress, different color)
  const blanketGeo = new THREE.BoxGeometry(1.15, 0.08, 1.1);
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0x4a7ac0, roughness: 0.7 });
  const blanket = new THREE.Mesh(blanketGeo, blanketMat);
  blanket.position.set(0, 0.34, 0.2);
  blanket.castShadow = true;
  group.add(blanket);

  // Headboard
  const headboardGeo = new THREE.BoxGeometry(1.2, 0.6, 0.08);
  const headboardMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.8 });
  const headboard = new THREE.Mesh(headboardGeo, headboardMat);
  headboard.position.set(0, 0.4, -0.9);
  headboard.castShadow = true;
  group.add(headboard);

  return group;
}
