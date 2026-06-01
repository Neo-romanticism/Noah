# STAGE-05b: FBX → glTF/VRM Migration

## 목표

FBXLoader + VRM_TEXTURE_MAP + 수동 텍스처 로딩으로 이어지는 복잡한 파이프라인을, **GLTFLoader로 VRM(GLB)을 직접 로딩**하는 방식으로 대체.

## 현재 파이프라인 (AS-IS)

```
Noah3.vrm
    │
    ▼
[Blender] import_vrm_clean.py
    │  VRM import → 불필요 객체 제거 → FBX export
    ▼
noah.fbx (2.4MB, 텍스처 미포함)
    │
    ▼
[extract-vrm-textures.mjs]  ← 별도 실행 필요
    │  GLB BIN 청크에서 26개 PNG 추출
    ▼
textures/_01.png ... _19.png
    │
    ▼
[Runtime] Three.js FBXLoader → fixMaterial() → reloadFailedTextures()
    │  - FBXLoader가 만든 placeholder 텍스처 탐지/제거
    │  - VRM_TEXTURE_MAP 하드코딩 Lookup으로 올바른 텍스처 로딩
    │  - loadTextureDirect()로 crossOrigin 우회 (file://)
    │  - reloadFailedTextures()는 비동기 Image.onload를 사용하므로
    │    텍스처 로드 완료 전 렌더링 시작 → 첫 프레임 검정색 위험 있음
    ▼
MeshPhysicalMaterial (PBR 파라미터 적용)
```

### 핵심 문제점
1. **FBXLoader placeholder 텍스처**: FBX에 포함된 텍스처 참조가 깨져 Three.js가 빈 Texture 생성 → GPU가 검정색 샘플링
2. **VRM_TEXTURE_MAP 하드코딩**: 모델 구조 변경 시 직접 수정 필요, 유지보수 어려움
3. **텍스처 추출 별도 실행**: extract-vrm-textures.mjs를 빌드 전 수동/스크립트 실행해야 함
4. **Blender 변환 단계**: VRM → FBX 변환에서 정보 손실 가능 (텍스처 참조, 쉐이더 설정, BlendShape 등)
5. **비동기 텍스처 로딩**: `reloadFailedTextures()`는 내부적으로 `Image.onload`를 사용하나 함수 자체가 동기 반환되어, 텍스처가 실제 로드되기 전에 첫 렌더링이 시작될 수 있음

---

## 대상 파이프라인 (TO-BE)

```
Noah3.vrm (GLB)
    │
    ▼
[Runtime] GLTFLoader + @pixiv/three-vrm
    │  - VRM JSON 메타데이터 자동 파싱
    │  - 텍스처 자동 로딩 (GLB BIN 청크에서 직접)
    │  - Blend shape / Expression 지원
    │  - 리깅/본 자동 매핑
    ▼
MeshPhysicalMaterial (PBR 파라미터만 튜닝)
```

### 기대 효과
- **FBXLoader 의존성 제거**, placeholder 텍스처 우회 로직 전체 삭제
- **VRM_TEXTURE_MAP, reloadFailedTextures, loadTextureDirect, isTextureValid** 불필요
- `reloadFailedTextures()`의 비동기 텍스처 타이밍 이슈 근본적 해결 (GLB 내장 텍스처는 동기적으로 사용 가능)
- 변환 단계 축소 (Blender FBX export 불필요)
- 텍스처가 GLB에 내장되어 별도 추출/복사 불필요
- VRM 1.0 스펙의 blend shape, expression, look-at 등 활용 가능

---

## Phase 0: 스파이크 (PoC) — 반드시 먼저 실행

> ⚠️ **이 Phase를 먼저 수행하지 않으면 후속 작업이 무의미할 수 있음.**
> Three.js r184와 @pixiv/three-vrm 호환성, Electron file:// 로딩 이슈를 사전에 확인.

### 0.1 @pixiv/three-vrm 설치 및 호환성 확인

```bash
npm install @pixiv/three-vrm
```

- **peerDependencies**: `three: '>=0.137'` — r184와 호환됨 (확인 완료, 2026-06-01)
- 현재 `package.json` dependencies에 `@pixiv/three-vrm` 없음 — 설치 필요
- 설치 후 `import { VRMLoaderPlugin } from '@pixiv/three-vrm'`이 정상 동작하는지 빌드 테스트

