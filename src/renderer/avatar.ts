import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { AnimationController } from './animation/types.js';
import { createAnimationController } from './animation/controller.js';
import { createPlaceholderAnimController, type PlaceholderParts } from './animation/placeholder.js';

// ── Types ──────────────────────────────────────────────────────────

export interface IAvatar {
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  animations: THREE.AnimationClip[];
  animationController: AnimationController;
  vrm?: any;
  update(delta: number): void;
  dispose(): void;
}

export interface AvatarConfig {
  modelPath: string;
  scale?: number;
  position?: THREE.Vector3;
  skipMaterialFix?: boolean;
}

// ── GLTF/VRM Loader (singleton) ────────────────────────────────────

let gltfLoader: GLTFLoader | null = null;

function getGLTFLoader(): GLTFLoader {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
    gltfLoader.register(parser => new VRMLoaderPlugin(parser));
  }
  return gltfLoader;
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

// ── ImageBitmap → DataTexture Conversion ─────────────────────────

/**
 * ImageBitmap 기반 Texture를 DataTexture로 변환합니다.
 * Three.js r184에서 ImageBitmap을 WebGL에 업로드할 때 호환성 문제가 발생할 수 있어
 * Uint8Array 기반 DataTexture로 우회합니다.
 */
function convertImageBitmapToDataTexture(tex: THREE.Texture): THREE.Texture {
  const img = tex.image as ImageBitmap | undefined;
  if (!img || img.constructor.name !== 'ImageBitmap') {
    tex.needsUpdate = true;
    return tex;
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    tex.needsUpdate = true;
    return tex;
  }

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const dataTex = new THREE.DataTexture(imageData.data, canvas.width, canvas.height);
  dataTex.format = THREE.RGBAFormat;
  dataTex.colorSpace = tex.colorSpace || THREE.SRGBColorSpace;
  dataTex.flipY = false;
  dataTex.needsUpdate = true;
  return dataTex;
}

// ── MToon → Standard Material Conversion ───────────────────────────

/**
 * MToonMaterial을 MeshStandardMaterial로 변환합니다.
 * MToon은 VRM 전용 shader로, Three.js r184 등 최신 버전에서 호환성 문제가 발생할 수 있습니다.
 */
