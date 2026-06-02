import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AnimationTrigger, AnimationClipData, AnimationManifest } from './types.js';

let gltfLoader: GLTFLoader | null = null;

function getGLTFLoader(): GLTFLoader {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
  }
  return gltfLoader;
}

const TRIGGER_KEYS: AnimationTrigger[] = [
  'idle', 'drag', 'throw', 'land', 'dizzy',
  'eat', 'sleep', 'happy', 'sad', 'angry',
];

export async function loadAnimationManifest(manifestPath: string): Promise<AnimationManifest> {
  const response = await fetch(manifestPath);
  if (!response.ok) {
    throw new Error(`Failed to load animation manifest: ${response.statusText}`);
  }
  const manifest: AnimationManifest = await response.json();

  for (const key of TRIGGER_KEYS) {
    if (!manifest[key]) {
      console.warn(`[animation-loader] Missing entry in manifest for "${key}"`);
    }
  }

  return manifest;
}

function manifestEntryToClipData(
  trigger: AnimationTrigger,
  entry: { file: string; loop: boolean; priority: number; blendIn: number; blendOut?: number },
  clip: THREE.AnimationClip,
): AnimationClipData {
  return {
    trigger,
    clip,
    loop: entry.loop,
    priority: entry.priority,
    blendIn: entry.blendIn,
    blendOut: entry.blendOut ?? entry.blendIn,
  };
}

export async function loadAnimationClips(
  manifest: AnimationManifest,
  basePath: string,
): Promise<AnimationClipData[]> {
  const loader = getGLTFLoader();
  const results: AnimationClipData[] = [];

  for (const [triggerStr, entry] of Object.entries(manifest)) {
    const trigger = triggerStr as AnimationTrigger;
    if (!TRIGGER_KEYS.includes(trigger)) {
      console.warn(`[animation-loader] Unknown trigger "${trigger}" in manifest, skipping`);
      continue;
    }

    const filePath = `${basePath}/${entry.file}`;
    try {
      const gltf = await loader.loadAsync(filePath);
      if (!gltf.animations || gltf.animations.length === 0) {
        console.warn(`[animation-loader] No animations found in "${filePath}", using procedural fallback for "${trigger}"`);
        continue;
      }

      const clip = gltf.animations[0]!;
      const clipData = manifestEntryToClipData(trigger, entry, clip);
      results.push(clipData);
    } catch (err) {
      console.warn(`[animation-loader] Failed to load animation "${filePath}": ${err}, using procedural fallback for "${trigger}"`);
    }
  }

  return results;
}