### 0.2 GLB 로딩 PoC

`src/renderer/avatar.ts`에 임시 코드를 넣어 **30분 내로** 아래를 검증:

```typescript
// PoC 코드 (커밋 금지)
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

const loader = new GLTFLoader();
loader.register(parser => new VRMLoaderPlugin(parser));

// 검증 항목 1: Electron renderer에서 file:// URL로 GLB 로딩
const gltf = await loader.loadAsync('./models/noah.glb');

// 검증 항목 2: VRM 객체 획득
const vrm = gltf.userData.vrm;
console.log('VRM:', vrm);

// 검증 항목 3: 텍스처가 내장되어 정상 로드되는지
const scene = gltf.scene;
scene.traverse((child) => {
  if ((child as THREE.Mesh).isMesh) {
    const mesh = child as THREE.Mesh;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m, i) => {
      console.log(`${mesh.name} mat${i}: type=${m.type}, map=${m.map ? 'OK' : 'none'}`);
    });
  }
});
```

### 0.3 PoC 실패 시 대응

| 실패 시나리오 | 대응 |
|-------------|------|
| `file://` 로딩 실패 (CORS) | Phase 1.4 `ElectronFileLoader` 브릿지 구현 |
| @pixiv/three-vrm import 오류 | 버전 다운그레이드 또는 Three.js 업그레이드 검토 |
| VRM 메타데이터 누락 | Blender export 설정 조정 또는 VRM 직접 로딩 검토 |
| 재질 타입이 `MeshStandardMaterial`이 아님 (MToon 등) | `enhanceMaterial()` 타입 가드 추가 및 PoC 로그 기반 조정 |

**PoC 3개 항목 모두 통과 후에만 Phase 1 이후 진행.**

---

## Phase 1: 의존성 추가 & 에셋 파이프라인

### 1.1 @pixiv/three-vrm 설치

```bash
npm install @pixiv/three-vrm
```

- three-vrm 최신 버전: `3.5.3` (2026-06-01 기준)
- Three.js r184와 호환 확인됨
- 현재 `package.json` dependencies: `"three": "^0.184.0"` (only one). 설치 후 `@pixiv/three-vrm`가 추가됨.

### 1.2 Blender 스크립트 — GLB export 추가

기존 `scripts/blender/import_vrm_clean.py`는 **deprecated 처리** (git 이력으로 롤백 가능).
새 파일 `scripts/blender/export_vrm_to_glb.py` 생성:

```python
#!/usr/bin/env python3
"""
Noah Pipeline — VRM Import & GLB Export
========================================
1. Import VRM file
2. Remove unwanted objects (ground planes, shadow catchers, etc.)
3. Export clean GLB (textures embedded)

Usage:
    blender --background --python scripts/blender/export_vrm_to_glb.py

Requires: Blender 3.0+ with VRM Addon installed
"""

import bpy
import sys
import os

# ── Configuration ─────────────────────────
VRM_PATH = os.path.abspath("assets/models/Noah3.vrm")
GLB_OUTPUT = os.path.abspath("assets/models/noah.glb")

# Objects to remove by name pattern (lowercase)
REMOVE_NAME_PATTERNS = [
    "shadow", "ground", "plane", "stage", "base",
    "platform", "collision", "collider",
]

REMOVE_IF_LARGE_FLAT_AT_GROUND = True
GROUND_Y_THRESHOLD = 0.05
MIN_SIZE_XZ = 0.3
MAX_SIZE_Y = 0.2


def remove_unwanted_objects():
    """Remove objects that are not part of the avatar."""
    removed = []
    objects_to_remove = set()

    for obj in list(bpy.context.scene.objects):
        name_lower = obj.name.lower()
        for pattern in REMOVE_NAME_PATTERNS:
            if pattern in name_lower:
                objects_to_remove.add(obj)
                removed.append(f"{obj.name} (pattern: {pattern})")
                break

        if obj not in objects_to_remove and REMOVE_IF_LARGE_FLAT_AT_GROUND and obj.type == 'MESH':
            bbox = [obj.matrix_world @ v.co for v in obj.data.vertices]
            if len(bbox) >= 2:
                xs = [v.x for v in bbox]
                ys = [v.y for v in bbox]
                zs = [v.z for v in bbox]
                size_x = max(xs) - min(xs)
                size_y = max(ys) - min(ys)
                size_z = max(zs) - min(zs)
                center_y = (max(ys) + min(ys)) / 2

                if (abs(center_y) < GROUND_Y_THRESHOLD and
                    (size_x > MIN_SIZE_XZ or size_z > MIN_SIZE_XZ) and
                    size_y < MAX_SIZE_Y):
                    objects_to_remove.add(obj)
                    removed.append(f"{obj.name} (large flat at ground)")

    for obj in objects_to_remove:
        bpy.data.objects.remove(obj, do_unlink=True)

    print(f"[Noah Pipeline] Removed {len(removed)} unwanted objects")


def export_glb():
    """Export to GLB with textures embedded."""
    os.makedirs(os.path.dirname(GLB_OUTPUT), exist_ok=True)

    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type in {'ARMATURE', 'MESH'}:
            obj.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=GLB_OUTPUT,
        export_format='GLB',
        use_selection=True,
        export_image_format='PNG',
        export_texture_dir='',
        export_apply=True,
        export_animations=True,
        export_skins=True,
        export_materials=True,
        export_yup=True,
    )

    print(f"[Noah Pipeline] Exported: {GLB_OUTPUT}")


def main():
    print("[Noah Pipeline] Starting VRM import & GLB export...")
    print(f"[Noah Pipeline] VRM: {VRM_PATH}")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    try:
        bpy.ops.import_scene.vrm(filepath=VRM_PATH)
        print("[Noah Pipeline] VRM imported successfully")
    except AttributeError:
        try:
            bpy.ops.import_scene.vrm_addon_for_blender(filepath=VRM_PATH)
            print("[Noah Pipeline] VRM imported (alternative operator)")
        except AttributeError:
            print("[Noah Pipeline] ERROR: VRM Addon not installed")
            sys.exit(1)

    remove_unwanted_objects()

    # VRM Addon native export 우선 시도 (BlendShape 보존에 유리)
    if not export_glb_vrm_addon():
        export_glb()  # fallback to standard glTF

    print("[Noah Pipeline] Done!")


def export_glb_vrm_addon():
    """Alternative: Use VRM Addon's native GLB export if available.
    Preserves BlendShape better than standard glTF export."""
    os.makedirs(os.path.dirname(GLB_OUTPUT), exist_ok=True)
    try:
        # VRM Addon 2.x+ provides direct GLB export
        bpy.ops.export_scene.vrm(filepath=GLB_OUTPUT)
        print(f"[Noah Pipeline] Exported via VRM Addon: {GLB_OUTPUT}")
        return True
    except AttributeError:
        print("[Noah Pipeline] VRM Addon GLB export not available, falling back to standard glTF")
        return False


if __name__ == "__main__":
    main()
```

출력: `assets/models/noah.glb`

**⚠️ BlendShape 손실 주의**: `export_apply=True`는 modifier를 적용하므로, VRM의 BlendShape가 modifier 기반일 경우 손실될 수 있음. `export_glb_vrm_addon()`을 우선 시도하는 전략으로 대응.

**이 스크립트는 Blender 수동 실행으로만 필요** — 더 이상 빌드 시 자동 실행 불필요.

### 1.3 copy-assets 업데이트

GLB 모델만 복사하면 텍스처는 따로 복사할 필요 없음 (GLB 내장).

현재 `package.json`의 `copy-assets`:
```
mkdir -p dist/renderer/renderer/styles dist/renderer/renderer/models dist/renderer/renderer/textures &&
cp src/renderer/index.html dist/renderer/renderer/ &&
cp src/renderer/styles/main.css dist/renderer/renderer/styles/ &&
cp assets/models/noah.fbx dist/renderer/renderer/models/ &&
cp assets/models/textures/*.png dist/renderer/renderer/textures/
```

변경 후:
```json
"copy-assets": "mkdir -p dist/renderer/renderer/styles dist/renderer/renderer/models && cp src/renderer/index.html dist/renderer/renderer/ && cp src/renderer/styles/main.css dist/renderer/renderer/styles/ && cp assets/models/noah.glb dist/renderer/renderer/models/"
```

변경 사항:
- `noah.fbx` → `noah.glb`로 변경
- `dist/renderer/renderer/textures/` 디렉토리 생성 라인 **제거**
- `assets/models/textures/*.png` 복사 라인 **제거** (텍스처 26개, 약 15-20MB 절약)
- `extract-vrm-textures.mjs`는 `copy-assets`에서 호출되지 않음 (scripts에 등록되어 있지 않음) — 삭제만 하면 됨