export function convertMToonToStandard(mtoon: any): THREE.MeshStandardMaterial {
  const std = new THREE.MeshStandardMaterial();

  // ── 색상 (MToon의 litFactor uniform이 실제 색상) ──────────────────
  const litFactor = mtoon.uniforms?.litFactor?.value;
  if (litFactor) {
    std.color.copy(litFactor);
  } else if (mtoon.color) {
    std.color.copy(mtoon.color);
  } else {
    std.color.setHex(0xffffff);
  }

  // ── 메인 텍스처 (ImageBitmap → DataTexture 변환) ─────────────────
  if (mtoon.map) {
    std.map = convertImageBitmapToDataTexture(mtoon.map);
  } else if (mtoon.shadeMultiplyTexture) {
    std.map = convertImageBitmapToDataTexture(mtoon.shadeMultiplyTexture);
  }

  // ── 노멀 맵 ──────────────────────────────────────────────────────
  if (mtoon.normalMap) {
    std.normalMap = convertImageBitmapToDataTexture(mtoon.normalMap);
    if (mtoon.normalScale) std.normalScale.copy(mtoon.normalScale);
  }

  // ── Emissive ─────────────────────────────────────────────────────
  if (mtoon.emissive) std.emissive.copy(mtoon.emissive);
  if (mtoon.emissiveMap) std.emissiveMap = convertImageBitmapToDataTexture(mtoon.emissiveMap);
  std.emissiveIntensity = mtoon.emissiveIntensity ?? 0;

  // ── Shade (MToon 특화) ───────────────────────────────────────────
  if (mtoon.shadeColor) {
    std.emissive.copy(mtoon.shadeColor).multiplyScalar(0.1);
  }
  if (mtoon.shadeMultiplyTexture && std.map?.image !== mtoon.shadeMultiplyTexture?.image) {
    std.aoMap = convertImageBitmapToDataTexture(mtoon.shadeMultiplyTexture);
    std.aoMapIntensity = 0.5;
  }

  // ── 투명도 (MToon의 alpha 설정 유지) ──────────────────────────────
  // MToon의 blendMode: OPAQUE(0), MASK(1), BLEND(2)
  // transparentWithZWrite: MToon 확장 — 투명 + Z-Write 동시 활성화
  const blendMode = mtoon.blendMode ?? 0;
  const tzw = !!(mtoon.transparentWithZWrite ?? (mtoon.uniforms?.transparentWithZWrite?.value));

  std.transparent = blendMode === 2;
  std.alphaTest = blendMode === 1 ? 0.5 : 0;
  std.depthWrite = std.transparent ? tzw : true;
  std.opacity = mtoon.opacity ?? 1.0;

  if (mtoon.alphaMap) {
    std.alphaMap = convertImageBitmapToDataTexture(mtoon.alphaMap);
  }

  // MASK mode: alphaTest 0.5로 클리핑, transparent는 false 유지
  if (blendMode === 1) {
    std.transparent = false;
    std.alphaTest = 0.5;
    std.depthWrite = true;
  }

  // ── PBR 파라미터 (MToon → Standard 매핑) ────────────────────────
  std.roughness = mtoon.shadingShiftTexture ? 0.6 : 0.8;
  std.metalness = 0.0;

  // ── Rim light (MToon 특화) → envMapIntensity로 근사 ─────────────
  if (mtoon.rimColor) {
    std.envMapIntensity = Math.max(std.envMapIntensity, 0.3);
  }

  // ── 기타 ─────────────────────────────────────────────────────────
  std.side = mtoon.side ?? THREE.FrontSide;
  std.vertexColors = mtoon.vertexColors ?? false;

  if (mtoon.name) std.name = mtoon.name.replace('_MToon', '_Standard');
  if (mtoon.userData) std.userData = { ...mtoon.userData, convertedFromMToon: true };

  // ── Color space 보정 ─────────────────────────────────────────────
  if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
  if (std.emissiveMap) std.emissiveMap.colorSpace = THREE.SRGBColorSpace;
  if (std.normalMap) std.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
  if (std.aoMap) std.aoMap.colorSpace = THREE.LinearSRGBColorSpace;
  if (std.alphaMap) std.alphaMap.colorSpace = THREE.LinearSRGBColorSpace;

  // ── 셰이더 재컴파일 트리거 ──────────────────────────────────────
  std.needsUpdate = true;

  return std;
}

// ── Material Enhancement ───────────────────────────────────────────

