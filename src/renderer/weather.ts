import * as THREE from 'three';
import type { SystemWeather } from '../shared/types/index.js';

const RAIN_PARTICLE_COUNT = 500;
const RAIN_FALL_SPEED = 3;
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
    velocities[i] = RAIN_FALL_SPEED + Math.random() * 2;
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
  // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments)
  const sunBeams = new THREE.Group();
  sunBeams.position.set(0, 2, -4.5);

  const beamConfigs = [
    { rTop: 0.02, rBot: 1.5, h: 4, opacity: 0.04 },
    { rTop: 0.01, rBot: 1.0, h: 3.5, opacity: 0.06 },
    { rTop: 0.0, rBot: 0.5, h: 3, opacity: 0.08 },
  ] as const;

  for (const { rTop, rBot, h, opacity } of beamConfigs) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfffde6,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, h, 8, 1),
      mat,
    );
    beam.rotation.x = -Math.PI / 2;
    sunBeams.add(beam);
  }

  // ── Update logic ────────────────────────────────────────────────
  function update(weather: SystemWeather, delta: number): void {
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
