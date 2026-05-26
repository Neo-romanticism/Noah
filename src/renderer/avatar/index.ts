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
  try {
    console.log('[Avatar] Dynamically importing FBXLoader...');
    FBXLoaderModule = await import('three/examples/jsm/loaders/FBXLoader.js');
    console.log('[Avatar] FBXLoader module loaded:', !!FBXLoaderModule);
    return FBXLoaderModule;
  } catch (err) {
    console.error('[Avatar] Failed to import FBXLoader module:', err);
    throw err;
  }
}

/**
 * Classify a mesh/material into a body part category based on name and texture.
 * This is used to apply physically-based material presets that look natural.
 */
function classifyMaterial(name: string, matName: string, hasTexture: boolean): 'skin' | 'hair' | 'eye' | 'mouth' | 'clothing' | 'default' {
  const n = (name + ' ' + matName).toLowerCase();

  if (n.includes('eye') && !n.includes('brow') && !n.includes('lash')) return 'eye';
  if (n.includes('mouth') || n.includes('lip')) return 'mouth';
  if (n.includes('hair') || n.includes('brow') || n.includes('lash')) return 'hair';
  if (n.includes('face') || n.includes('body') || n.includes('skin') || n.includes('hand')) return 'skin';
  if (n.includes('cloth') || n.includes('shirt') || n.includes('dress') || n.includes('skirt') || n.includes('shoes')) return 'clothing';

  // Fallback: skin-colored textures without explicit category
  if (hasTexture && (n.includes('00') || n.includes('01'))) {
    // VRoid-style naming: N00_000_00_Face, N00_001_01_Body_00, etc.
    if (n.includes('face')) return 'skin';
    if (n.includes('body')) return 'skin';
    if (n.includes('hair')) return 'hair';
  }

  return 'default';
}

/**
 * Convert a MeshStandardMaterial to MeshPhysicalMaterial with part-specific
 * presets for natural anime-style rendering.
 *
 * Uses only built-in Three.js materials — no custom shaders.
 *
 * Key improvements:
 * - Skin: transmission + thickness for subsurface scattering feel,
 *         sheen for softness, clearcoat for moisture
 * - Hair: sheen + clearcoat for silky highlight
 * - Eyes: clearcoat for wet look
 * - Clothing: sheen for fabric feel
 */
function enhanceMaterial(
  mat: THREE.MeshStandardMaterial,
  category: 'skin' | 'hair' | 'eye' | 'mouth' | 'clothing' | 'default'
): THREE.Material {
  const p: THREE.MeshPhysicalMaterialParameters = {
    color: mat.color.clone(),
    map: mat.map,
    normalMap: mat.normalMap,
    normalScale: mat.normalScale,
    emissive: mat.emissive.clone(),
    emissiveMap: mat.emissiveMap,
    emissiveIntensity: mat.emissiveIntensity,
    alphaMap: mat.alphaMap,
    alphaTest: mat.alphaTest,
    transparent: mat.transparent,
    opacity: mat.opacity,
    side: mat.side,
    forceSinglePass: mat.forceSinglePass,
    vertexColors: mat.vertexColors,
    envMap: mat.envMap,
    envMapIntensity: mat.envMapIntensity,
  };

  switch (category) {
    case 'skin': {
      // Living skin: use transmission + thickness for SSS-like softness
      // WITHOUT making it actually transparent/glassy.
      // Low transmission + ior ~ 1.4 (skin-like) gives a subtle glow.
      p.roughness = Math.min(mat.roughness, 0.5);
      p.metalness = 0.0;
      p.sheen = 0.3;
      p.sheenRoughness = 0.45;
      p.sheenColor = new THREE.Color(0xffe8dd);
      p.clearcoat = 0.1;
      p.clearcoatRoughness = 0.35;
      // Subsurface scattering via transmission (conservative values)
      p.transmission = 0.08; // very subtle — just enough for softness
      p.thickness = 0.5;     // thin surface
      p.ior = 1.4;           // skin-like index of refraction
      p.attenuationColor = new THREE.Color(0xff8866); // warm subsurface tint
      p.attenuationDistance = 1.0;
      break;
    }

    case 'hair': {
      p.roughness = Math.min(mat.roughness, 0.35);
      p.metalness = Math.min(mat.metalness, 0.05);
      p.sheen = 0.6;
      p.sheenRoughness = 0.35;
      p.sheenColor = new THREE.Color(0xffffff);
      p.clearcoat = 0.15;
      p.clearcoatRoughness = 0.2;
      break;
    }

    case 'eye': {
      p.roughness = 0.05;
      p.metalness = 0.0;
      p.clearcoat = 1.0;
      p.clearcoatRoughness = 0.05;
      p.sheen = 0.0;
      break;
    }

    case 'mouth': {
      p.roughness = Math.min(mat.roughness, 0.3);
      p.metalness = 0.0;
      p.clearcoat = 0.25;
      p.clearcoatRoughness = 0.15;
      p.sheen = 0.15;
      p.sheenRoughness = 0.4;
      p.sheenColor = new THREE.Color(0xffcccc);
      break;
    }

    case 'clothing': {
      p.roughness = Math.max(mat.roughness, 0.6);
      p.metalness = Math.min(mat.metalness, 0.05);
      p.sheen = 0.15;
      p.sheenRoughness = 0.6;
      p.sheenColor = new THREE.Color(0xffffff);
      p.clearcoat = 0.0;
      break;
    }

    default: {
      p.roughness = mat.roughness;
      p.metalness = mat.metalness;
      break;
    }
  }

  const phys = new THREE.MeshPhysicalMaterial(p);

  if (mat.map) phys.map!.colorSpace = mat.map.colorSpace;
  if (mat.normalMap) phys.normalMap!.colorSpace = mat.normalMap.colorSpace;
  if (mat.emissiveMap) phys.emissiveMap!.colorSpace = mat.emissiveMap.colorSpace;
  if (mat.alphaMap) phys.alphaMap!.colorSpace = mat.alphaMap.colorSpace;

  return phys;
}