export function enhanceMaterial(
  mat: THREE.MeshStandardMaterial,
  category: 'skin' | 'hair' | 'eye' | 'mouth' | 'clothing' | 'default'
): THREE.MeshStandardMaterial {
  // MeshPhysicalMaterial로 업그레이드 (sheen/clearcoat 지원 필요)
  let phys: THREE.MeshPhysicalMaterial;
  if (mat instanceof THREE.MeshPhysicalMaterial) {
    phys = mat;
  } else {
    // 수동으로 속성 복사하여 MeshPhysicalMaterial 생성
    // (MeshPhysicalMaterial.copy()는 jsdom/테스트 환경에서 Vector2 속성 오류 발생)
    phys = new THREE.MeshPhysicalMaterial();
    phys.color.copy(mat.color);
    if (mat.map) {
      phys.map = mat.map
      phys.map.needsUpdate = true
    }
    if (mat.normalMap) {
      phys.normalMap = mat.normalMap;
      phys.normalMap.needsUpdate = true
      if (mat.normalScale) phys.normalScale.copy(mat.normalScale);
    }
    phys.emissive.copy(mat.emissive);
    if (mat.emissiveMap) {
      phys.emissiveMap = mat.emissiveMap;
      phys.emissiveMap.needsUpdate = true
    }
    phys.emissiveIntensity = mat.emissiveIntensity;
    if (mat.alphaMap) {
      phys.alphaMap = mat.alphaMap;
      phys.alphaMap.needsUpdate = true
    }
    phys.alphaTest = mat.alphaTest;
    phys.transparent = mat.transparent;
    phys.opacity = mat.opacity;
    phys.depthWrite = mat.depthWrite;
    phys.depthTest = mat.depthTest;
    phys.roughness = mat.roughness;
    phys.metalness = mat.metalness;
    phys.side = mat.side;
    phys.vertexColors = mat.vertexColors;
    if (mat.envMap) {
      phys.envMap = mat.envMap;
      phys.envMapIntensity = mat.envMapIntensity;
    }
    // 누락되었던 추가 속성들
    if (mat.lightMap) {
      phys.lightMap = mat.lightMap;
      phys.lightMapIntensity = mat.lightMapIntensity;
    }
    if (mat.aoMap) {
      phys.aoMap = mat.aoMap;
      phys.aoMapIntensity = mat.aoMapIntensity;
    }
    if (mat.roughnessMap) {
      phys.roughnessMap = mat.roughnessMap;
      phys.roughnessMap.needsUpdate = true
    }
    if (mat.metalnessMap) {
      phys.metalnessMap = mat.metalnessMap;
      phys.metalnessMap.needsUpdate = true
    }
    if (mat.bumpMap) {
      phys.bumpMap = mat.bumpMap;
      phys.bumpMap.needsUpdate = true
      phys.bumpScale = mat.bumpScale;
    }
    if (mat.displacementMap) {
      phys.displacementMap = mat.displacementMap;
      phys.displacementMap.needsUpdate = true
      phys.displacementScale = mat.displacementScale;
      phys.displacementBias = mat.displacementBias;
    }
    if (mat.name) phys.name = mat.name;
    if (mat.userData) phys.userData = { ...mat.userData };
  }

  switch (category) {
    case 'skin': {
      phys.roughness = Math.min(phys.roughness, 0.5);
      phys.metalness = 0.0;
      phys.sheen = 0.0;
      phys.clearcoat = 0.0;
      phys.envMapIntensity = 0.15;
      break;
    }
    case 'hair': {
      phys.roughness = Math.min(phys.roughness, 0.35);
      phys.metalness = Math.min(phys.metalness, 0.05);
      phys.sheen = 0.25;
      phys.sheenRoughness = 0.4;
      phys.sheenColor = new THREE.Color(0xffffff);
      phys.clearcoat = 0.08;
      phys.clearcoatRoughness = 0.25;
      phys.envMapIntensity = 0.4;
      break;
    }
    case 'eye': {
      phys.roughness = 0.05;
      phys.metalness = 0.0;
      phys.clearcoat = 0.4;
      phys.clearcoatRoughness = 0.05;
      phys.sheen = 0.0;
      phys.envMapIntensity = 0.6;
      break;
    }
    case 'mouth': {
      phys.roughness = Math.min(phys.roughness, 0.3);
      phys.metalness = 0.0;
      phys.clearcoat = 0.1;
      phys.clearcoatRoughness = 0.15;
      phys.sheen = 0.0;
      phys.envMapIntensity = 0.25;
      break;
    }
    case 'clothing': {
      phys.roughness = Math.max(phys.roughness, 0.6);
      phys.metalness = Math.min(phys.metalness, 0.05);
      phys.sheen = 0.0;
      phys.clearcoat = 0.0;
      phys.envMapIntensity = 0.2;
      break;
    }
    default: {
      phys.envMapIntensity = 0.3;
      break;
    }
  }

  // Transparent material handling: WebGL2(Three.js r184+)에서
  // transparent material은 depthWrite=false가 기본값이 아니므로 명시적 설정.
  // renderOrder를 높여 opaque 패스 이후 렌더링되도록 보장.
  if (phys.transparent) {
    phys.depthWrite = false;
  }

  phys.needsUpdate = true;
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

    // Black color fix: black → light gray
    const intensity = std.color.r + std.color.g + std.color.b;
    if (intensity < 0.05) {
      std.color.setHex(0xbbbbbb);
    }

    // Extreme emissive fix
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

// ── Outline Removal ────────────────────────────────────────────────

/**
 * VRM models exported with MToon outline support may contain separate
 * outline meshes that render on top of base meshes. These can occlude
 * hair/eye textures if the outline material is opaque or improperly
 * configured. This function detects and hides outline meshes.
 */
export function hideOutlineMeshes(group: THREE.Group): void {
  group.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const name = mesh.name.toLowerCase();

    // Outline detection by naming convention
    const nameIsOutline =
      name.includes('outline') ||
      name.includes('out_line') ||
      name.includes('_out_') ||
      name.endsWith('_out') ||
      name.startsWith('out_');

    if (nameIsOutline) {
      mesh.visible = false;
      console.log(`[avatar] Hiding outline mesh: "${mesh.name}"`);
      return;
    }

    // Multi-material mesh: VRM MToon outlines use a SECOND material/primitive
    // on the SAME mesh (e.g. [Skin, Skin (Outline)]). We can't reduce the array
    // length because geometry groups are indexed by position. Instead, set outline
    // materials to fully transparent so the base primitive renders normally.
    if (Array.isArray(mesh.material)) {
      let hadOutline = false;
      for (let i = 0; i < mesh.material.length; i++) {
        const mat = mesh.material[i];
        if (mat && mat.name?.toLowerCase().includes('outline')) {
          mat.opacity = 0;
          mat.transparent = true;
          hadOutline = true;
        }
      }
      if (hadOutline) {
        console.log(`[avatar] Disabled outline materials on: "${mesh.name}"`);
      }
    } else if (mesh.material?.name?.toLowerCase().includes('outline')) {
      mesh.visible = false;
      console.log(`[avatar] Hiding outline mesh: "${mesh.name}"`);
    }
  });
}

