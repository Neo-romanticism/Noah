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
import { loadAvatar, createPlaceholderAvatar, type IAvatar } from './avatar.js';
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

console.log('Noah renderer initialized. Loading VRM avatar...');

// ── Avatar (async) ─────────────────────────────────────────────────
let avatar: IAvatar;

(async () => {
  try {
    const loaded = await loadAvatar({
      modelPath: './models/noah.glb',
      scale: 1.0,
      position: new THREE.Vector3(0, 0, 0.5),
    });
    avatar = loaded;
    console.log('[Avatar] VRM loaded successfully');
  } catch (err) {
    console.error('[Avatar] Failed to load VRM, using placeholder:', err);
    avatar = createPlaceholderAvatar();
  }
  scene.add(avatar.group);
})();

const clock = new THREE.Clock();
let frameCount = 0;

function update(_weather: SystemWeather, delta: number): void {
  weatherFx.update(_weather, delta);
  if (avatar) avatar.update(delta);
}

function animate(): void {
  requestAnimationFrame(animate);
  update(currentWeather, clock.getDelta());
  renderer.render(scene, camera);
  frameCount++;
  if (frameCount === 60) {
    console.log('[renderer] GPU info:', JSON.stringify({
      textures: renderer.info.memory.textures,
      geometries: renderer.info.memory.geometries,
      programs: renderer.info.programs?.length ?? 0,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
    }));
  }
}
animate();
