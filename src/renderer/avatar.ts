import * as THREE from 'three';

// ── Types ──────────────────────────────────────────────────────────

export interface IAvatar {
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  animations: THREE.AnimationClip[];
  update(delta: number): void;
  dispose(): void;
}

export interface AvatarConfig {
  modelPath: string;
  scale?: number;
  position?: THREE.Vector3;
  skipMaterialFix?: boolean;
}

// ── FBX Loader (lazy) ──────────────────────────────────────────────

let FBXLoaderModule: typeof import('three/examples/jsm/loaders/FBXLoader.js') | null = null;

async function getFBXLoader(): Promise<typeof import('three/examples/jsm/loaders/FBXLoader.js')> {
  if (FBXLoaderModule) return FBXLoaderModule;
  FBXLoaderModule = await import('three/examples/jsm/loaders/FBXLoader.js');
  return FBXLoaderModule;
}

// ── Material Classification ────────────────────────────────────────

function classifyMaterial(
  name: string,
  matName: string,
  hasTexture: boolean
): 'skin' | 'hair' | 'eye' | 'mouth' | 'clothing' | 'default' {
  const n = (name + ' ' + matName).toLowerCase();

  if (n.includes('eye') && !n.includes('brow') && !n.includes('lash')) return 'eye';
  if (n.includes('mouth') || n.includes('lip')) return 'mouth';
  if (n.includes('hair') || n.includes('brow') || n.includes('lash')) return 'hair';
  if (n.includes('face') || n.includes('body') || n.includes('skin') || n.includes('hand')) return 'skin';
  if (n.includes('cloth') || n.includes('shirt') || n.includes('dress') || n.includes('skirt') || n.includes('shoes')) return 'clothing';

  if (hasTexture && (n.includes('00') || n.includes('01'))) {
    if (n.includes('face')) return 'skin';
    if (n.includes('body')) return 'skin';
    if (n.includes('hair')) return 'hair';
  }

  return 'default';
}

// ── Material Enhancement ───────────────────────────────────────────

export function enhanceMaterial(
  mat: THREE.MeshStandardMaterial,
  category: 'skin' | 'hair' | 'eye' | 'mouth' | 'clothing' | 'default'
): THREE.MeshPhysicalMaterial {
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
      p.roughness = Math.min(mat.roughness, 0.5);
      p.metalness = 0.0;
      p.sheen = 0.3;
      p.sheenRoughness = 0.45;
      p.sheenColor = new THREE.Color(0xffe8dd);
      p.clearcoat = 0.1;
      p.clearcoatRoughness = 0.35;
      p.transmission = 0.08;
      p.thickness = 0.5;
      p.ior = 1.4;
      p.attenuationColor = new THREE.Color(0xff8866);
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

// ── Material Fix ───────────────────────────────────────────────────

export function fixMaterial(mat: THREE.Material, meshName: string = ''): THREE.Material {
  const anyMat = mat as any;
  const isStd = (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial;

  let std: THREE.MeshStandardMaterial;

  if (isStd) {
    std = mat.clone() as THREE.MeshStandardMaterial;

    if (std.transparent && std.opacity < 0.1) {
      std.opacity = 0.5;
    }

    if (!std.map) {
      const intensity = std.color.r + std.color.g + std.color.b;
      if (intensity < 0.05) {
        std.color.setHex(0xbbbbbb);
      }
    }

    const emissiveIntensity = (std.emissive?.r ?? 0) + (std.emissive?.g ?? 0) + (std.emissive?.b ?? 0);
    if (emissiveIntensity > 2.5) {
      std.emissive.setHex(0x000000);
    }
  } else {
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

  if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
  if (std.emissiveMap) std.emissiveMap.colorSpace = THREE.SRGBColorSpace;
  if (std.normalMap) std.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
  if (std.roughnessMap) std.roughnessMap.colorSpace = THREE.LinearSRGBColorSpace;
  if (std.metalnessMap) std.metalnessMap.colorSpace = THREE.LinearSRGBColorSpace;
  if (std.alphaMap) std.alphaMap.colorSpace = THREE.LinearSRGBColorSpace;
  if (std.aoMap) std.aoMap.colorSpace = THREE.LinearSRGBColorSpace;

  const category = classifyMaterial(meshName, std.name || '', !!std.map);
  return enhanceMaterial(std, category);
}

// ── Scene Cleanup ──────────────────────────────────────────────────

export function removeEmbeddedLights(group: THREE.Group): void {
  const lights: THREE.Object3D[] = [];
  group.traverse((child) => {
    if ((child as any).isLight) lights.push(child);
  });
  lights.forEach((light) => {
    if (light.parent) light.parent.remove(light);
  });
}

export function removeGroundPlanes(group: THREE.Group): void {
  const toRemove: THREE.Mesh[] = [];

  group.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const nameHint = mesh.name.toLowerCase();
    const geoType = mesh.geometry.type;

    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);

    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const isFlat = size.x < 0.01 || size.y < 0.01 || size.z < 0.01;

    const isBrightBox = materials.some((m) => {
      const c = (m as any).color;
      if (!c) return false;
      const intensity = c.r + c.g + c.b;
      const isBoxLike = geoType.includes('Box') || geoType.includes('Plane') || isFlat;
      return isBoxLike && intensity > 1.8;
    });

    const isNamedGround =
      nameHint.includes('ground') ||
      nameHint.includes('shadow') ||
      nameHint.includes('plane') ||
      nameHint.includes('box') ||
      nameHint.includes('stage') ||
      nameHint.includes('floor') ||
      nameHint.includes('base') ||
      nameHint.includes('platform');

    // Large box/plane positioned at ground level (under avatar's feet)
    // Covers: shadow catchers, ground planes, debug boxes
    const isLargeBoxAtGround =
      (geoType.includes('Box') || geoType.includes('Plane')) &&
      Math.abs(worldPos.y) < 0.05 &&
      (size.x > 0.3 || size.z > 0.3) &&
      size.y < 0.2;

    const hasTexture = materials.some((m) => !!(m as any).map);
    const isBrightUntextured =
      !hasTexture &&
      (geoType.includes('Box') || geoType.includes('Plane') || isFlat) &&
      materials.some((m) => {
        const c = (m as any).color;
        return c && c.r + c.g + c.b > 1.5;
      });

    if (isBrightBox || isNamedGround || isLargeBoxAtGround || isBrightUntextured) {
      toRemove.push(mesh);
    }
  });

  toRemove.forEach((mesh) => {
    if (mesh.parent) mesh.parent.remove(mesh);
  });
}

