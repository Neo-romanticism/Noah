import * as THREE from 'three';

export interface LightingSetup {
  ambient: THREE.AmbientLight;
  sun: THREE.DirectionalLight;
  dispose(): void;
}

export function createLighting(): LightingSetup {
  // Ambient light — increased intensity for MeshPhysicalMaterial rendering
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);

  // Directional light (sun) — positioned to illuminate avatar from front
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(-2, 5, 3);
  sun.castShadow = true;

  // Shadow map configuration
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 50;
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;

  return {
    ambient,
    sun,
    dispose(): void {
      // Light objects (AmbientLight, DirectionalLight) don't have dispose().
      // Only their shadow maps (LightShadow → RenderTarget) need cleanup.
      sun.shadow.map?.dispose();
    },
  };
}