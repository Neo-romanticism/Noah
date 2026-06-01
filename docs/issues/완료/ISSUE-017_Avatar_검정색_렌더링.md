# ISSUE-017: Avatar 검정색 렌더링

> **Status**: ✅ 완료  
> **발견일**: 2026-05-28  
> **해결일**: 2026-06-01  
> **관련 스테이지**: 5a (FBX Loading System)  
> **심각도**: 🔴 High → 🟢 Resolved

---

## 증상

`noah.fbx` 로딩 후 아바타가 **검정색으로 렌더링**됨.  
Material enhancement (`fixMaterial` → `enhanceMaterial`)이 적용되었음에도 불구하고 색상이 제대로 표시되지 않음.

### 시각적 설명
- 아바타 전체가 검정색으로 나타남
- 방(floor, walls)은 정상적으로 보임
- lighting은 정상 작동 중 (방이 밝게 보임)
- 아바타만 유독 검정색

---

## 재현 방법

1. `npm run dev` 또는 빌드 후 실행
2. 콘솔 로그 확인: `[Avatar] FBX loaded successfully`
3. 아바타가 검정색으로 표시됨

---

## 최종 원인 분석

### 원인 1: FBX 파일에 텍스처 데이터 미내장
`noah.fbx` (2.4MB)는 VRM → FBX 변환 시 텍스처 이미지 데이터를 **내장(embed)하지 않음**. FBX는 `textures/_10.png` 등의 외부 파일 참조만 포함.

**확인 방법**: `strings assets/models/noah.fbx | grep -c "PNG\|IHDR\|IDAT"` → 결과 0 (PNG 데이터 없음)

### 원인 2: FBXLoader texture→Video 연결 파싱 실패
FBXLoader의 `loadTexture()`에서 `connections.get(textureNode.id).children`이 비어있거나 `images[children[0].ID]`가 `undefined`여서 `fileName`이 undefined가 됨.

결과: `return new Texture()` — **이미지 데이터가 없는 placeholder 텍스처** 생성됨.
- `texture.name = "base_color_texture"` (FBX 노드 attrName)
- `texture.image = undefined` (이미지 없음)

**콘솔 로그**:
```
[Avatar] Hair: texture INVALID (name="base_color_texture" src="")
```