/**
 * Set renderOrder for transparent meshes so they render after opaque ones.
 * This prevents depth-related rendering artifacts for hair, eye, and other
 * transparent/alpha-blended geometry.
 */
export function sortTransparentMeshes(group: THREE.Group): void {
  let order = 1;
  group.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const isTransparent = mats.some(m => m.transparent);
    if (isTransparent) {
      mesh.renderOrder = order++;
    }
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

  const parts: PlaceholderParts = { body, head, leftEye, rightEye };
  const animationController = createPlaceholderAnimController(parts, group);

  return {
    group,
    mixer: null,
    animations: [],
    animationController,
    update(delta) {
      animationController.update(delta);
    },
    dispose() {
      animationController.dispose();
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

// ── VRM/GLTF Avatar Loading ────────────────────────────────────────

export async function loadAvatar(
  config: AvatarConfig,
): Promise<IAvatar> {
  const modelPathRaw = config.modelPath ?? './models/noah.glb';
  const modelPath = modelPathRaw.startsWith('./') ? modelPathRaw.slice(2) : modelPathRaw;

  const loader = getGLTFLoader();
  const gltf = await loader.loadAsync(modelPath);
  const vrm = gltf.userData.vrm;
  const scene = gltf.scene;

  console.log('[avatar] GLB loaded:', {
    childCount: scene.children.length, path: modelPath, hasVRM: !!vrm,
  });

  // scale 적용
  const scale = config.scale ?? 1.0;
  scene.scale.set(scale, scale, scale);
  if (config.position) scene.position.copy(config.position);

  // AnimationMixer
  let mixer: THREE.AnimationMixer | null = null;
  if (gltf.animations && gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(scene);
  }

  // 기본 mesh 설정 (shadow, cleanup)
  //
  // CRITICAL: @pixiv/three-vrm plugin이 모든 MToon material을 Three.js에서
  // 렌더링 가능한 형태로 변환한다. texture, blend mode, alpha, shader가
  // 모두 올바르게 설정됨. 여기서 enhanceMaterial/convertMToonToStandard를
  // 호출하면 VRM plugin의 작업을 덮어쓰고 새 MeshPhysicalMaterial을 생성하여
  // texture metadata, ImageBitmap compatibility, shader 설정을 전부 파괴한다.
  //
  // 따라서 VRM 모델은 skipMaterialFix=true가 기본 동작.
  const shouldFixMaterials = !vrm && !config.skipMaterialFix;

  scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (shouldFixMaterials) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.material = mats.map(m => {
        const anyM = m as any;
        if (anyM.isMToonMaterial) {
          const std = convertMToonToStandard(anyM);
          const category = classifyMaterial(mesh.name, std.name || '', !!std.map);
          return enhanceMaterial(std, category);
        }
        if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const category = classifyMaterial(mesh.name, m.name || '', !!(m as any).map);
          return enhanceMaterial(m as THREE.MeshStandardMaterial, category);
        }
        return m;
      });
    }
  });

  removeEmbeddedLights(scene);
  removeGroundPlanes(scene);

  const animationController = createAnimationController(scene, gltf.animations || []);

  return {
    group: scene,
    mixer,
    animations: gltf.animations || [],
    animationController,
    vrm: vrm || undefined,
    update(delta) {
      if (vrm && typeof vrm.update === 'function') vrm.update(delta);
      if (mixer) mixer.update(delta);
      animationController.update(delta);
    },
    dispose() {
      animationController.dispose();
      if (mixer) mixer.stopAllAction();
      if (vrm) vrm.dispose();
      scene.traverse((child) => {
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