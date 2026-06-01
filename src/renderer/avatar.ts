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

// ── Fallback Colors ────────────────────────────────────────────────

const FALLBACK_COLORS: Record<string, number> = {
  skin: 0xffe4c4,      // bisque/peach skin
  hair: 0x4a3728,      // dark brown
  eye:  0xf0f0f0,      // white sclera
  mouth: 0xcc6666,     // pinkish red
  clothing: 0x88aacc,  // soft blue
  default: 0xbbbbbb,   // light gray
};

/** Generate a plausible color for a material category when texture data is unavailable. */
export function getFallbackColor(category: string): THREE.Color {
  const hex = FALLBACK_COLORS[category] ?? FALLBACK_COLORS.default;
  return new THREE.Color(hex);
}

// ── Texture Validation ─────────────────────────────────────────────

/**
 * Check whether a Three.js `Texture` actually has usable image data.
 *
 * FBXLoader may create a placeholder `Texture` when the embedded image
 * reference is missing or invalid. Such a texture has no underlying image
 * (or an incomplete one), causing the GPU to sample black → avatar appears
 * black even though the material color is white.
 */
export function isTextureValid(texture: THREE.Texture | null | undefined): boolean {
  if (!texture) return false;
  const img = texture.image as any;
  if (!img) return false;

  // HTMLImageElement
  if (typeof img.complete === 'boolean') {
    // Still loading (complete === false) → optimistically treat as valid.
    // FBXLoader creates textures from blob URLs for embedded images, and
    // the Image `load` event fires asynchronously. By the time fixMaterial
    // runs, the image may not have finished loading yet.
    if (!img.complete) return true;
    // Loaded but no dimensions → failed to decode
    if (typeof img.naturalWidth === 'number' && img.naturalWidth === 0) return false;
  }

  // ImageBitmap / HTMLCanvasElement / OffscreenCanvas
  if (typeof img.width === 'number' && typeof img.height === 'number') {
    return img.width > 0 && img.height > 0;
  }

  // Has some form of image-like object we can't inspect → assume valid
  return true;
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
      p.sheen = 0.0;
      p.clearcoat = 0.0;
      p.envMapIntensity = 0.15;
      break;
    }
    case 'hair': {
      p.roughness = Math.min(mat.roughness, 0.35);
      p.metalness = Math.min(mat.metalness, 0.05);
      p.sheen = 0.25;
      p.sheenRoughness = 0.4;
      p.sheenColor = new THREE.Color(0xffffff);
      p.clearcoat = 0.08;
      p.clearcoatRoughness = 0.25;
      p.envMapIntensity = 0.4;
      break;
    }
    case 'eye': {
      p.roughness = 0.05;
      p.metalness = 0.0;
      p.clearcoat = 0.4;
      p.clearcoatRoughness = 0.05;
      p.sheen = 0.0;
      p.envMapIntensity = 0.6;
      break;
    }
    case 'mouth': {
      p.roughness = Math.min(mat.roughness, 0.3);
      p.metalness = 0.0;
      p.clearcoat = 0.1;
      p.clearcoatRoughness = 0.15;
      p.sheen = 0.0;
      p.envMapIntensity = 0.25;
      break;
    }
    case 'clothing': {
      p.roughness = Math.max(mat.roughness, 0.6);
      p.metalness = Math.min(mat.metalness, 0.05);
      p.sheen = 0.0;
      p.clearcoat = 0.0;
      p.envMapIntensity = 0.2;
      break;
    }
    default: {
      p.roughness = mat.roughness;
      p.metalness = mat.metalness;
      p.envMapIntensity = 0.3;
      break;
    }
  }

  // Safety net: if the resulting color is still fully white (intensity ~3.0)
  // and there's no valid texture, the FBX material relied entirely on a
  // texture that didn't load. Fall back to a classification-based color.
  const col = p.color as THREE.Color;
  const colorIntensity = col.r + col.g + col.b;
  if (colorIntensity > 2.99 && !isTextureValid(p.map ?? null)) {
    const fallback = getFallbackColor(category);
    col.copy(fallback);
    console.warn(
      `[Avatar] enhanceMaterial: white color without valid texture, ` +
      `fallback to #${fallback.getHexString()} (${category})`
    );
  }

  const phys = new THREE.MeshPhysicalMaterial(p);

  // Carry over userData (fixMaterial may store texture reload info here)
  phys.userData = { ...mat.userData };

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

    // Texture 유무와 관계없이 color intensity 체크 (검정색 렌더링 방지)
    const intensity = std.color.r + std.color.g + std.color.b;
    if (intensity < 0.05) {
      std.color.setHex(0xbbbbbb);
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

  // ── Texture validation & fallback ──────────────────────────────
  // FBXLoader often creates placeholder or unresolved textures when
  // the FBX file's embedded image data is missing or the external
  // texture file can't be resolved. In that case the Texture object
  // exists but has no pixel data → the GPU samples black → avatar
  // appears black even though the material color is white (#ffffff).
  //
  // Detect this by checking the texture's image. When the texture is
  // invalid, store its info on userData (so reloadFailedTextures can
  // find it later), remove the map to avoid black GPU sampling, and
  // assign a fallback color based on the material's category.

  // ── Albedo (baseColor) texture validation ──────────────────────
  if (std.map && !isTextureValid(std.map)) {
    const category = classifyMaterial(meshName, std.name || '', false);

    // Store texture identity before removing it
    const texName = std.map.name || '';
    const imgSrc = ((std.map.image as any)?.src as string) || '';
    std.userData = std.userData || {};
    std.userData._fbxTextureName = texName;
    std.userData._fbxTextureSrc = imgSrc;
    console.warn(
      `[Avatar] ${meshName}: albedo INVALID (name="${texName}" src="${imgSrc}"), ` +
      `storing for async reload, fallback to #${getFallbackColor(category).getHexString()} (${category})`
    );

    std.map = null;
    std.color.copy(getFallbackColor(category));
  }

  // ── Normal map validation ──────────────────────────────────────
  // FBXLoader may also create placeholder normal maps. Remove them so
  // reloadFailedTextures() can load the correct ones from VRM mapping.
  if (std.normalMap && !isTextureValid(std.normalMap)) {
    const texName = std.normalMap.name || '';
    console.warn(`[Avatar] ${meshName}: normalMap INVALID (name="${texName}"), will reload`);
    std.normalMap = null;
    std.userData = std.userData || {};
    std.userData._fbxNormalMapInvalid = true;
  }

  // ── Color space correction ─────────────────────────────────────
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

// ── Direct Texture Loading ─────────────────────────────────────────

/**
 * Load a texture file using `Image` directly (no crossOrigin).
 *
 * Three.js's built-in `TextureLoader` defaults to `crossOrigin = 'anonymous'`,
 * which breaks image loading from `file://` URLs in Electron (file:// origins
 * don't support CORS). By creating an HTMLImageElement ourselves and NOT
 * setting crossOrigin, the browser happily loads local images for WebGL
 * rendering (only canvas readback would be blocked, which we don't need).
 */
async function loadTextureDirect(path: string): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;

    const onLoad = () => {
      if (settled) return;
      settled = true;
      const texture = new THREE.Texture(img);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      resolve(texture);
    };

    const onError = () => {
      if (settled) return;
      settled = true;
      console.warn(`[Avatar] Failed to load image: ${path}`);
      resolve(null);
    };

    img.onload = onLoad;
    img.onerror = onError;
    img.src = path;

    // Safety timeout: if neither onload nor onerror fires (e.g. in test
    // environments where Image loading is stubbed), resolve with null.
    setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn(`[Avatar] Texture load timeout: ${path}`);
        resolve(null);
      }
    }, 100);
  });
}

