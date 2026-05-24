import * as THREE from 'three';
import type { NoahState, SystemMetrics } from '../shared/types/index.js';
import { ramUsageColor } from '../shared/utils/sensory.js';


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
const noah = window.noah;

if (!noah) throw new Error('Noah preload API not available');

noah
  .getState()
  .then((state: NoahState) => {
    console.log('Initial NoahState:', state);
  })
  .catch((err: unknown) => console.error('Failed to getState:', err));

noah.onStateUpdate((state: NoahState) => {
  console.log('NoahState update:', state);
  // Later: update visuals/animation based on emotion/state.
});

// CPU load visualization bar
const barGeometry = new THREE.PlaneGeometry(2, 0.1);
const barMaterial = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
const cpuBar = new THREE.Mesh(barGeometry, barMaterial);
cpuBar.position.set(0, 1.5, 0);
scene.add(cpuBar);

// RAM usage visualization bar
const ramBarGeometry = new THREE.PlaneGeometry(2, 0.1);
const ramBarMaterial = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
const ramBar = new THREE.Mesh(ramBarGeometry, ramBarMaterial);
ramBar.position.set(0, 1.35, 0); // below CPU bar
scene.add(ramBar);


noah.onSystemMetrics((metrics: SystemMetrics) => {
  console.log('SystemMetrics:', metrics);

  // Update bar color based on CPU load
  const load = metrics.cpuLoad;
  if (load <= 30) {
    barMaterial.color.setHex(0x4ade80); // green
  } else if (load <= 60) {
    barMaterial.color.setHex(0xfacc15); // yellow
  } else if (load <= 85) {
    barMaterial.color.setHex(0xfb923c); // orange
  } else {
    barMaterial.color.setHex(0xef4444); // red
  }

  // Scale bar width slightly with load
  const scaleX = 0.5 + (load / 100) * 1.5;
  cpuBar.scale.set(scaleX, 1, 1);

  // Update RAM bar
  const ram = metrics.ramUsage;
  const ramHex = ramUsageColor(ram);
  ramBarMaterial.color.set(ramHex);

  // Make RAM bar grow with usage
  const ramScaleX = 0.5 + (ram / 100) * 1.5;
  ramBar.scale.set(ramScaleX, 1, 1);
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