**참고**: GLB는 텍스처 내장으로 파일 크기 증가 예상 (FBX 2.4MB → GLB 5-15MB). `dist/`에는 단일 GLB 파일만 복사됨.

### 1.4 Electron file:// 로딩 브릿지 (PoC 실패 시)

`GLTFLoader.loadAsync()`가 Electron renderer의 `file://` 프로토콜에서 실패할 경우, IPC 브릿지 구현.
현재 `src/main/preload.ts`에는 `NoahPreloadAPI`만 있고 파일 로딩 API 없음. `src/main/ipc/index.ts`에도 `fs:readFile` 핸들러 없음 — 둘 다 신규 구현 필요.

**`src/main/ipc/index.ts` 수정:**
```typescript
import { ipcMain } from 'electron';
import { registerSystemInfoHandlers } from './systemMetrics';
import * as fs from 'fs';

export function registerAllIpcHandlers(): void {
  registerSystemInfoHandlers(ipcMain);

  // File reader for GLB loading (Electron file:// bypass)
  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    const buffer = await fs.promises.readFile(filePath);
    return buffer;
  });
}
```

**`src/main/preload.ts` 수정:**
```typescript
export interface NoahPreloadAPI {
  // ... existing APIs ...
  readFile: (path: string) => Promise<ArrayBuffer>;
}

contextBridge.exposeInMainWorld('noah', {
  // ... existing APIs ...
  readFile: async (path: string): Promise<ArrayBuffer> => {
    const buffer = await ipcRenderer.invoke('fs:readFile', path);
    // Buffer → ArrayBuffer 명시적 변환 (structured clone 호환)
    return new Uint8Array(buffer).buffer;
  },
});
```

**`src/renderer/avatar.ts` 사용:**
```typescript
const buffer = await window.noah.readFile(config.modelPath);
const gltf = await loader.parseAsync(buffer, '');
```

---

## Phase 2: avatar.ts 리팩터 — FBXLoader 제거

### 2.1 새 로더 도입

```typescript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
```

기존 `getFBXLoader()` 및 `initFBXLoader()` (lazy import) 대체:

```typescript
let gltfLoader: GLTFLoader | null = null;

function getGLTFLoader(): GLTFLoader {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
    gltfLoader.register(parser => new VRMLoaderPlugin(parser));
  }
  return gltfLoader;
}
```

### 2.2 loadAvatar() 재작성

기존 `loadAvatar()`:
- `modelPath` default: `'./models/noah.fbx'`
- `LoaderFactory` 파라미터로 FBXLoader 주입 (테스트용)
- FBXLoader로 로드 → `fixMaterial()` → `reloadFailedTextures()` (호출처: `loadAvatarWithTextures`)

새 `loadAvatar()`:
- `modelPath` default: `'./models/noah.glb'`
- `LoaderFactory` 파라미터 제거 (더 이상 테스트 주입 불필요 — GLTFLoader로 대체)
- `getGLTFLoader()` 사용 → `enhanceMaterial()` 직접 호출

```typescript
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
    childCount: scene.children.length,
    path: modelPath,
    hasVRM: !!vrm,
  });

  // scale 적용
  const scale = config.scale ?? 1.0;
  scene.scale.set(scale, scale, scale);
  if (config.position) scene.position.copy(config.position);

  // AnimationMixer (VRM 애니메이션)
  let mixer: THREE.AnimationMixer | null = null;
  if (gltf.animations && gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(scene);
    console.log('[avatar] animations:', gltf.animations.length);
  }

  // 재질 튜닝 (enhanceMaterial만 — fixMaterial의 텍스처 검증 불필요)
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (!config.skipMaterialFix) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mesh.material = mats.map(m => {
          // VRM 로더가 생성한 material은 주로 MeshStandardMaterial 기반
          // MToon 등 다른 타입일 수 있으므로 타입 가드 필요
          if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            const category = classifyMaterial(mesh.name, m.name || '', !!(m as any).map);
            return enhanceMaterial(m as THREE.MeshStandardMaterial, category);
          }
          // Non-standard material: 그대로 유지 또는 기본 변환
          return m;
        });
      }
    }
  });

  removeEmbeddedLights(scene);
  removeGroundPlanes(scene);

  return {
    group: scene,
    mixer,
    animations: gltf.animations || [],
    update(delta) { if (mixer) mixer.update(delta); },
    dispose() {
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
```

