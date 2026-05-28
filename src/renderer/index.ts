import * as THREE from 'three';
import type { NoahState, SystemMetrics } from '../shared/types/index.js';
import { scene, camera, renderer } from './scene.js';
import { room } from './room.js';
import { createMetricsDisplay } from './metrics.js';
import { createLighting } from './lighting.js';
import { createWindow } from './window.js';
import { createWeatherEffects } from './weather.js';
import { deriveWeather } from '../shared/utils/sensory.js';
import { createInteractionManager } from './interaction/index.js';
import type { SystemWeather } from '../shared/types/index.js';

const container = document.getElementById('scene-container');
if (!container) throw new Error('Scene container not found');

// ── Room ─────────────────────────────────────────────────────────
scene.add(room.group);

// ── Lighting ─────────────────────────────────────────────────────
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
const metricsDisplay = createMetricsDisplay();
metricsDisplay.addToScene(scene);

// ── Interaction system ──────────────────────────────────────────
const interaction = createInteractionManager(camera, renderer.domElement);

interaction.register(metricsDisplay.cpuMetric.bar, {
  hoverenter() { metricsDisplay.cpuMetric.setHovered(true); },
  hoverleave() { metricsDisplay.cpuMetric.setHovered(false); },
});
interaction.register(metricsDisplay.ramMetric.bar, {
  hoverenter() { metricsDisplay.ramMetric.setHovered(true); },
  hoverleave() { metricsDisplay.ramMetric.setHovered(false); },
});

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
  metricsDisplay.update(metrics);
  currentWeather = deriveWeather(metrics);
});

// ── Renderer ─────────────────────────────────────────────────────
container.appendChild(renderer.domElement);

console.log('Noah renderer initialized. Waiting for FBX avatar...');

const clock = new THREE.Clock();

function update(_weather: SystemWeather, delta: number): void {
  weatherFx.update(_weather, delta);
}

function animate(): void {
  requestAnimationFrame(animate);
  update(currentWeather, clock.getDelta());
  renderer.render(scene, camera);
}
animate();