// ── Placeholder Avatar ─────────────────────────────────────────────

export function createPlaceholderAvatar(): IAvatar {
  const group = new THREE.Group();

  const bodyGeo = new THREE.CapsuleGeometry(0.15, 0.4, 4, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.7 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.35;
  body.castShadow = true;
  group.add(body);

  const headGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffe4c4, roughness: 0.6 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 0.72;
  head.castShadow = true;
  group.add(head);

  const eyeGeo = new THREE.SphereGeometry(0.02, 8, 8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x333333 });

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.04, 0.74, 0.1);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.04, 0.74, 0.1);
  group.add(rightEye);

  return {
    group,
    mixer: null,
    animations: [],
    update() { /* no-op */ },
    dispose() {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m.dispose());
        }
      });
    },
  };
}

// ── FBX Avatar Loading ─────────────────────────────────────────────

/** Internal type for loader injection (testing) */
type LoaderFactory = () => Promise<{ FBXLoader: typeof import('three/examples/jsm/loaders/FBXLoader.js').FBXLoader }>;

export async function loadAvatar(
  config: AvatarConfig,
  loaderFactory?: LoaderFactory
): Promise<IAvatar> {
  const mod = loaderFactory ? await loaderFactory() : await getFBXLoader();
  const loader = new mod.FBXLoader();

  const object = await new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      config.modelPath,
      (obj) => resolve(obj),
      undefined,
      (err) => reject(err)
    );
  });

  const scale = config.scale ?? 0.01;
  object.scale.set(scale, scale, scale);

  if (config.position) {
    object.position.copy(config.position);
  } else {
    object.position.set(0, 0, 0);
  }

  let mixer: THREE.AnimationMixer | null = null;
  const animations: THREE.AnimationClip[] = [];

  if (object.animations && object.animations.length > 0) {
    mixer = new THREE.AnimationMixer(object);
    animations.push(...object.animations);
  }

  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // DEBUG: Log original material before any modification
      const origMat = mesh.material;
      const mats = Array.isArray(origMat) ? origMat : [origMat];
      mats.forEach((m, i) => {
        if (m) {
          const c = (m as any).color;
          console.log(`[Avatar DEBUG] ${mesh.name} mat${i}: type=${m.type} color=${c ? '#' + c.getHexString() : 'N/A'} roughness=${(m as any).roughness} metalness=${(m as any).metalness}`);
        }
      });

      if (!config.skipMaterialFix) {
        const mat = mesh.material;
        if (Array.isArray(mat)) {
          mesh.material = mat.map((m) => fixMaterial(m, mesh.name));
        } else if (mat) {
          mesh.material = fixMaterial(mat, mesh.name);
        }
      }

      // DEBUG: Log fixed material
      const fixedMat = mesh.material;
      const fixedMats = Array.isArray(fixedMat) ? fixedMat : [fixedMat];
      fixedMats.forEach((m, i) => {
        if (m) {
          const c = (m as any).color;
          console.log(`[Avatar DEBUG] ${mesh.name} mat${i} FIXED: type=${m.type} color=${c ? '#' + c.getHexString() : 'N/A'}`);
        }
      });
    }
  });

  removeEmbeddedLights(object);
  removeGroundPlanes(object);

  return {
    group: object,
    mixer,
    animations,
    update(delta: number) {
      if (mixer) mixer.update(delta);
    },
    dispose() {
      if (mixer) mixer.stopAllAction();
      object.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m.dispose());
        }
      });
    },
  };
}
