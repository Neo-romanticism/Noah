import * as THREE from 'three';
import { cpuTempColor } from '../shared/utils/sensory.js';
import { createTextSprite, updateSpriteTexture } from './text-sprite.js';

export const CPU_POS = new THREE.Vector3(-2.5, 2.0, -4.6);
export const RAM_POS = new THREE.Vector3(2.5, 2.0, -4.6);
export const TEMP_POS = new THREE.Vector3(2.5, 1.3, -4.6);
export const WEATHER_POS = new THREE.Vector3(0, 3.2, -4.6);

const BAR_WIDTH = 2.0;
const BAR_HEIGHT = 0.15;
const BAR_DEPTH = 0.1;

export interface MetricBar3D {
  group: THREE.Group;
  bar: THREE.Mesh;
  track: THREE.Mesh;
  label: THREE.Sprite;
  valueLabel: THREE.Sprite;
  setHovered(hovered: boolean): void;
  update(value: number, color: THREE.Color | string): void;
}

export function createMetricBar3D(
  name: string,
  position: THREE.Vector3,
  color: number | string,
): MetricBar3D {
  const group = new THREE.Group();
  group.position.copy(position);

  const trackMat = new THREE.MeshBasicMaterial({
    color: 0x333333,
    transparent: true,
    opacity: 0.3,
  });
  const track = new THREE.Mesh(
    new THREE.BoxGeometry(BAR_WIDTH, BAR_HEIGHT, BAR_DEPTH * 0.5),
    trackMat,
  );
  group.add(track);

  const barMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.3,
    emissive: color,
    emissiveIntensity: 0,
  });
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(BAR_WIDTH, BAR_HEIGHT, BAR_DEPTH),
    barMat,
  );
  bar.position.z = 0.05;
  group.add(bar);

  const label = createTextSprite(name, {
    fontSize: 36,
    color: '#cccccc',
    scale: 0.4,
    bgColor: 'transparent',
  });
  label.position.set(0, BAR_HEIGHT / 2 + 0.25, 0);
  group.add(label);

  const valueLabel = createTextSprite('0%', {
    fontSize: 32,
    color: '#ffffff',
    scale: 0.35,
    bgColor: 'rgba(0,0,0,0.3)',
  });
  valueLabel.position.set(BAR_WIDTH / 2 + 0.3, 0, 0);
  group.add(valueLabel);

  let lastValue = -1;

  return {
    group,
    bar,
    track,
    label,
    valueLabel,
    setHovered(hovered: boolean) {
      const mat = bar.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = hovered ? 0.5 : 0;
      const s = hovered ? 1.05 : 1;
      group.scale.set(s, s, s);
    },
    update(value: number, color: THREE.Color | string) {
      const mat = bar.material as THREE.MeshStandardMaterial;
      const c = color instanceof THREE.Color ? color : new THREE.Color(color);
      mat.color.copy(c);
      mat.emissive.copy(c);

      bar.scale.x = Math.max(0.1, value / 100);

      const rounded = Math.round(value);
      if (rounded !== lastValue) {
        lastValue = rounded;
        updateSpriteTexture(valueLabel, `${rounded}%`, {
          fontSize: 32,
          color: '#ffffff',
          scale: 0.35,
          bgColor: 'rgba(0,0,0,0.3)',
        });
      }
    },
  };
}

export interface TempDisplay3D {
  group: THREE.Group;
  sphere: THREE.Mesh;
  label: THREE.Sprite;
  update(temp: number): void;
}

export function createTempDisplay3D(position: THREE.Vector3): TempDisplay3D {
  const group = new THREE.Group();
  group.position.copy(position);

  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    emissive: 0x9ca3af,
    emissiveIntensity: 0.2,
    roughness: 0.3,
    metalness: 0.5,
  });
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16),
    sphereMat,
  );
  group.add(sphere);

  const label = createTextSprite('Temp: --°C', {
    fontSize: 28,
    color: '#aaaaaa',
    scale: 0.3,
    bgColor: 'transparent',
  });
  label.position.set(0.25, 0, 0);
  group.add(label);

  let lastTemp = -1;

  return {
    group,
    sphere,
    label,
    update(temp: number) {
      const colorStr = cpuTempColor(temp);
      const c = new THREE.Color(colorStr);
      sphereMat.color.copy(c);
      sphereMat.emissive.copy(c);
      sphereMat.emissiveIntensity = temp > 60 ? 0.5 : 0.2;

      const rounded = Math.round(temp);
      if (rounded !== lastTemp) {
        lastTemp = rounded;
        updateSpriteTexture(
          label,
          temp <= 0 ? 'Temp: --°C' : `Temp: ${rounded}°C`,
          { fontSize: 28, color: '#aaaaaa', scale: 0.3, bgColor: 'transparent' },
        );
      }
    },
  };
}

export interface WeatherDisplay3D {
  group: THREE.Group;
  icon: THREE.Sprite;
  label: THREE.Sprite;
  update(weather: string): void;
}

const WEATHER_ICONS: Record<string, string> = {
  sunny: '☀️',
  cloudy: '🌥',
  rainy: '🌧',
  stormy: '⛈',
};

const WEATHER_LABEL_COLORS: Record<string, string> = {
  sunny: '#87ceeb',
  cloudy: '#b0c4de',
  rainy: '#708090',
  stormy: '#2f4f4f',
};

export function createWeatherDisplay3D(position: THREE.Vector3): WeatherDisplay3D {
  const group = new THREE.Group();
  group.position.copy(position);

  const icon = createTextSprite('☀️', { fontSize: 56, scale: 0.5, bgColor: 'transparent' });
  group.add(icon);

  const label = createTextSprite('Sunny', {
    fontSize: 32,
    color: '#87ceeb',
    scale: 0.35,
    bgColor: 'transparent',
  });
  label.position.set(0, -0.35, 0);
  group.add(label);

  let lastWeather = '';

  return {
    group,
    icon,
    label,
    update(weather: string) {
      if (weather === lastWeather) return;
      lastWeather = weather;

      const w = weather as keyof typeof WEATHER_ICONS;
      const iconChar = WEATHER_ICONS[w] || '☀️';
      const weatherName = w.charAt(0).toUpperCase() + w.slice(1);
      const weatherColor = WEATHER_LABEL_COLORS[w] || '#87ceeb';

      updateSpriteTexture(icon, iconChar, { fontSize: 56, scale: 0.5, bgColor: 'transparent' });
      updateSpriteTexture(label, weatherName, {
        fontSize: 32, color: weatherColor, scale: 0.35, bgColor: 'transparent',
      });
    },
  };
}
