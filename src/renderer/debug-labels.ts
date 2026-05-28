import * as THREE from 'three';
import { createTextSprite } from './text-sprite.js';

const IS_DEV = (window as any).noah?.isDev ?? false;

export function addDebugLabels(scene: THREE.Scene): () => void {
  if (!IS_DEV) {
    console.log('[debug-labels] Skipped — production build');
    return () => {};
  }

  console.log('[debug-labels] Adding mesh name labels (dev mode)');

  const meshes: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshes.push(child);
    }
  });

  const sprites: THREE.Sprite[] = [];
  const worldPos = new THREE.Vector3();

  for (const mesh of meshes) {
    const name = mesh.name.trim();
    if (!name) continue;

    mesh.getWorldPosition(worldPos);
    worldPos.y += 0.4;

    const label = createTextSprite(name, {
      fontSize: 52,
      color: '#ff3333',
      scale: 1.5,
      bgColor: 'transparent',
      dropShadow: true,
      outlineColor: 'rgba(255,255,255,0.35)',
      outlineWidth: 2,
    });
    label.position.copy(worldPos);
    scene.add(label);
    sprites.push(label);
  }

  return () => {
    for (const sprite of sprites) {
      scene.remove(sprite);
      sprite.material.dispose();
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
    }
    sprites.length = 0;
  };
}
