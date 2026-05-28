import * as THREE from 'three';

export interface IWindow {
  readonly group: THREE.Group;
  /** 투명 유리 패널 */
  getGlass(): THREE.Mesh;
  /** 프레임 바 4개 (top, bottom, left, right) */
  getFrames(): THREE.Mesh[];
  /** GPU 리소스 정리 */
  dispose(): void;
}

export function createWindow(
  width: number = 3,
  height: number = 2,
  yOffset: number = 2,
): IWindow {
  const group = new THREE.Group();
  group.position.set(0, 0, -4.99);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x4a4a4a,
    roughness: 0.5,
    metalness: 0.8,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    roughness: 0.1,
    metalness: 0.1,
  });

  // Frame bars
  const halfW = width / 2;
  const halfH = height / 2;
  const frameThickness = 0.1;

  const frames: THREE.Mesh[] = [];

  // top bar
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(width, frameThickness, frameThickness),
    frameMat.clone(),
  );
  top.position.set(0, yOffset + halfH, 0);
  top.castShadow = true;
  top.receiveShadow = false;
  group.add(top);
  frames.push(top);

  // bottom bar
  const bottom = new THREE.Mesh(
    new THREE.BoxGeometry(width, frameThickness, frameThickness),
    frameMat.clone(),
  );
  bottom.position.set(0, yOffset - halfH, 0);
  bottom.castShadow = true;
  bottom.receiveShadow = false;
  group.add(bottom);
  frames.push(bottom);

  // left bar
  const left = new THREE.Mesh(
    new THREE.BoxGeometry(frameThickness, height, frameThickness),
    frameMat.clone(),
  );
  left.position.set(-halfW, yOffset, 0);
  left.castShadow = true;
  left.receiveShadow = false;
  group.add(left);
  frames.push(left);

  // right bar
  const right = new THREE.Mesh(
    new THREE.BoxGeometry(frameThickness, height, frameThickness),
    frameMat.clone(),
  );
  right.position.set(halfW, yOffset, 0);
  right.castShadow = true;
  right.receiveShadow = false;
  group.add(right);
  frames.push(right);

  // Glass panel
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    glassMat.clone(),
  );
  glass.position.set(0, yOffset, 0);
  glass.castShadow = false;
  glass.receiveShadow = false;
  group.add(glass);

  return {
    get group() { return group; },
    getGlass() { return glass; },
    getFrames() { return frames; },
    dispose(): void {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    },
  };
}