### 2.3 제거할 코드 목록

아래는 모두 FBX 파이프라인 전용 코드이므로 완전히 제거:

| 함수/상수 | 파일 라인 (현재) | 설명 | 의존관계 |
|-----------|----------------|------|----------|
| `getFBXLoader()` | 22-28 | FBXLoader lazy import | `loadAvatar()`에서만 호출 |
| `FBXLoaderModule` 타입 | 22 | 모듈 캐시 | `getFBXLoader()` 전용 |
| `initFBXLoader()` | 32-34 | 동적 import 초기화 | `loadAvatarWithTextures()`에서만 호출 |
| `LoaderFactory` 타입 | 40-42 | 테스트 주입용 FBX factory | `loadAvatar()` 파라미터 |
| `isTextureValid()` | 86-99 | Placeholder 텍스처 검증 | `fixMaterial()`, `enhanceMaterial()`, `reloadFailedTextures()`에서 호출 |
| `loadTextureDirect()` | 495-516 | crossOrigin 우회 로더 | `reloadFailedTextures()`에서만 호출 |
| `VRM_TEXTURE_MAP` | 522-546 | 하드코딩 텍스처 매핑 (18개 항목) | `resolveMeshBaseName()`에서만 참조 |
| `resolveMeshBaseName()` | 548-555 | 메시명 → VRM 매핑 | `reloadFailedTextures()`에서만 호출 |
| `reloadFailedTextures()` | 557-586 | 비동기 텍스처 재로딩 | `loadAvatarWithTextures()`에서만 호출 |
| `loadAvatarWithTextures()` | 589-606 | `loadAvatar()` + 텍스처 리로드 래퍼 | `index.ts`에서 `loadAvatar`만 import하므로 미사용 확인 필요. **제거 대상**. |
| `fixMaterial()` texture 검증 부분 | 259-289 | `map`, `alphaMap`, `emissiveMap`, `roughnessMap`, `metalnessMap` placeholder 탐지/fallback | `fixMaterial()` 내부 |
| DEBUG `meshesWithTextures` | 439-458 | FBX 디버깅 로그 (메시별 텍스처 현황) | `loadAvatar()` 내부 비동기 로직 주변 |

**총 제거량: 약 250줄** (avatar.ts 전체 615줄 중)

> **`loadAvatarWithTextures()` 제거 확인**: 현재 `src/renderer/index.ts`는 `loadAvatar`만 import함 (line 11: `import { loadAvatar, createPlaceholderAvatar, type IAvatar } from './avatar.js'`). `loadAvatarWithTextures`는 `avatar.ts` 내부 래퍼이며 외부 호출처가 없으므로 안전하게 제거 가능.

### 2.4 간소화할 코드

- **`fixMaterial()`**: 텍스처 검증 부분 (map, alphaMap, emissiveMap, roughnessMap, metalnessMap — line 259-289) 전부 제거. 검정색/emissive 보정 + colorSpace 설정만 남기고, `enhanceMaterial()` 호출 유지.
  ```typescript
  export function fixMaterial(mat: THREE.Material, meshName: string = ''): THREE.Material {
    if (!(mat instanceof THREE.MeshStandardMaterial)) return mat;
    const std = mat;

    // Black color fix: black → light gray
    const c = std.color;
    const eps = 0.02;
    if (c && c.r <= eps && c.g <= eps && c.b <= eps) {
      c.setRGB(0.9, 0.9, 0.9);
    }

    // emissive/emissiveMap fix (black-only emissive → disable)
    const emissiveColor = std.emissive;
    const emissiveIsBlack =
      emissiveColor &&
      emissiveColor.r < eps &&
      emissiveColor.g < eps &&
      emissiveColor.b < eps;
    if (emissiveIsBlack && !std.emissiveMap) {
      std.emissiveIntensity = 0;
    }

    // colorSpace 설정 (유지)
    std.colorSpace = THREE.SRGBColorSpace;
    if (std.map) {
      std.map.colorSpace = THREE.SRGBColorSpace;
      if (std.map.wrapS === THREE.RepeatWrapping) std.map.wrapS = THREE.ClampToEdgeWrapping;
      if (std.map.wrapT === THREE.RepeatWrapping) std.map.wrapT = THREE.ClampToEdgeWrapping;
      // texture validation + map/alphaMap/emissiveMap/roughnessMap/metalnessMap 검증 전부 제거
    }

    const category = classifyMaterial(meshName, std.name, !!std.map);
    return enhanceMaterial(std, category);
  }
  ```

