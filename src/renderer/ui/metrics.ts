import * as THREE from 'three';
import type { SystemMetrics } from '../../shared/types/index.js';
import { ramUsageColor, cpuTempColor, deriveWeather, weatherColor } from '../../shared/utils/sensory.js';

export interface MetricsUI {
  cpuBar: THREE.Mesh;
  ramBar: THREE.Mesh;
  tempDot: THREE.Mesh;
  bgPlane: THREE.Mesh;
  group: THREE.Group;
}

export function createMetricsUI(): MetricsUI {
  const group = new THREE.Group();

  // Background plane — reacts to system weather.
  // Placed far behind everything so it acts as a true sky backdrop
  // rather than bleeding through / tinting the room meshes.
  const bgGeometry = new THREE.PlaneGeometry(200, 200);
  const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x87ceeb });
  const bgPlane = new THREE.Mesh(bgGeometry, bgMaterial);
  bgPlane.position.set(0, 0, -20); // well behind the room (walls at z ≈ -1.5)
  group.add(bgPlane);

  // CPU load visualization bar
  const barGeometry = new THREE.PlaneGeometry(1.2, 0.08);
  const barMaterial = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
  const cpuBar = new THREE.Mesh(barGeometry, barMaterial);
  cpuBar.position.set(0, 1.6, 0.5);
  group.add(cpuBar);

  // RAM usage visualization bar
  const ramBarGeometry = new THREE.PlaneGeometry(1.2, 0.08);
  const ramBarMaterial = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
  const ramBar = new THREE.Mesh(ramBarGeometry, ramBarMaterial);
  ramBar.position.set(0, 1.48, 0.5);
  group.add(ramBar);

  // CPU temperature indicator dot
  const tempDotGeometry = new THREE.CircleGeometry(0.06, 32);
  const tempDotMaterial = new THREE.MeshBasicMaterial({ color: 0x9ca3af });
  const tempDot = new THREE.Mesh(tempDotGeometry, tempDotMaterial);
  tempDot.position.set(0.8, 1.6, 0.5);
  group.add(tempDot);

  return {
    cpuBar,
    ramBar,
    tempDot,
    bgPlane,
    group,
  };
}

export function updateMetricsUI(ui: MetricsUI, metrics: SystemMetrics): void {
  const { cpuBar, ramBar, tempDot, bgPlane } = ui;

  // Update CPU bar
  const load = metrics.cpuLoad;
  if (load <= 30) {
    (cpuBar.material as THREE.MeshBasicMaterial).color.setHex(0x4ade80); // green
  } else if (load <= 60) {
    (cpuBar.material as THREE.MeshBasicMaterial).color.setHex(0xfacc15); // yellow
  } else if (load <= 85) {
    (cpuBar.material as THREE.MeshBasicMaterial).color.setHex(0xfb923c); // orange
  } else {
    (cpuBar.material as THREE.MeshBasicMaterial).color.setHex(0xef4444); // red
  }
  const scaleX = 0.5 + (load / 100) * 1.5;
  cpuBar.scale.set(scaleX, 1, 1);

  // Update RAM bar
  const ram = metrics.ramUsage;
  const ramHex = ramUsageColor(ram);
  (ramBar.material as THREE.MeshBasicMaterial).color.set(ramHex);
  const ramScaleX = 0.5 + (ram / 100) * 1.5;
  ramBar.scale.set(ramScaleX, 1, 1);

  // Update temperature dot
  const temp = metrics.cpuTemp;
  (tempDot.material as THREE.MeshBasicMaterial).color.set(cpuTempColor(temp));

  // Update background weather tint
  const weather = deriveWeather(metrics);
  (bgPlane.material as THREE.MeshBasicMaterial).color.set(weatherColor(weather));
}
