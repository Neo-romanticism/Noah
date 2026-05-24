import * as THREE from 'three';

export function createDesk(): THREE.Group {
  const group = new THREE.Group();

  // Desktop
  const topGeo = new THREE.BoxGeometry(1.0, 0.06, 0.6);
  const topMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.6 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = 0.5;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.05, 0.5, 0.05);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.5, metalness: 0.3 });

  const legPositions = [
    [-0.42, 0.25, -0.24],
    [0.42, 0.25, -0.24],
    [-0.42, 0.25, 0.24],
    [0.42, 0.25, 0.24],
  ];

  for (const pos of legPositions) {
    const [x, y, z] = pos as [number, number, number];
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    group.add(leg);
  }

  // Mini PC monitor on desk
  const monitorBaseGeo = new THREE.BoxGeometry(0.15, 0.02, 0.12);
  const monitorBaseMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.5 });
  const monitorBase = new THREE.Mesh(monitorBaseGeo, monitorBaseMat);
  monitorBase.position.set(0, 0.53, -0.1);
  group.add(monitorBase);

  const monitorStandGeo = new THREE.BoxGeometry(0.03, 0.12, 0.03);
  const monitorStand = new THREE.Mesh(monitorStandGeo, monitorBaseMat);
  monitorStand.position.set(0, 0.59, -0.1);
  group.add(monitorStand);

  const monitorScreenGeo = new THREE.BoxGeometry(0.3, 0.2, 0.02);
  const monitorScreenMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.2, metalness: 0.1 });
  const monitorScreen = new THREE.Mesh(monitorScreenGeo, monitorScreenMat);
  monitorScreen.position.set(0, 0.68, -0.1);
  monitorScreen.castShadow = true;
  group.add(monitorScreen);

  // Glowing screen surface
  const glowGeo = new THREE.PlaneGeometry(0.26, 0.16);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x4a90d9 });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(0, 0.68, -0.089);
  group.add(glow);

  return group;
}
