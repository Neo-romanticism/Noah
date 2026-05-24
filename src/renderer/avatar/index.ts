import * as THREE from 'three';

// FBXLoader is dynamically imported to avoid bundling issues
// when no avatar model is present yet.
let FBXLoaderModule: typeof import('three/examples/jsm/loaders/FBXLoader.js') | null = null;

export interface AvatarConfig {
  modelPath: string;
  scale?: number;
  position?: THREE.Vector3;
}

export interface LoadedAvatar {
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  animations: THREE.AnimationClip[];
}

/**
 * Dynamically loads the FBXLoader module.
 * This avoids hard dependency issues during build when the loader
 * may not be immediately available.
 */
async function getFBXLoader(): Promise<typeof import('three/examples/jsm/loaders/FBXLoader.js')> {
  if (FBXLoaderModule) return FBXLoaderModule;
  FBXLoaderModule = await import('three/examples/jsm/loaders/FBXLoader.js');
  return FBXLoaderModule;
}

/**
 * Load an FBX avatar model into the scene.
 *
 * @param scene - The Three.js scene to add the avatar to
 * @param config - Avatar configuration (path, scale, position)
 * @returns Promise resolving to LoadedAvatar or null if loading fails
 */
export async function loadAvatar(
  scene: THREE.Scene,
  config: AvatarConfig
): Promise<LoadedAvatar | null> {
  try {
    const mod = await getFBXLoader();
    const loader = new mod.FBXLoader();

    const object = await new Promise<THREE.Group>((resolve, reject) => {
      loader.load(
        config.modelPath,
        (obj) => resolve(obj),
        undefined,
        (err) => reject(err)
      );
    });

    // Apply scale
    const scale = config.scale ?? 0.01;
    object.scale.set(scale, scale, scale);

    // Apply position
    if (config.position) {
      object.position.copy(config.position);
    } else {
      object.position.set(0, -0.5, 0);
    }

    // Set up animation mixer
    let mixer: THREE.AnimationMixer | null = null;
    const animations: THREE.AnimationClip[] = [];

    if (object.animations && object.animations.length > 0) {
      mixer = new THREE.AnimationMixer(object);
      animations.push(...object.animations);
    }

    // Enable shadows on all meshes
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    scene.add(object);

    return {
      group: object,
      mixer,
      animations,
    };
  } catch (err) {
    console.warn('Failed to load FBX avatar:', err);
    return null;
  }
}

/**
 * Create a placeholder avatar (colored capsule) when no FBX model is available.
 * This ensures Noah is visible even without an avatar asset.
 */
export function createPlaceholderAvatar(scene: THREE.Scene): LoadedAvatar {
  const group = new THREE.Group();

  // Body (capsule-like using cylinder + spheres)
  const bodyGeo = new THREE.CapsuleGeometry(0.15, 0.4, 4, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.7 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.35;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffe4c4, roughness: 0.6 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 0.72;
  head.castShadow = true;
  group.add(head);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.02, 8, 8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x333333 });

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.04, 0.74, 0.1);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.04, 0.74, 0.1);
  group.add(rightEye);

  // Position the whole avatar
  group.position.set(0, -0.5, 0);
  scene.add(group);

  return {
    group,
    mixer: null,
    animations: [],
  };
}

/**
 * Update avatar animations. Call this every frame.
 */
export function updateAvatar(avatar: LoadedAvatar, deltaTime: number): void {
  if (avatar.mixer) {
    avatar.mixer.update(deltaTime);
  }
}
