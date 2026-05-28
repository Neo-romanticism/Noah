import * as THREE from 'three';
import type { NoahState, SystemMetrics } from '../shared/types/index.js';
import { scene, camera, renderer } from './scene.js';
import { room } from './room.js';
import { addMetricsToScene, updateAllMetrics } from './metrics.js';
import { createLighting } from './lighting.js';
import { createWindow } from './window.js';
import { createWeatherEffects } from './weather.js';
import { deriveWeather } from '../shared/utils/sensory.js';
import type { SystemWeather } from '../shared/types/index.js';

const container = document.getElementById('scene-container');
if (!container) throw new Error('Scene container not found');

// ── Room ─────────────────────────────────────────────────────────
// room.group: IRoom.group — swap to loadRoomFromFile('room.glb') later
scene.add(room.group);

// ── Lighting (replaces hardcoded AmbientLight + DirectionalLight) ──
const lighting = createLighting();
scene.add(lighting.ambient);
scene.add(lighting.sun);

// ── Window ───────────────────────────────────────────────────────
const windowObj = createWindow();
scene.add(windowObj.group);

// ── Weather effects ──────────────────────────────────────────────
const weatherFx = createWeatherEffects();
scene.add(weatherFx.rain);
scene.add(weatherFx.sunBeams);

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

let currentWeather: SystemWeather = 'sunny';

noah.onSystemMetrics((metrics: SystemMetrics) => {
  console.log('SystemMetrics:', metrics);
  updateAllMetrics(metrics);
  currentWeather = deriveWeather(metrics);
});

// ── Renderer ─────────────────────────────────────────────────────
container.appendChild(renderer.domElement);

console.log('Noah renderer initialized. Waiting for FBX avatar...');

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  weatherFx.update(currentWeather, clock.getDelta());
  renderer.render(scene, camera);
}
animate();