# ISSUE-017: Avatar 검정색 렌더링

> **Status**: 🔍 진행중  
> **발견일**: 2026-05-28  
> **관련 스테이지**: 5a (FBX Loading System)  
> **심각도**: 🔴 High — 아바타가 보이지 않음

---

## 증상

`noah.fbx` 로딩 후 아바타가 **검정색으로 렌더링**됨.  
Material enhancement (`fixMaterial` → `enhanceMaterial`)이 적용되었음에도 불구하고 색상이 제대로 표시되지 않음.

### 스크린샷/비주얼 설명
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

## 원인 분석 (단계별)

### Step 1: FBX 원본 확인 ✅
Blender에서 VRM import 후 material 색상 확인 결과:
- **본체 material (Face, Body, Hair 등)**: 정상 색상 (피부색, 머리색 등)
- **MToon Outline material**: 검정색 (0.06, 0.009, 0.014) — 이것은 **외곽선용**이며 본체와 별도

**결론**: `.blend` 원본은 정상. 문제는 export 또는 Three.js 로딩 과정.

### Step 2: FBX Export 설정 확인 ✅
Blender FBX export 설정:
- `global_scale=1.0`
- `apply_unit_scale=True`
- `apply_scale_options='FBX_SCALE_UNITS'`
- `axis_forward='-Z', axis_up='Y'`

**의심**: `apply_scale_options='FBX_SCALE_UNITS'` + `apply_unit_scale=True` 조합이 Three.js FBXLoader와 호환되지 않을 수 있음. 이 설정은 FBX 파일 내에 UnitScaleFactor를 100 (cm) 또는 1 (m)로 기록하는데, Three.js는 이를 다르게 해석할 수 있음.

### Step 3: Three.js FBXLoader 파싱 확인 ⏳
FBXLoader가 material을 파싱할 때:
- `MaterialColor` (Diffuse) 값을 제대로 읽는지?
- `UnitScaleFactor`를 제대로 해석하는지?
- Texture가 없을 때 기본 색상을 어떻게 처리하는지?

**디버깅 필요**: `loader.load()` 콜백에서 `object.traverse()`로 각 mesh의 `material.color`를 로그로 출력.

### Step 4: `fixMaterial`/`enhanceMaterial` 영향 확인 ⏳
현재 코드 흐름:
```
FBXLoader 파싱 → MeshStandardMaterial (color=???)
  → fixMaterial()
    → color 보정 (검정이면 0xbbbbbb)
    → colorSpace 설정
    → enhanceMaterial()
      → MeshPhysicalMaterial 생성
        → category별 preset 적용 (skin/hair/eye...)
```

**의심 지점**:
1. `fixMaterial`에서 `std.map`이 존재하면 color 보정을 스킵함. 하지만 texture가 검정색이거나 로드 실패 시 문제.
2. `enhanceMaterial`에서 `p.color = mat.color.clone()`으로 복사하지만, `mat.color` 자체가 이미 검정색일 수 있음.
3. `MeshPhysicalMaterial`로 변환 후 `colorSpace`가 `SRGBColorSpace`로 설정되지 않을 수 있음.

### Step 5: Lighting + Environment Map ⏳
`MeshPhysicalMaterial`은 다음에 민감:
- `envMap`: 없으면 `clearcoat`, `sheen`, `transmission`이 제대로 표현되지 않음
- `ambientIntensity`: 너무 낮으면 전체적으로 어두워 보임
- `directionalLight.position`: 아바타를 비추는 각도

현재 씬:
- AmbientLight(0.3)
- DirectionalLight(1.2) — 위치 확인 필요
- envMap: 없음

---

## 디버깅 계획

### Phase A: FBXLoader 원본 확인
- [ ] `loadAvatar`에서 `fixMaterial` 적용 전 `mesh.material.color` 로그 출력
- [ ] `mesh.material.map` 존재 여부 확인
- [ ] `mesh.material.type` 확인 (MeshStandardMaterial? MeshPhongMaterial?)

### Phase B: `fixMaterial` 단계별 확인
- [ ] `fixMaterial` 진입 전/후 `color.getHexString()` 비교
- [ ] `classifyMaterial` 결과 확인 (skin/hair/eye 등)
- [ ] `enhanceMaterial` 진입 전/후 `color.getHexString()` 비교

### Phase C: Material 타입 비교 테스트
- [ ] `fixMaterial`/`enhanceMaterial` 완전 비활성화 → 원본 material로 렌더링
- [ ] `MeshStandardMaterial` 그대로 사용 (MeshPhysicalMaterial 변환 안 함)
- [ ] `MeshBasicMaterial`로 강제 변환 (lighting 영향 제거)

### Phase D: Lighting 개선
- [ ] DirectionalLight 위치 조정 (아바타를 정면에서 비추도록)
- [ ] AmbientLight intensity 증가 (0.3 → 0.8)
- [ ] 추가 PointLight 추가 (아바타 주변)
- [ ] Environment map 추가 (PMREMGenerator 사용)

---

## 실험 결과 기록

### Experiment 1: `skipMaterialFix=true` (원본 material 사용)
**날짜**: 2026-05-28  
**결과**: (미실시)

### Experiment 2: `MeshStandardMaterial` 강제 사용
**날짜**: 2026-05-28  
**결과**: (미실시)

### Experiment 3: Lighting 개선
**날짜**: 2026-05-28  
**결과**: (미실시)

---

## 임시 해결책 (Quick Fixes)

### Option A: `fixMaterial` 보정 로직 강화
```typescript
// texture 유무와 관계없이 color intensity 체크
const intensity = std.color.r + std.color.g + std.color.b;
if (intensity < 0.05) {
  std.color.setHex(0xbbbbbb);
}
```

### Option B: `enhanceMaterial`에서 color 보정
```typescript
if (p.color && p.color.r + p.color.g + p.color.b < 0.05) {
  p.color.setHex(0xbbbbbb);
}
```

### Option C: Material 타입 fallback
```typescript
// MeshPhysicalMaterial 대신 MeshStandardMaterial 사용
if (problematic) {
  mesh.material = new THREE.MeshStandardMaterial({
    color: 0xffe4c4, // 피부색
    roughness: 0.7,
  });
}
```

### Option D: Lighting 즉시 개선
```typescript
// AmbientLight intensity 증가
const ambient = new THREE.AmbientLight(0xffffff, 0.8);

// DirectionalLight 위치 조정
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(2, 5, 3);
```

---

## 관련 코드

| 파일 | 설명 |
|------|------|
| `src/renderer/avatar.ts` | `fixMaterial()`, `enhanceMaterial()`, `loadAvatar()` |
| `src/renderer/lighting.ts` | 씬 lighting 설정 |
| `src/renderer/scene.ts` | renderer, envMap 설정 |
| `scripts/blender/import_vrm_clean.py` | VRM import & FBX export |

---

## 참고 자료

- Three.js FBXLoader 소스: `node_modules/three/examples/jsm/loaders/FBXLoader.js`
- Three.js MeshPhysicalMaterial 문서: https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial
- Blender FBX export 설정 가이드: https://docs.blender.org/manual/en/latest/addons/import_export/scene_fbx.html
- master 브랜치에서도 동일한 증상이 있었을 가능성 있음 (코드 자체는 master에서 가져옴)