- **`enhanceMaterial()`**: safety net (`isTextureValid` 체크, line 198-204) 제거. VRM은 텍스처가 정상 로드되므로 white/black color fallback 불필요.
  ```typescript
  // 제거 대상 (line 198-204):
  // if (!isTextureValid(mat.map)) {
  //   if (mat.color.getHex() === 0xffffff || mat.color.getHex() === 0x000000) {
  //     mat.color.copy(getFallbackColor(category));
  //   }
  // }
  ```

### 2.5 유지할 코드

| 함수 | 이유 |
|------|------|
| `classifyMaterial()` | 재질 분류 로직은 VRM에서도 유효 (mesh/material명 기반 휴리스틱) |
| `enhanceMaterial()` | PBR 파라미터 튜닝 (sheen, clearcoat, roughness, metalness 등) |
| `getFallbackColor()` | 폴백 컬러 — `enhanceMaterial()`에서 제거되지만 `fixMaterial()` 또는 향후 다른 곳에서 사용 가능 |
| `removeEmbeddedLights()` | 씬 정리 |
| `removeGroundPlanes()` | 씬 정리 |
| `createPlaceholderAvatar()` | 폴백 아바타 (로딩 실패 시) |
| `fixMaterial()` (간소화) | 검정색/emissive 보정, colorSpace 설정 |

---

## Phase 3: entry point 업데이트

### 3.1 index.ts

현재 `src/renderer/index.ts`:
```typescript
// line 11
import { loadAvatar, createPlaceholderAvatar, type IAvatar } from './avatar.js';

// line 74
console.log('Noah renderer initialized. Loading FBX avatar...');

// line 82
const loaded = await loadAvatar({
  modelPath: './models/noah.fbx',
  scale: 1.0,
  position: new THREE.Vector3(0, 0, 0.5),
});

// line 87
console.log('[Avatar] FBX loaded successfully');
// line 89
console.error('[Avatar] Failed to load FBX, using placeholder:', err);
```

변경:
```typescript
// line 74
console.log('Noah renderer initialized. Loading VRM avatar...');

// line 82
modelPath: './models/noah.glb',

// line 87
console.log('[Avatar] VRM loaded successfully');
// line 89
console.error('[Avatar] Failed to load VRM, using placeholder:', err);
```

---

## Phase 4: 스크립트 정리

### 4.1 extract-vrm-textures.mjs

더 이상 필요 없음. GLTF/VRM 로더가 GLB에서 직접 텍스처를 로딩.

→ **삭제** (`git rm scripts/extract-vrm-textures.mjs` — `.git` 이력에 남아있으므로 보관 불필요)

### 4.2 package.json scripts 정리

현재 `package.json` 확인 결과:
- `copy-assets`에서 `textures/` 복사 라인 제거 (Phase 1.3)
- `extract-vrm-textures` 스크립트는 **존재하지 않음** — 별도 제거 불필요
- 그 외 FBX 관련 커스텀 스크립트 항목 확인 (없음)

### 4.3 inspect-vrm-materials.mjs

VRM 소재 분석 도구로 유용할 수 있음. 유지.

### 4.4 scripts/blender/import_vrm_clean.py

**deprecated 처리** (git 이력 보존). `export_vrm_to_glb.py`로 대체되었음을 주석에 명시.

---

## Phase 5: 테스트 업데이트

### 5.1 fbx-pipeline.test.ts → gltf-pipeline.test.ts

현재 `tests/renderer/fbx-pipeline.test.ts`:
- `createMockLoader()` — FBXLoader mock 생성
- `createFailingLoader()` — 실패 mock
- 6개 테스트: scale/position 적용, material fix 호출, mixer 생성, dispose, loadAvatar 예외 등

변경 사항:
- FBXLoader mock → GLTFLoader + VRM mock (`createMockGLTF()`)
- `modelPath: './models/noah.glb'`
- `LoaderFactory` 타입 제거 (loadAvatar 파라미터에서 사라짐)
- `loadAvatarWithTextures` 관련 테스트 제거
- VRM 애니메이션 테스트 추가 가능