### 원인 3: GPU 검정색 샘플링
- 텍스처 객체는 존재하나 이미지 데이터가 없음
- GPU가 빈 텍스처를 검정(0,0,0)으로 샘플링
- `MeshPhysicalMaterial` 공식: `map`(검정) × `color`(#ffffff) = **검정색**

### 원인 4 (시도했으나 실패): Three.js TextureLoader crossOrigin
FBXLoader 내부 `TextureLoader`가 기본값 `crossOrigin='anonymous'`로 설정됨.
Electron `file://` 프로토콜에서는 CORS를 지원하지 않아 이미지 로딩 실패.
→ `Image` 객체 직접 생성(crossOrigin 미설정)으로 우회 시도했으나, FBXLoader가 placeholder를 반환하는 근본 문제는 해결되지 않음.

---

## 해결 방법

### 접근법: VRM 매핑 기반 직접 텍스처 로딩

FBXLoader의 텍스처 로딩을 완전히 우회하고, VRM JSON에서 추출한 정확한 텍스처 매핑 정보를 하드코딩하여 직접 로딩.

#### 1. VRM 텍스처 추출 ([`scripts/extract-vrm-textures.mjs`](/scripts/extract-vrm-textures.mjs))
- `Noah3.vrm` (16.6MB, GLB 형식) 파싱
- JSON 청크에서 `images[]` 배열 읽기
- BIN 청크에서 각 이미지 데이터 추출
- 26개 PNG 파일을 `assets/models/textures/`에 저장

#### 2. VRM 메시-텍스처 매핑 분석 ([`scripts/inspect-vrm-materials.mjs`](/scripts/inspect-vrm-materials.mjs))

VRM JSON 분석 결과:
```json
Mesh[0] "Face (merged)": 8 primitives
  Mat 0: FaceMouth   → tex _01.png (nrm: Shader_NoneNormal)
  Mat 1: EyeIris     → tex _02.png (nrm: Shader_NoneNormal)
  Mat 2: EyeHighlight → tex _03.png (nrm: Shader_NoneNormal)
  Mat 3: Face_SKIN   → tex _04.png (nrm: _05.png)
  Mat 4: EyeWhite    → tex _06.png (nrm: Shader_NoneNormal)
  Mat 5: FaceBrow    → tex _07.png (nrm: Shader_NoneNormal)
  Mat 6: FaceEyelash → tex _08.png (nrm: Shader_NoneNormal)
  Mat 7: FaceEyeline → tex _09.png (nrm: Shader_NoneNormal)

Mesh[1] "Body (merged)": 7 primitives
  Mat 0: Body_SKIN    → tex _10.png (nrm: _11.png)
  Mat 1: HairBack     → tex _12.png (nrm: N00_000_00_HairBack_00_nml)
  Mat 2: Bottoms      → tex _13.png (nrm: Shader_NoneNormal)
  Mat 3: Tops         → tex _14.png (nrm: Shader_NoneNormal)
  Mat 4: Shoes_01     → tex _15.png (nrm: Shader_NoneNormal)
  Mat 5: Shoes_02     → tex _16.png (nrm: Shader_NoneNormal)
  Mat 6: Onepiece     → tex _17.png (nrm: Shader_NoneNormal)

Mesh[2] "Hair001 (merged)": 1 primitive
  Mat 0: Hair         → tex _18.png (nrm: N00_000_Hair_00_nml_01)
```

#### 3. 직접 텍스처 로딩 구현 ([`src/renderer/avatar.ts`](/src/renderer/avatar.ts))

| 함수 | 역할 |
|------|------|
| [`VRM_TEXTURE_MAP`](src/renderer/avatar.ts:469) | 하드코딩된 메시→텍스처 매핑 테이블 |
| [`loadTextureDirect()`](src/renderer/avatar.ts:440) | `new Image()`로 직접 로딩 (crossOrigin 없음 → file:// 호환) |
| [`resolveMeshBaseName()`](src/renderer/avatar.ts:523) | FBX 메시명에서 매핑 키 추출 ("Hair001" → "Hair") |
| [`reloadFailedTextures()`](src/renderer/avatar.ts:535) | 매핑 기반 텍스처 로딩 및 material 적용 |

#### 4. Material 처리 파이프라인

```
FBXLoader 파싱 → MeshPhongMaterial (color=#ffffff, map=placeholder)
  → fixMaterial()
    → texture INVALID 감지 → map=null → fallback 색상 적용
    → enhanceMaterial()
      → MeshPhysicalMaterial 생성 (userData 보존)
  → reloadFailedTextures() [비동기]
    → VRM_TEXTURE_MAP[메시명][프리미티브인덱스] → 파일명 조회
    → loadTextureDirect("./textures/_04.png")
    → 성공: mat.map = texture, mat.color = #ffffff
    → 실패: fallback 색상 유지
```

---

## 적용된 코드 변경사항

### 신규 파일

| 파일 | 설명 |
|------|------|
| [`scripts/extract-vrm-textures.mjs`](/scripts/extract-vrm-textures.mjs) | VRM(GLB)에서 26개 PNG 텍스처 추출 |
| [`scripts/inspect-vrm-materials.mjs`](/scripts/inspect-vrm-materials.mjs) | VRM material 매핑 분석 도구 |

### 수정된 파일

| 파일 | 변경 |
|------|------|
| [`src/renderer/avatar.ts`](/src/renderer/avatar.ts) | `isTextureValid()`, `getFallbackColor()`, `loadTextureDirect()`, `VRM_TEXTURE_MAP`, `reloadFailedTextures()`, `enhanceMaterial()` userData 보존 |
| [`package.json`](/package.json) | `copy-assets`에 `textures/*.png` 복사 추가 |

---

## 실행 방법

```bash
# 1. VRM 텍스처 추출 (최초 1회, 또는 VRM 변경 시)
node scripts/extract-vrm-textures.mjs

# 2. 빌드 (텍스처 자동 복사)
npm run build

# 3. 실행
npm start
```

---

## 테스트 결과

- **전체 테스트**: 378/378 통과 (20 suites)
- **Avatar 테스트**: 32/32 통과
- **신규 테스트**: `isTextureValid` 8개, `getFallbackColor` 3개, fallback 통합 3개
- **TypeScript 컴파일**: ✅
- **npm run build**: ✅

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `src/renderer/avatar.ts` | 모든 avatar material/텍스처 처리 로직 |
| `src/renderer/lighting.ts` | 씬 lighting (ambient 0.8, directional 1.5) |
| `src/renderer/scene.ts` | renderer tone mapping (ACESFilmicToneMapping) |
| `scripts/blender/import_vrm_clean.py` | VRM import & FBX export |
| `scripts/extract-vrm-textures.mjs` | VRM 텍스처 추출 |
| `node_modules/three/examples/jsm/loaders/FBXLoader.js` | Three.js FBXLoader (수정 불가) |

---

## 남은 문제 / 향후 개선

- [ ] FBX 파일을 텍스처가 내장된 형태로 다시 익스포트 (Blender FBX export 설정 최적화)
- [ ] Three.js GLTFLoader로 VRM 직접 로딩 고려 (FBXLoader 우회)
- [ ] 텍스처 로딩 상태에 따른 프로그레스 피드백
- [ ] WebGL 컨텍스트 손실 시 텍스처 복구

---

## 참고 자료

- Three.js FBXLoader: `node_modules/three/examples/jsm/loaders/FBXLoader.js` (line 240-488)
- Three.js ImageLoader crossOrigin: `node_modules/three/src/loaders/ImageLoader.js`
- VRM → FBX 파이프라인: `scripts/blender/import_vrm_clean.py`
- Electron webSecurity: https://www.electronjs.org/docs/latest/tutorial/security
