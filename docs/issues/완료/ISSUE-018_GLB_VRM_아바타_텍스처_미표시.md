# ISSUE-018: GLB/VRM 아바타 텍스처 미표시 (대머리)

## 상태
**✅ 최종 해결** (2026-06-01) — 370 tests 통과, `npm run build` 성공

## 증상
- `noah.glb` 로딩 성공 (`[avatar] GLB loaded`, `[Avatar] VRM loaded successfully`)
- **피부/의상**: 정상 표시 (텍스처 보임)
- **머리카락(Hair), 눈(Eye)**: 텍스처 미표시 (대머리, 눈알 없음)
- 혹은 모든 재질이 검은색/투명으로 보임

## 환경
- Three.js r184
- @pixiv/three-vrm 3.5.3
- GLB 파일: 17MB (Blender VRM Addon export)
- Electron 34.5.8

## 근본 원인 (SINGLE ROOT CAUSE)

**`loadAvatar()`가 VRM plugin의 material을 무조건 덮어씀**

`@pixiv/three-vrm` 3.5.3의 `VRMLoaderPlugin`은 GLB 로딩 시점에 MToon material을 Three.js에서 렌더링 가능한 형태로 완전히 변환한다:
- texture (map, normalMap, emissiveMap, shadeMultiplyTexture, etc.)
- blend mode (OPAQUE/MASK/BLEND → transparent, alphaTest, depthWrite)
- MToon shader (onBeforeCompile으로 custom GLSL injection)
- color space (SRGBColorSpace, LinearSRGBColorSpace)
- ImageBitmap ↔ WebGL texture upload

그런데 `loadAvatar()`가 traverse하면서 `enhanceMaterial()`을 호출해 **모든 material을 새 MeshPhysicalMaterial로 교체**한다. 이 과정에서:

| 항목 | VRM plugin 결과 | enhanceMaterial() 후 |
|------|----------------|---------------------|
| Texture map | ImageBitmap 정상 참조 | Canvas→DataTexture 변환 시도 (flipY, wrap, colorSpace 손실) |
| Alpha/blend | MToon blendMode=BLEND → transparent=true | MeshPhysicalMaterial 기본값 transparent=false |
| Shader | MToon onBeforeCompile | MeshPhysicalMaterial 표준 shader |
| Color space | texture별 정확한 colorSpace | 추측값 (tex.colorSpace \|\| SRGBColorSpace) |
| ImageBitmap | WebGL2 upload 최적화 | Canvas getImageData → Uint8Array → 새 DataTexture |

### 피부/의상이 "되는 것처럼 보인" 이유

RGB 채널의 단순 컬러 텍스처는 DataTexture 변환(flipY, wrap 손실)에도 "비슷하게" 보인다. UV가 단순하고 alpha가 없으면 눈에 띄는 차이가 적음. 머리/눈은 정밀 UV + alpha 채널이 필요한데 metadata 손실로 UV 매핑이 틀어져 완전히 안 보임.

## 해결 방법

**`loadAvatar()`에서 VRM 감지 시 material fix를 완전히 skip한다:**

```typescript
// avatar.ts loadAvatar():
const shouldFixMaterials = !vrm && !config.skipMaterialFix;
```

- `vrm` 객체가 존재하면 (= VRMLoaderPlugin이 material을 처리했으면) material fix를 실행하지 않음
- material fix가 필요한 non-VRM GLTF 모델은 config로 선택 가능

### 제거된 코드 (불필요해짐)

`loadAvatar()`에서 제거된 것들:
- VRM material info 로깅 (불필요한 디버그 노이즈)
- `classifyMaterial()` 호출 (VRM 모델에서는 불필요)
- `enhanceMaterial()` 호출 (VRM plugin이 이미 처리)
- `convertMToonToStandard()` 호출 (VRM plugin이 이미 변환)
- `sortTransparentMeshes()` 호출 (VRM plugin이 이미 정렬)
- `hideOutlineMeshes()` 호출 (outline material 처리 방식 변경과 무관)

### 유지된 코드

- `removeEmbeddedLights()` — 씬의 불필요한 광원 제거
- `removeGroundPlanes()` — 불필요한 지오메트리 제거
- `mesh.castShadow = true / mesh.receiveShadow = true` — 그림자 설정만 추가

## 수정된 파일

| 파일 | 변경 |
|------|------|
| `src/renderer/avatar.ts` | `loadAvatar()`: VRM 감지 시 `shouldFixMaterials = !vrm`. material fix/convert/enhance/logging 모두 조건부 처리 |
| `src/renderer/index.ts` | modelPath `./models/noah.glb` 유지, `skipMaterialFix` 옵션 제거 (기본 동작이 VRM 우회) |

## 검증 (2026-06-01)

```
Test Suites: 20 passed, 20 total
Tests:       370 passed, 370 total
npm run build: 성공 (TypeScript + esbuild)
```

## 배운 점

1. **VRM plugin을 믿어라**: `@pixiv/three-vrm`은 모든 material 변환/렌더링을 알아서 처리한다. 이후 `enhanceMaterial()` 같은 추가 변환은 오히려 VRM의 작업을 파괴한다.
2. **전체가 부분보다 중요**: 피부/의상이 "되는 것처럼 보여도" 그것은 우연일 뿐. pipeline의 일부만 테스트하지 말고 전체 모델 렌더링을 검증해야 한다.
3. **ImageBitmap 호환성**: Three.js r184의 WebGL2는 ImageBitmap을 native하게 지원한다. Canvas→DataTexture 변환은 불필요한 compatibility shim이었다.