/**
 * VRM-derived texture mapping for the Noah avatar.
 *
 * The FBX file (exported from VRM) has 3 meshes — "Face", "Body", "Hair" —
 * each with multiple primitives (multi-material). The VRM JSON tells us
 * exactly which texture file each primitive should use.
 *
 * FBXLoader creates placeholder textures because the FBX's texture-to-Video
 * connections aren't parsed correctly. We bypass this by loading textures
 * directly using the known VRM mapping.
 */
interface TextureSlot {
  albedo: string;        // baseColor texture filename
  normal?: string;       // normal texture filename (optional)
}

const VRM_TEXTURE_MAP: Record<string, TextureSlot[]> = {
  'Face': [
    { albedo: '_01.png', normal: 'Shader_NoneNormal.png' },  // FaceMouth
    { albedo: '_02.png', normal: 'Shader_NoneNormal.png' },  // EyeIris
    { albedo: '_03.png', normal: 'Shader_NoneNormal.png' },  // EyeHighlight
    { albedo: '_04.png', normal: '_05.png' },                 // Face_SKIN
    { albedo: '_06.png', normal: 'Shader_NoneNormal.png' },  // EyeWhite
    { albedo: '_07.png', normal: 'Shader_NoneNormal.png' },  // FaceBrow
    { albedo: '_08.png', normal: 'Shader_NoneNormal.png' },  // FaceEyelash
    { albedo: '_09.png', normal: 'Shader_NoneNormal.png' },  // FaceEyeline
  ],
  'Body': [
    { albedo: '_10.png', normal: '_11.png' },                        // Body_SKIN
    { albedo: '_12.png', normal: 'N00_000_00_HairBack_00_nml.png' }, // HairBack
    { albedo: '_13.png', normal: 'Shader_NoneNormal.png' },          // Bottoms
    { albedo: '_14.png', normal: 'Shader_NoneNormal.png' },          // Tops
    { albedo: '_15.png', normal: 'Shader_NoneNormal.png' },          // Shoes_01
    { albedo: '_16.png', normal: 'Shader_NoneNormal.png' },          // Shoes_02
    { albedo: '_17.png', normal: 'Shader_NoneNormal.png' },          // Onepiece
  ],
  'Hair': [
    { albedo: '_18.png', normal: 'N00_000_Hair_00_nml_01.png' },    // Hair
  ],
};

