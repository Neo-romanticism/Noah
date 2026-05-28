import * as THREE from 'three';
import type { SystemWeather } from '../shared/types/index.js';

const RAIN_PARTICLE_COUNT = 500;
const RAIN_FALL_SPEED = 3; // units per second
const RAIN_AREA = {
  xMin: -4,
  xMax: 4,
  yMin: 0,
  yMax: 4,
  zMin: -4,
  zMax: 4,
};

export interface WeatherEffects {
  rain: THREE.Points;
  sunBeams: THREE.Group;
  /** 매 프레임 호출 — 파티클 위치 업데이트 + 가시성 전환 */
  update(weather: SystemWeather, delta: number): void;
  dispose(): void;
}

export function createWeatherEffects(): WeatherEffects {
  // ── Rain particles ──────────────────────────────────────────────
  const rainGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(RAIN_PARTICLE_COUNT * 3);
  const velocities = new Float32Array(RAIN_PARTICLE_COUNT);

  for (let i = 0; i < RAIN_PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    positions[i3] =
      RAIN_AREA.xMin + Math.random() * (RAIN_AREA.xMax - RAIN_AREA.xMin);
    positions[i3 + 1] =
      RAIN_AREA.yMin + Math.random() * (RAIN_AREA.yMax - RAIN_AREA.yMin);
    positions[i3 + 2] =
      RAIN_AREA.zMin + Math.random() * (RAIN_AREA.zMax - RAIN_AREA.zMin);
    velocities[i] = RAIN_FALL_SPEED + Math.random() * 2; // slight speed variation
  }

  rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const rainMaterial = new THREE.PointsMaterial({
    color: 0x87ceeb,
    size: 0.05,
    transparent: true,
    opacity: 0.6,
  });

  const rain = new THREE.Points(rainGeometry, rainMaterial);

  // ── Sun beams ───────────────────────────────────────────────────
  // Volumetric light approximation — cones pointing downward from window
  const sunBeams = new THREE.Group();
  sunBeams.position.set(0, 2, -4.5);

  const beamMat1 = new THREE.MeshBasicMaterial({
    color: 0xfffde6,
    transparent: true,
    opacity: 0.04,
    depthWrite: false,
  });
  const beamMat2 = new THREE.MeshBasicMaterial({
    color: 0xfffde6,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
  });
  const beamMat3 = new THREE.MeshBasicMaterial({
    color: 0xfffde6,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
  });

  // ConeGeometry(radiusTop, radiusBottom, height, segments)
  // Plan: Cone1 rTop=0.02 rBot=1.5 h=4, Cone2 rTop=0.01 rBot=1.0 h=3.5, Cone3 rTop=0 rBot=0.5 h=3
  const cone1 = new THREE.Mesh(
    new THREE.ConeGeometry(0.02, 1.5, 4, 1),
    beamMat1,
  );
  cone1.rotation.x = -Math.PI / 2;
  sunBeams.add(cone1);

  const cone2 = new THREE.Mesh(
    new THREE.ConeGeometry(0.01, 1.0, 4, 1),
    beamMat2,
  );
  cone2.rotation.x = -Math.PI / 2;
  sunBeams.add(cone2);

  const cone3 = new THREE.Mesh(
    new THREE.ConeGeometry(0.0, 0.5, 4, 1),
    beamMat3,
  );
  cone3.rotation.x = -Math.PI / 2;
  sunBeams.add(cone3);

  // ── Update logic ────────────────────────────────────────────────
  function update(weather: SystemWeather, delta: number): void {
    // Rain visibility
    const rainVisible = weather === 'rainy' || weather === 'stormy';
    rain.visible = rainVisible;

    if (rainVisible) {
      const pos = rain.geometry?.attributes?.position;
      if (pos) {
        for (let i = 0; i < RAIN_PARTICLE_COUNT; i++) {
          const y = pos.getY(i);
          if (y !== undefined) {
            const newY = y - (velocities[i] ?? RAIN_FALL_SPEED) * delta;
            if (newY < RAIN_AREA.yMin) {
              pos.setY(i, RAIN_AREA.yMax + Math.random() * 0.5);
            } else {
              pos.setY(i, newY);
            }
          }
        }
        pos.needsUpdate = true;
      }
    }

    // Sun beam visibility
    sunBeams.visible = weather === 'sunny';
  }

  return {
    rain,
    sunBeams,
    update,
    dispose(): void {
      rain.geometry.dispose();
      rain.material.dispose();
      sunBeams.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    },
  };
}