```typescript
describe('VRM Avatar Loading', () => {
  const createMockGLTF = (overrides = {}) => ({
    scene: new THREE.Group(),
    animations: [],
    userData: { vrm: null },
    ...overrides,
  });

  test('loadAvatar returns IAvatar with correct scale and position', async () => { ... });
  test('loadAvatar enhances materials via classifyMaterial + enhanceMaterial', async () => { ... });
  test('placeholder avatar can be used as fallback', async () => { ... });
});
```

**`jest.config.js` 확인**: `testMatch: ['<rootDir>/tests/renderer/**/*.test.ts']` 이므로 `fbx-pipeline.test.ts` → `gltf-pipeline.test.ts` 로 파일명 변경만 하면 자동 인식됨. **jest.config.js 수정 불필요.**

### 5.2 avatar.test.ts

제거할 테스트:
- `isTextureValid` 테스트 블록 전체 (describe + 7개 test) — 함수 자체가 제거됨
- `enhanceMaterial`의 "fallbacks from white to category color..." 테스트 (line 185–197 safety net 관련)
- `fixMaterial`의 "fallbacks white color to skin color..." / "...to hair color..." 테스트 (텍스처 검증 fallback 관련)

유지할 테스트:
- `createPlaceholderAvatar`
- `getFallbackColor`
- `enhanceMaterial` (PBR 파라미터 검증 — sheen, clearcoat, roughness 등)
- `fixMaterial` (기본 보정 로직 — 검정색/emissive)
- `removeEmbeddedLights`
- `removeGroundPlanes`

---

## Phase 6: 문서 업데이트 (선택)

- `README.md`: FBX → VRM(glTF) 표기
- `docs/architecture/ARCHITECTURE.md`: FBXLoader → GLTFLoader + @pixiv/three-vrm

---

## 예상 영향 범위

| 파일 | 변경 유형 | 예상 작업량 |
|------|----------|------------|
| `package.json` | 의존성 추가(`@pixiv/three-vrm`), `copy-assets` 수정 | ~5분 |
| `scripts/blender/export_vrm_to_glb.py` | **신규** (GLB export, ~90줄) | ~15분 |
| `scripts/blender/import_vrm_clean.py` | deprecated 주석 추가 | ~2분 |
| `scripts/extract-vrm-textures.mjs` | 불필요 (`git rm`) | ~2분 |
| `src/renderer/avatar.ts` | **대규모 리팩터 (~250줄 감소, 615→365)** | **~2-3시간** |
| `src/renderer/index.ts` | modelPath + 로그 변경 (4곳) | ~5분 |
| `src/main/ipc/index.ts` | `fs:readFile` 핸들러 추가 (조건부) | ~15분 |
| `src/main/preload.ts` | `readFile` API 추가 (조건부) | ~10분 |
| `tests/renderer/fbx-pipeline.test.ts` | → `gltf-pipeline.test.ts` 재작성 | ~30분 |
| `tests/renderer/avatar.test.ts` | FBX-specific 테스트 제거 (~10개) | ~15분 |
| `assets/models/noah.fbx` | → `noah.glb`로 대체 | (Blender 수동 실행) |

## 리스크 및 고려사항

### 1. Electron file:// URL 이슈
- `GLTFLoader.loadAsync()`는 내부적으로 `fetch()` 사용
- Electron renderer가 `file://` 프로토콜에서 GLB를 fetch할 수 있는지 **PoC에서 반드시 테스트**
- 해결책: Phase 1.4 `ElectronFileLoader` 브릿지 구현 (preload에서 `fs.readFile`로 ArrayBuffer 읽어 `GLTFLoader.parse()` 전달)
- 현재 `src/main/preload.ts`와 `src/main/ipc/index.ts`에 파일 로딩 API 없음 — PoC 실패 시 신규 구현

### 2. @pixiv/three-vrm 버전 호환성
- Three.js r184와 three-vrm 3.5.x 호환 **확인 완료** (peerDependencies: `three >=0.137`)
- 설치 후 import/build 테스트로 최종 확인
- 현재 `package.json`에 `@pixiv/three-vrm` 없음 — Phase 1.1에서 설치

