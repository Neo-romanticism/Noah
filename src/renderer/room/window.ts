import * as THREE from 'three';

export function createWindow(): THREE.Group {
  const group = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.1,
  });

  // Window frame — outer border
  const frameThickness = 0.06;
  const frameDepth = 0.08;
  const w = 1.8;
  const h = 1.4;

  // Top frame
  const topFrame = new THREE.Mesh(new THREE.BoxGeometry(w, frameThickness, frameDepth), frameMat);
  topFrame.position.set(0, h / 2, 0);
  group.add(topFrame);

  // Bottom frame
  const bottomFrame = new THREE.Mesh(new THREE.BoxGeometry(w, frameThickness, frameDepth), frameMat);
  bottomFrame.position.set(0, -h / 2, 0);
  group.add(bottomFrame);

  // Left frame
  const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, h, frameDepth), frameMat);
  leftFrame.position.set(-w / 2, 0, 0);
  group.add(leftFrame);

  // Right frame
  const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, h, frameDepth), frameMat);
  rightFrame.position.set(w / 2, 0, 0);
  group.add(rightFrame);

  // Vertical middle bar
  const midV = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, frameDepth * 0.6), frameMat);
  midV.position.set(0, 0, 0);
  group.add(midV);

  // Horizontal middle bar
  const midH = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, frameDepth * 0.6), frameMat);
  midH.position.set(0, 0, 0);
  group.add(midH);

  // Window sill
  const sillGeo = new THREE.BoxGeometry(w + 0.2, 0.06, 0.2);
  const sillMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4 });
  const sill = new THREE.Mesh(sillGeo, sillMat);
  sill.position.set(0, -h / 2 - 0.03, 0.06);
  group.add(sill);

  return group;
}
