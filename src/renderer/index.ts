import * as THREE from 'three';
import type { NoahState, SystemMetrics } from '../shared/types/index.js';
import { createScene, setupLighting, handleResize } from './scene/index.js';
import { buildRoom } from './room/index.js';
import { createMetricsUI, updateMetricsUI } from './ui/metrics.js';
import { deriveWeather, weatherColor } from '../shared/utils/sensory.js';
import { createPlaceholderAvatar, loadAvatar, updateAvatar, type LoadedAvatar } from './avatar/index.js';

// ── Scene Setup ───────────────────────────────────────────────

const container = document.getElementById('scene-container');
if (!container) throw new Error('Scene container not found');

const ctx = createScene(container);
setupLighting(ctx.scene);
handleResize(ctx);

// ── Room Construction ─────────────────────────────────────────

const room = buildRoom(ctx);

// ── Metrics UI (Stage 3, repositioned above the room) ─────────

const metricsUI = createMetricsUI();
ctx.scene.add(metricsUI.group);

// ── Avatar ────────────────────────────────────────────────────

let avatar: LoadedAvatar | null = null;

// Try loading FBX avatar; fallback to placeholder
async function initAvatar(): Promise<void> {
  const fbxPath = './assets/models/noah.fbx';
  const loaded = await loadAvatar(ctx.scene, {
    modelPath: fbxPath,
    scale: 0.01,
    position: new THREE.Vector3(0, -0.5, 0.5),
  });

  if (loaded) {
    avatar = loaded;
    console.log('FBX avatar loaded successfully');
  } else {
    avatar = createPlaceholderAvatar(ctx.scene);
    console.log('Using placeholder avatar (no FBX model found)');
  }
}

void initAvatar();

// ── IPC Integration ───────────────────────────────────────────

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
  // Future: update avatar animation/emotion based on state
});

noah.onSystemMetrics((metrics: SystemMetrics) => {
  console.log('SystemMetrics:', metrics);

  // Update metrics bars and background
  updateMetricsUI(metricsUI, metrics);

  // Also update the window "sky" color with weather
  const weather = deriveWeather(metrics);
  const winColor = weatherColor(weather);
  (room.windowLight.material as THREE.MeshBasicMaterial).color.set(winColor);

  // Log process count
  console.log(`Running processes: ${metrics.processes.length}`);
});

// ── Animation Loop ────────────────────────────────────────────

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Update avatar animations
  if (avatar) {
    updateAvatar(avatar, delta);
  }

  ctx.renderer.render(ctx.scene, ctx.camera);
}

animate();

console.log('Noah Stage 4 renderer initialized — Room, Window, Avatar pipeline ready.');
