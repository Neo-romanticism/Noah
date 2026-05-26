import * as THREE from 'three';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  container: HTMLElement;
}

export function createScene(container: HTMLElement): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111); // Dark gray instead of transparent

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  // Camera positioned to frame the avatar + room comfortably.
  // With avatar scale 0.3, this distance gives a good medium shot.
  camera.position.set(0, 1.4, 4.5);
  camera.lookAt(0, 0.6, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Color management (prevents unexpected washout / white rendering)
  // Three.js expects sRGB output for correct standard material appearance.
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ACESFilmic tone mapping prevents colours from blowing out to white
  // under multiple light sources.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  container.appendChild(renderer.domElement);

  return { scene, camera, renderer, container };
}

export interface LightingSetup {
  mainLight: THREE.DirectionalLight;
  fillLight: THREE.DirectionalLight;
  rimLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
}

export function setupLighting(scene: THREE.Scene): LightingSetup {
  // Moderate ambient light to ensure the room is not too dark
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  // Key light — warm and bright
  const mainLight = new THREE.DirectionalLight(0xfff5e6, 0.75);
  mainLight.position.set(5, 8, 5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  mainLight.shadow.bias = -0.001;
  scene.add(mainLight);

  // Cool fill — adds depth to shadows
  const fillLight = new THREE.DirectionalLight(0xc8d8e8, 0.3);
  fillLight.position.set(-3, 4, -2);
  scene.add(fillLight);

  // Rim / back light — helps separate objects from background
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
  rimLight.position.set(0, 3, -4);
  scene.add(rimLight);

  return { mainLight, fillLight, rimLight, ambientLight };
}

export function handleResize(ctx: SceneContext): void {
  window.addEventListener('resize', () => {
    ctx.camera.aspect = window.innerWidth / window.innerHeight;
    ctx.camera.updateProjectionMatrix();
    ctx.renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
