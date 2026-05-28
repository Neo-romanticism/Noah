import * as THREE from 'three';
import type { SystemMetrics } from '../shared/types/index.js';
import {
  ramUsageColor,
  cpuTempColor,
  deriveWeather,
  weatherColor,
} from '../shared/utils/sensory.js';

// ── Helpers ──────────────────────────────────────────────────────

function createBar(width: number, height: number, color: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color }),
  );
}

function createTempDot(radius: number, color: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.CircleGeometry(radius, 32),
    new THREE.MeshBasicMaterial({ color }),
  );
}

// ── CPU load bar ─────────────────────────────────────────────────

const cpuBar = createBar(2, 0.1, 0x4ade80);
cpuBar.position.set(0, 1.5, 0);

function updateCpuBar(load: number): void {
  const mat = cpuBar.material as THREE.MeshBasicMaterial;
  if (load <= 30) mat.color.setHex(0x4ade80);
  else if (load <= 60) mat.color.setHex(0xfacc15);
  else if (load <= 85) mat.color.setHex(0xfb923c);
  else mat.color.setHex(0xef4444);

  cpuBar.scale.set(0.5 + (load / 100) * 1.5, 1, 1);
}

// ── RAM usage bar ────────────────────────────────────────────────

const ramBar = createBar(2, 0.1, 0x60a5fa);
ramBar.position.set(0, 1.35, 0);

function updateRamBar(usage: number): void {
  const mat = ramBar.material as THREE.MeshBasicMaterial;
  mat.color.set(ramUsageColor(usage));
  ramBar.scale.set(0.5 + (usage / 100) * 1.5, 1, 1);
}

// ── CPU temp indicator dot ───────────────────────────────────────

const tempDot = createTempDot(0.08, 0x9ca3af);
tempDot.position.set(1.2, 1.5, 0);

function updateTempDot(temp: number): void {
  const mat = tempDot.material as THREE.MeshBasicMaterial;
  mat.color.set(cpuTempColor(temp));
}

// ── Weather background plane ─────────────────────────────────────

const weatherMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb });
const weatherPlane = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), weatherMat);
weatherPlane.position.set(0, 0, -5.01); // 창문 뒤에서 하늘 역할

function updateWeather(metrics: SystemMetrics): void {
  weatherMat.color.set(weatherColor(deriveWeather(metrics)));
}

// ── Public API ───────────────────────────────────────────────────

export function addMetricsToScene(scene: THREE.Scene): void {
  scene.add(cpuBar, ramBar, tempDot, weatherPlane);
}

export function updateAllMetrics(metrics: SystemMetrics): void {
  updateCpuBar(metrics.cpuLoad);
  updateRamBar(metrics.ramUsage);
  updateTempDot(metrics.cpuTemp);
  updateWeather(metrics);
}
