import * as THREE from 'three';
import type { Emotion, NoahState, SystemMetrics } from '../shared/types/index.js';
import { scene, camera, renderer } from './scene.js';
import { room } from './room.js';
import { createMetricsDisplay } from './metrics.js';
import { createLighting } from './lighting.js';
import { createWindow } from './window.js';
import { createWeatherEffects } from './weather.js';
import { deriveWeather } from '../shared/utils/sensory.js';
import { createInteractionManager } from './interaction/index.js';
import { loadAvatar, createPlaceholderAvatar, type IAvatar } from './avatar.js';
import { AnimationSystem } from './animation/index.js';
import { createDialogBubble } from './dialog-bubble.js';
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

// ── Renderer ─────────────────────────────────────────────────────
container.appendChild(renderer.domElement);

console.log('Noah renderer initialized. Loading VRM avatar...');

// ── Avatar & Animation (async) ─────────────────────────────────────
let avatar: IAvatar;
let animationSystem: AnimationSystem;

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

  animationSystem = new AnimationSystem(avatar, './animations/manifest.json');
  await animationSystem.initialize();

  // ── Interaction system (after avatar/animation ready) ──────────
  const interaction = createInteractionManager(camera, renderer.domElement);

  interaction.register(metricsDisplay.cpuMetric.bar, {
    hoverenter() { metricsDisplay.cpuMetric.setHovered(true); },
    hoverleave() { metricsDisplay.cpuMetric.setHovered(false); },
  });
  interaction.register(metricsDisplay.ramMetric.bar, {
    hoverenter() { metricsDisplay.ramMetric.setHovered(true); },
    hoverleave() { metricsDisplay.ramMetric.setHovered(false); },
  });

  interaction.setEventCallbacks({
    onDragStart() {
      animationSystem.playInteraction('drag');
      noah.sendInteraction({ type: 'drag', timestamp: Date.now() });
    },
    onDragEnd(velocity) {
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      animationSystem.playTrigger(speed > 5 ? 'throw' : 'land');
      noah.sendInteraction({
        type: 'throw',
        velocity: { x: velocity.x, y: velocity.y },
        timestamp: Date.now(),
      });
    },
    onPetStart() {
      animationSystem.playInteraction('pet');
      noah.sendInteraction({ type: 'pet', timestamp: Date.now() });
    },
    onClick() {
      animationSystem.playInteraction('click');
      noah.sendInteraction({ type: 'click', timestamp: Date.now() });
    },
  });

  // Register avatar group for interaction
  interaction.register(avatar.group);
})();

// ── IPC ──────────────────────────────────────────────────────────
const noah = window.noah;
if (!noah) throw new Error('Noah preload API not available');

noah
  .getState()
  .then((state: NoahState) => console.log('Initial NoahState:', state))
  .catch((err: unknown) => console.error('Failed to getState:', err));

// ── Dialog Bubble ─────────────────────────────────────────────────
const dialogBubble = createDialogBubble();

noah.onStateUpdate((state: NoahState) => {
  if (animationSystem && state.emotion) {
    animationSystem.setEmotion(state.emotion);
  }
  if (dialogBubble) {
    dialogBubble.showEmotion(state.emotion);
  }
});

// ── Dialog/Thought IPC ──────────────────────────────────────────
noah.onDialog((text: string) => {
  console.log('[Dialog]', text);
  dialogBubble.show(text, 4000);
});

noah.onAutonomousAction((action) => {
  console.log('[AutonomousAction]', action);
  if (action.type === 'animation' && animationSystem) {
    if (action.payload === 'sleep') {
      animationSystem.playInteraction('sleep');
    }
  }
  if (action.type === 'expression' && animationSystem) {
    animationSystem.setEmotion(action.payload as Emotion);
  }
});

let currentWeather: SystemWeather = 'sunny';

noah.onSystemMetrics((metrics: SystemMetrics) => {
  console.log('SystemMetrics:', metrics);
  metricsDisplay.update(metrics);
  currentWeather = deriveWeather(metrics);
});

const clock = new THREE.Clock();
let frameCount = 0;

function update(_weather: SystemWeather, delta: number): void {
  weatherFx.update(_weather, delta);
  if (avatar) avatar.update(delta);
  if (animationSystem) animationSystem.update(delta);
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