### 3. 애니메이션 파이프라인
- VRM의 애니메이션은 FBX와 다른 시스템 사용 (BlendShape, Expression 등)
- 현재 `AnimationMixer`가 VRM에서도 동작하는지 PoC에서 확인
- `VRMAnimationLoaderPlugin` 등 추가 플러그인 필요 가능

### 4. 재질 표현 차이
- FBXLoader는 material을 `MeshStandardMaterial`로 파싱
- VRM 로더는 VRM Material (MToon, Guro, UniGLTF 등)을 Three.js material로 변환
- 기존 `enhanceMaterial` PBR 튜닝 값이 VRM material에서도 적절한지 확인 필요
- **PoC에서 material 타입 로깅 후 `enhanceMaterial` 타입 가드 추가**
- `isMeshStandardMaterial` 체크만으로 MToon 등이 통과하지 못할 수 있음 — PoC 로그 기반 조정

### 5. FBX 폴백 유지 여부
- **권장: 완전 전환** (PoC 통과 후). 롤백은 git 이력으로 충분.
- `useGLB` 플래그 등 점진적 마이그레이션은 코드 복잡성만 증가시킴.

### 6. `reloadFailedTextures()` 비동기 타이밍 이슈 (해결됨)
- 기존: `loadTextureDirect()` → `Image.onload` 비동기 → 함수 동기 반환 → 첫 프레임에 텍스처 미로딩 가능
- GLB 전환 후: 텍스처가 GLB에 내장되어 `loadAsync()` 완료 시점에 모든 텍스처 사용 가능 — 근본적 해결

---

## 체크리스트 — 마이그레이션 상태

> 마이그레이션 완료일: 2026-06-01. **363개 테스트 전부 통과** (20 suites, 0 failures)

- [x] **Phase 0: PoC**
  - [x] `@pixiv/three-vrm` 설치
  - [x] GLB 로딩 테스트 (`file://` URL) — 통과
  - [x] VRM 객체 획득 확인
  - [x] 텍스처 내장 로딩 확인
  - [x] material 타입 확인 (`MeshStandardMaterial`)
  - [x] BlendShape 손실 여부 확인 (애니메이션 관련)
- [x] Phase 1.1: `@pixiv/three-vrm` 설치
- [x] Phase 1.2: `export_vrm_to_glb.py` 작성
- [x] Phase 1.2: `noah.glb` 생성 (17MB, VRM Addon, 콜라이더 스피어 경고 외 정상)
- [x] Phase 1.3: `copy-assets` 수정
- [x] Phase 1.4: `ElectronFileLoader` 브릿지 — 불필요 (PoC 통과로 file:// 로딩 정상)
- [x] Phase 2: avatar.ts 리팩터
  - [x] `GLTFLoader` + `VRMLoaderPlugin` 도입
  - [x] `loadAvatar()` 재작성
  - [x] FBX 관련 코드 제거 (`getFBXLoader`, `initFBXLoader`, `LoaderFactory`, `isTextureValid`, `loadTextureDirect`, `VRM_TEXTURE_MAP`, `resolveMeshBaseName`, `reloadFailedTextures`, `loadAvatarWithTextures`)
  - [x] `fixMaterial()` 단순화 (텍스처 검증 부분 전부 제거)
  - [x] `enhanceMaterial()` safety net 정리
- [x] Phase 3: index.ts modelPath + 로그 변경
- [x] Phase 4: 스크립트 정리
  - [x] `extract-vrm-textures.mjs` 삭제
  - [x] `import_vrm_clean.py` deprecated 주석
  - [x] package.json scripts에서 FBX 관련 커스텀 스크립트 제거 (확인 결과 없음)
- [x] Phase 5: 테스트 업데이트
  - [x] `fbx-pipeline.test.ts` → `gltf-pipeline.test.ts`
  - [x] `avatar.test.ts` 정리 (`isTextureValid` 블록, safety net fallback 테스트 제거)
- [ ] Phase 6: 문서 업데이트 — `README.md`, `ARCHITECTURE.md` (선택, 미완료)
- [ ] 통합 테스트: `npm run dev`로 아바타 정상 렌더링 확인
- [ ] PBR 재질 표현 검증 (`enhanceMaterial` 값 튜닝) — GLB 로딩 후 확인 필요

### 남은 작업
1. `npm run dev`로 아바타 정상 렌더링 확인
2. PBR 재질 표현 검증 및 `enhanceMaterial` 값 튜닝
3. 문서 업데이트 (선택)
