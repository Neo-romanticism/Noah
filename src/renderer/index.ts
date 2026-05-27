import * as THREE from 'three';
import type { NoahState, SystemMetrics } from '../shared/types/index.js';
import { scene, camera, renderer } from './scene.js';
import { room } from './room.js';
import { addMetricsToScene, updateAllMetrics } from './metrics.js';

const container = document.getElementById('scene-container');
if (!container) throw new Error('Scene container not found');

// ── Room ─────────────────────────────────────────────────────────
// room.group: IRoom.group — swap to loadRoomFromFile('room.glb') later
scene.add(room.group);

// ── Lighting ─────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// ── Metrics overlay ──────────────────────────────────────────────
addMetricsToScene(scene);

// ── IPC ──────────────────────────────────────────────────────────
const noah = window.noah;
if (!noah) throw new Error('Noah preload API not available');

noah
  .getState()
  .then((state: NoahState) => console.log('Initial NoahState:', state))
  .catch((err: unknown) => console.error('Failed to getState:', err));

noah.onStateUpdate((state: NoahState) => {
  console.log('NoahState update:', state);
});

noah.onSystemMetrics((metrics: SystemMetrics) => {
  console.log('SystemMetrics:', metrics);
  updateAllMetrics(metrics);
});

// ── Renderer ─────────────────────────────────────────────────────
container.appendChild(renderer.domElement);

console.log('Noah renderer initialized. Waiting for FBX avatar...');

function animate(): void {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