/**
 * Resolve the mesh base-name used for texture lookup.
 * FBX meshes may be nested under groups, so we strip suffixes like "001".
 */
function resolveMeshBaseName(mesh: THREE.Mesh): string {
  const raw = mesh.name || '';
  // Remove trailing digits like "001" (e.g., "Hair001" → "Hair")
  const base = raw.replace(/\d+$/, '');
  // Try exact match first, then base match
  if (VRM_TEXTURE_MAP[raw]) return raw;
  if (VRM_TEXTURE_MAP[base]) return base;
  // Fallback: search case-insensitively
  for (const key of Object.keys(VRM_TEXTURE_MAP)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) return key;
  }
  return raw;
}

/**
 * Reload textures using the VRM-derived mapping.
 *
 * The FBXLoader creates placeholder textures with name="base_color_texture"
 * and no image data. This function looks up the correct texture filenames
 * from VRM_TEXTURE_MAP based on the mesh name and primitive index, loads
 * them via Image (no crossOrigin), and applies them to the material.
 */
async function reloadFailedTextures(mesh: THREE.Mesh): Promise<void> {
  const baseName = resolveMeshBaseName(mesh);
  const slots = VRM_TEXTURE_MAP[baseName];
  if (!slots) {
    console.warn(`[Avatar] No VRM texture mapping for "${mesh.name}" (base="${baseName}")`);
    return;
  }

  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

  for (let i = 0; i < materials.length; i++) {
    const mat = materials[i] as any;
    if (!mat) continue;

    // Skip if this material already has a valid texture
    if (mat.map && isTextureValid(mat.map)) continue;

    const slot = slots[i];
    if (!slot) {
      console.warn(`[Avatar] ${mesh.name}[${i}]: no VRM texture slot defined`);
      continue;
    }

    // Load albedo (baseColor) texture
    const albedoPath = `./textures/${slot.albedo}`;
    console.log(`[Avatar] Loading texture: ${albedoPath} (for ${mesh.name}[${i}])`);
    const newTex = await loadTextureDirect(albedoPath);
    if (newTex) {
      mat.map = newTex;
      mat.color.setHex(0xffffff);
      mat.needsUpdate = true;
      console.log(`[Avatar] Texture OK: ${albedoPath} → ${mesh.name}[${i}]`);
    } else {
      console.warn(`[Avatar] Failed to load: ${albedoPath} — keeping fallback`);
      continue;
    }

    // Load normal map if available
    if (slot.normal) {
      const normalPath = `./textures/${slot.normal}`;
      console.log(`[Avatar] Loading normal: ${normalPath} (for ${mesh.name}[${i}])`);
      const normalTex = await loadTextureDirect(normalPath);
      if (normalTex) {
        normalTex.colorSpace = THREE.LinearSRGBColorSpace;
        mat.normalMap = normalTex;
        // VRM normal maps use OpenGL convention (Y+ up). Three.js defaults
        // to Y+ up, but some VRM exporters flip Y. Start with (1, 1) and
        // allow override via userData if needed.
        mat.normalScale = new THREE.Vector2(1, 1);
        mat.needsUpdate = true;
        console.log(`[Avatar] Normal OK: ${normalPath} → ${mesh.name}[${i}]`);
      } else {
        console.warn(`[Avatar] Failed to load normal: ${normalPath}`);
      }
    }
  }
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

  // ── Material setup (synchronous) ──────────────────────────────────
  const meshesWithTextures: THREE.Mesh[] = [];

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
          const map = (m as any).map;
          console.log(`[Avatar DEBUG] ${mesh.name} mat${i}:`);
          console.log(`  type=${m.type}`);
          console.log(`  color=${c ? '#' + c.getHexString() : 'N/A'}`);
          console.log(`  intensity=${c ? (c.r + c.g + c.b).toFixed(4) : 'N/A'}`);
          console.log(`  map=${map ? (map.name || 'loaded') : 'none'}`);
          console.log(`  roughness=${(m as any).roughness} metalness=${(m as any).metalness}`);
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

      // Track meshes that have a VRM texture mapping for async reload
      const fixedMat = mesh.material;
      const fixedMats = Array.isArray(fixedMat) ? fixedMat : [fixedMat];
      let hasVrmSlot = false;
      const baseName = resolveMeshBaseName(mesh);
      fixedMats.forEach((m, i) => {
        if (m) {
          const c = (m as any).color;
          const slot = VRM_TEXTURE_MAP[baseName]?.[i];
          console.log(`[Avatar DEBUG] ${mesh.name} mat${i} FIXED: type=${m.type} color=${c ? '#' + c.getHexString() : 'N/A'} intensity=${c ? (c.r + c.g + c.b).toFixed(4) : 'N/A'} vrm=${slot ? slot.albedo : 'none'}`);
          if (slot) hasVrmSlot = true;
        }
      });
      if (hasVrmSlot) meshesWithTextures.push(mesh);
    }
  });

  removeEmbeddedLights(object);
  removeGroundPlanes(object);

  // ── Async texture reload ─────────────────────────────────────────
  // FBXLoader's internal TextureLoader fails to load textures from
  // file:// URLs due to crossOrigin='anonymous'. Reload them manually.
  if (meshesWithTextures.length > 0) {
    console.log(`[Avatar] Reloading ${meshesWithTextures.length} meshes with invalid textures...`);
    await Promise.all(meshesWithTextures.map((mesh) => reloadFailedTextures(mesh)));
  }

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
