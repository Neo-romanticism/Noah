import * as THREE from 'three';

const container = document.getElementById('scene-container');
if (!container) throw new Error('Scene container not found');

// Scene setup
const scene = new THREE.Scene();
scene.background = null; // Transparent

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1, 3);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Basic lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Stage-01 IPC integration
const noah = (window as any).noah as
  | {
      getState: () => Promise<unknown>;
      onStateUpdate: (cb: (state: unknown) => void) => void;
      onSystemMetrics: (cb: (metrics: unknown) => void) => void;
      sendInteraction: (action: unknown) => void;
    }
  | undefined;

if (!noah) throw new Error('Noah preload API not available');

noah
  .getState()
  .then((state: unknown) => {
    console.log('Initial NoahState:', state);
  })
  .catch((err: unknown) => console.error('Failed to getState:', err));

noah.onStateUpdate((state: unknown) => {
  console.log('NoahState update:', state);
  // Later: update visuals/animation based on emotion/state.
});

noah.onSystemMetrics((metrics: unknown) => {
  // Later: display metrics-driven behaviors.
  console.log('SystemMetrics:', metrics);
});


// Placeholder — FBX avatar will be loaded here via FBXLoader
console.log('Noah renderer initialized. Waiting for FBX avatar...');


// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
