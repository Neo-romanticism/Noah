import * as THREE from 'three';

console.log('[Renderer] Starting...');
import type { NoahState, SystemMetrics } from '../shared/types/index.js';
import { createScene, setupLighting, handleResize } from './scene/index.js';
import { buildRoom } from './room/index.js';
import { createMetricsUI, updateMetricsUI } from './ui/metrics.js';
import { deriveWeather, weatherColor } from '../shared/utils/sensory.js';
import { createPlaceholderAvatar, loadAvatar, updateAvatar, type LoadedAvatar } from './avatar/index.js';

// ── Global Error Handlers ─────────────────────────────────
const logBuffer: string[] = [];
function log(...args: unknown[]): void {
  const msg = args.map(a => String(a)).join(' ');
  logBuffer.push(msg);
  console.log('[Noah]', msg);
}
window.addEventListener('error', (e) => {
  log('[Global] Uncaught error:', e.message, e.error);
});
window.addEventListener('unhandledrejection', (e) => {
  log('[Global] Unhandled promise rejection:', e.reason);
});

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

// Scene 전체 디버깅: 흰색/밝은 객체 탐색
function debugSceneGraph(scene: THREE.Scene): void {
  console.log('=== Scene Graph Debug ===');
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((mat, i) => {
        const color = (mat as any).color;
        const hex = color ? `#${color.getHexString()}` : 'N/A';
        const intensity = color ? color.r + color.g + color.b : 0;
        console.log(
          `[Scene] name="${mesh.name}" ` +
          `parent="${mesh.parent?.name || 'scene'}" ` +
          `pos=(${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)}) ` +
          `geo=${mesh.geometry.type} ` +
          `mat[${i}].color=${hex} ` +
          `intensity=${intensity.toFixed(2)} ` +
          `isAvatarChild=${mesh.parent?.name?.includes('noah') || mesh.parent?.parent?.name?.includes('noah') || false}`
        );
      });
    }
  });
  console.log('=== End Scene Graph Debug ===');
}

// 흰색이면서 Box/Capsule/Plane geometry인 객체 필터링
function findWhiteBoxCandidates(scene: THREE.Scene): THREE.Mesh[] {
  const candidates: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const isWhite = materials.some((m) => {
        const c = (m as any).color;
        return c && c.r > 0.85 && c.g > 0.85 && c.b > 0.85;
      });
      const geoType = mesh.geometry.type;
      const isBoxLike = geoType.includes('Box') || geoType.includes('Capsule') || geoType.includes('Plane');
      if (isWhite && isBoxLike) {
        candidates.push(mesh);
      }
    }
  });
  return candidates;
}

// Try loading FBX avatar; fallback to placeholder
async function initAvatar(): Promise<void> {
  log('[Avatar] initAvatar called');
  const fbxPath = './models/noah.fbx';
  log('[Avatar] Attempting to load FBX from:', fbxPath);

  try {
    const loaded = await loadAvatar(ctx.scene, {
      modelPath: fbxPath,
      // NOTE: Scale 0.3 is a temporary workaround.
      // The FBX model has UnitScaleFactor=100 (cm units), so theoretically
      // a scale of 0.01 should convert cm→m correctly. However, in practice
      // 0.01 renders the avatar too small to see, while 1.0 makes it far too
      // large (fills the entire screen). Empirically 0.3 looks proportionate
      // with the room and camera setup.
      // TODO: Re-examine once the true FBX unit/rig setup is verified.
      scale: 0.3,
      position: new THREE.Vector3(0, 0, 0.5),
    });

    if (loaded) {
      avatar = loaded;
      console.log('[Avatar] FBX avatar loaded successfully');
      console.log('[Avatar] Group children:', loaded.group.children.length);
      console.log('[Avatar] Has mixer:', loaded.mixer !== null);
      console.log('[Avatar] Animations:', loaded.animations.length);

      // Log bounding box for debugging
      const box = new THREE.Box3().setFromObject(loaded.group);
      const size = new THREE.Vector3();
      box.getSize(size);
      console.log('[Avatar] Bounding box size:', size.x.toFixed(3), size.y.toFixed(3), size.z.toFixed(3));
      console.log('[Avatar] Position:', loaded.group.position.x, loaded.group.position.y, loaded.group.position.z);

      // Avatar Group 낸부 모든 객체 로깅
      console.log('=== Avatar Group Children ===');
      loaded.group.traverse((child) => {
        const path: string[] = [];
        let curr: THREE.Object3D | null = child;
        while (curr) {
          path.unshift(curr.name || curr.type);
          curr = curr.parent;
        }
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const mat = mesh.material as THREE.MeshPhysicalMaterial;
          console.log(
            `[AvatarChild] path="${path.join(' > ')}" ` +
            `geo=${mesh.geometry.type} ` +
            `color=#${mat.color?.getHexString()} ` +
            `pos=(${mesh.position.x.toFixed(3)}, ${mesh.position.y.toFixed(3)}, ${mesh.position.z.toFixed(3)})`
          );
        }
      });
      console.log('=== End Avatar Group Children ===');
    } else {
      log('[Avatar] FBX load failed, using placeholder');
      avatar = createPlaceholderAvatar(ctx.scene);
    }
  } catch (err) {
    log('[Avatar] Error during load:', err);
    log('[Avatar] Falling back to placeholder');
    avatar = createPlaceholderAvatar(ctx.scene);
  }

  // Scene 전체 디버깅 (아바타 로드 후)
  debugSceneGraph(ctx.scene);

  // 흰색 박스 후보 필터링
  const candidates = findWhiteBoxCandidates(ctx.scene);
  console.log(`[Debug] Found ${candidates.length} white box candidates:`);
  candidates.forEach((m, i) => {
    console.log(`  [${i}] name="${m.name}" geo=${m.geometry.type} pos=(${m.position.x.toFixed(2)}, ${m.position.y.toFixed(2)}, ${m.position.z.toFixed(2)})`);
  });
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
let screenshotTaken = false;
let framesSinceLoad = 0;

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Update avatar animations
  if (avatar) {
    updateAvatar(avatar, delta);
  }

  ctx.renderer.render(ctx.scene, ctx.camera);

  // Take a diagnostic screenshot once avatar is presumably ready
  if (avatar && !screenshotTaken) {
    framesSinceLoad++;
    if (framesSinceLoad > 120) { // Approx 2 seconds at 60fps
      console.log('[Renderer] Taking diagnostic screenshot...');
      const dataUrl = ctx.renderer.domElement.toDataURL('image/png');
      window.noah.saveScreenshot(dataUrl);
      screenshotTaken = true;
    }
  }
}

animate();

console.log('Noah Stage 4 renderer initialized — Room, Window, Avatar pipeline ready.');