/**
 * Fix potentially broken FBX materials so the avatar doesn't render black or blowout.
 *
 * Strategy:
 * 1. Preserve original properties as much as possible
 * 2. Only fix extreme values (invisible, pure black, whiteout)
 * 3. Convert to MeshPhysicalMaterial with part-specific presets for natural look
 */
export function fixMaterial(
  mat: THREE.Material,
  meshName: string = ''
): THREE.Material {
  const anyMat = mat as any;
  const isStd = (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial;

  // Step 1: normalize to a clean MeshStandardMaterial
  let std: THREE.MeshStandardMaterial;

  if (isStd) {
    std = mat.clone() as THREE.MeshStandardMaterial;

    // Prevent invisible materials
    if (std.transparent && std.opacity < 0.1) {
      std.opacity = 0.5;
    }

    // Prevent completely black diffuse (only when no texture)
    if (!std.map) {
      const intensity = std.color.r + std.color.g + std.color.b;
      if (intensity < 0.05) {
        std.color.setHex(0xbbbbbb);
      }
    }

    // Prevent whiteout from extreme emissive
    const emissiveIntensity =
      (std.emissive?.r ?? 0) + (std.emissive?.g ?? 0) + (std.emissive?.b ?? 0);
    if (emissiveIntensity > 2.5) {
      std.emissive.setHex(0x000000);
    }
  } else {
    // Convert non-standard materials
    const color = anyMat.color ? anyMat.color.clone() : new THREE.Color(0xffffff);
    const map = anyMat.map || null;
    const normalMap = anyMat.normalMap || null;
    const emissiveMap = anyMat.emissiveMap || null;
    const emissive = anyMat.emissive ? anyMat.emissive.clone() : new THREE.Color(0x000000);

    std = new THREE.MeshStandardMaterial({
      color,
      map,
      normalMap,
      emissiveMap,
      emissive,
      roughness: anyMat.roughness ?? 0.7,
      metalness: anyMat.metalness ?? 0.0,
      transparent: mat.transparent,
      opacity: mat.opacity ?? 1.0,
      side: THREE.DoubleSide,
      forceSinglePass: true,
      vertexColors: anyMat.vertexColors ?? false,
    });

    if (std.transparent && std.opacity < 0.1) std.opacity = 0.5;
  }

  // Step 2: ensure correct color spaces
  if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
  if (std.emissiveMap) std.emissiveMap.colorSpace = THREE.SRGBColorSpace;
  if (std.normalMap) std.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
  if (std.roughnessMap) std.roughnessMap.colorSpace = THREE.LinearSRGBColorSpace;
  if (std.metalnessMap) std.metalnessMap.colorSpace = THREE.LinearSRGBColorSpace;
  if (std.alphaMap) std.alphaMap.colorSpace = THREE.LinearSRGBColorSpace;
  if (std.aoMap) std.aoMap.colorSpace = THREE.LinearSRGBColorSpace;

  // Step 3: classify and enhance with part-specific material
  const category = classifyMaterial(meshName, std.name || '', !!std.map);
  return enhanceMaterial(std, category);
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
    // Default 0.01 assumes cm→m conversion (FBX UnitScaleFactor=100).
    // Caller should pass an explicit scale; 0.3 is the current empirical
    // sweet spot for this model (see renderer/index.ts avatar init).
    const scale = config.scale ?? 0.01;
    object.scale.set(scale, scale, scale);

    // Apply position
    if (config.position) {
      object.position.copy(config.position);
    } else {
      object.position.set(0, 0, 0);
    }

    // Set up animation mixer
    let mixer: THREE.AnimationMixer | null = null;
    const animations: THREE.AnimationClip[] = [];

    if (object.animations && object.animations.length > 0) {
      mixer = new THREE.AnimationMixer(object);
      animations.push(...object.animations);
    }

    // Enable shadows on all meshes, fix material colors, and remove any embedded lights
    const lightsToRemove: THREE.Object3D[] = [];
    const meshesToRemove: THREE.Mesh[] = [];

    object.traverse((child) => {
      if ((child as any).isLight) {
        // Collect embedded lights from the model to prevent overexposure
        lightsToRemove.push(child);
        return;
      }

      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // FBX loaded materials sometimes have incorrect color space or
        // zero/invalid color values, making the mesh appear black.
        // fixMaterial preserves original properties, fixes extreme cases,
        // and enhances with part-specific MeshPhysicalMaterial presets.
        const mat = mesh.material;
        if (Array.isArray(mat)) {
          mesh.material = mat.map((m) => fixMaterial(m, mesh.name));
        } else if (mat) {
          mesh.material = fixMaterial(mat, mesh.name);
        }

        // Detect and mark unwanted ground/shadow planes for removal.
        // VRM→FBX conversions often embed hidden ground planes or shadow
        // catchers that appear as bright boxes under the avatar's feet.
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const nameHint = mesh.name.toLowerCase();
        const geoType = mesh.geometry.type;

        // Compute world position for position-based filtering
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);

        // Compute bounding box size for size-based filtering
        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        // Check if geometry is flat (very thin in one dimension)
        const isFlat =
          size.x < 0.01 || size.y < 0.01 || size.z < 0.01;

        // Condition 1: bright (near-white) box/plane/flat geometry
        // NOTE: FBXLoader may load all geometry as BufferGeometry, so we
        // also check for flat geometry as a proxy for planes.
        const isBrightBox = materials.some((m) => {
          const c = (m as any).color;
          if (!c) return false;
          const intensity = c.r + c.g + c.b;
          const isBoxLike = geoType.includes('Box') || geoType.includes('Plane') || isFlat;
          return isBoxLike && intensity > 1.8;
        });

        // Condition 2: name hints at ground/shadow/box geometry
        const isNamedGround =
          nameHint.includes('ground') ||
          nameHint.includes('shadow') ||
          nameHint.includes('plane') ||
          nameHint.includes('box') ||
          nameHint.includes('stage') ||
          nameHint.includes('floor') ||
          nameHint.includes('base') ||
          nameHint.includes('platform');

        // Condition 3: large flat mesh positioned near y≈0 (world space)
        // These are typically shadow-catching planes embedded in the model.
        const isLargeFlatNearGround =
          (geoType.includes('Box') || geoType.includes('Plane') || isFlat) &&
          Math.abs(worldPos.y) < 0.05;

        // Condition 4: no texture AND bright color AND box/plane/flat
        // Unwanted debug geometry often has no texture.
        const hasTexture = materials.some((m) => !!(m as any).map);
        const isBrightUntextured =
          !hasTexture &&
          (geoType.includes('Box') || geoType.includes('Plane') || isFlat) &&
          materials.some((m) => {
            const c = (m as any).color;
            return c && c.r + c.g + c.b > 1.5;
          });

        if (isBrightBox || isNamedGround || isLargeFlatNearGround || isBrightUntextured) {
          console.log(
            `[Avatar] Marking mesh for removal: "${mesh.name}" ` +
            `geo=${geoType} pos=(${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)}) ` +
            `size=(${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)}) ` +
            `reason=${isBrightBox ? 'brightBox ' : ''}${isNamedGround ? 'namedGround ' : ''}${isLargeFlatNearGround ? 'largeFlat ' : ''}${isBrightUntextured ? 'brightUntextured' : ''}`
          );
          meshesToRemove.push(mesh);
        }

        // Log material info for debugging
        materials.forEach((m, i) => {
          const phys = m as THREE.MeshPhysicalMaterial;
          console.log(
            `[Avatar] ${mesh.name} mat${i}: ` +
            `type=${phys.isMeshPhysicalMaterial ? 'physical' : 'standard'} ` +
            `color=#${phys.color.getHexString()} ` +
            `roughness=${phys.roughness.toFixed(2)} ` +
            `metalness=${phys.metalness.toFixed(2)} ` +
            `sheen=${phys.sheen?.toFixed(2) ?? '-'} ` +
            `clearcoat=${phys.clearcoat?.toFixed(2) ?? '-'} ` +
            `transmission=${phys.transmission?.toFixed(2) ?? '-'} ` +
            `map=${phys.map ? 'Y' : 'N'}`
          );
        });
      }
    });

    // Remove collected lights
    lightsToRemove.forEach((light) => {
      if (light.parent) {
        light.parent.remove(light);
      }
    });

    // Remove unwanted bright box/plane meshes
    meshesToRemove.forEach((mesh) => {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
    });

    scene.add(object);

    return {
      group: object,
      mixer,
      animations,
    };
  } catch (err) {
    console.error('[Avatar] Failed to load FBX avatar:', err);
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
  group.position.set(0, 0, 0);
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
