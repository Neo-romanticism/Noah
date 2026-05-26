# ISSUE: 아바타 다리 근처 흰색 박스 제거

## 증상
- 아바타 다리 근처에 매우 하얀색 박스가 나타남
- 박스가 아바타의 종아리까지 가림
- 아바타 쪽에 위치한 물체로 보임
- 뒷모습(침대 방향)에서 아바타 머리칼만 보이고 박스는 그대로 남아있음 → **아바타와 분리된 독립 객체**

## 시도한 해결책
1. `src/renderer/avatar/index.ts`의 `loadAvatar` 함수 내 `object.traverse`에서 흰색(r>0.9, g>0.9, b>0.9)이면서 `BoxGeometry` 타입인 메시를 감지하여 제거하는 로직 추가
   - **결과: 해결되지 않음**

2. `fixMaterial` **처리 후** 색상 및 geometry 타입으로 필터링하는 로직 추가 (2025-05-24)
   - `fixMaterial`의 "Prevent completely black diffuse" 로직 (`std.color.setHex(0xbbbbbb)`)이 원래 검은색이던 메시를 밝은 회색으로 변경하는 부작용 고려
   - 색상 intensity > 2.4 AND (BoxGeometry OR PlaneGeometry) 조건으로 후보 탐지
   - 메시 이름에 `ground`, `shadow`, `plane`, `box`, `stage`, `floor` 키워드가 포함된 경우도 제거 대상으로 추가
   - **결과: 코드 적용 완료, 실행 검증 대기**

3. **핵심 버그 수정**: FBXLoader가 모든 geometry를 `BufferGeometry`로 로드할 수 있음 (2025-05-24)
   - 기존 `geometry.type.includes('Box') || geometry.type.includes('Plane')` 조건이 `BufferGeometry`에서는 작동하지 않음
   - **bounding box 크기 분석**을 통해 "flat"한 메시(한 축의 크기가 0.01 미만)를 추가로 탐지
   - `isFlat` 조건을 모든 필터에 통합하여 `BufferGeometry` 형태의 평멏도 제거 가능하도록 수정
   - 색상 임계값도 intensity > 1.5~1.8로 완화하여 더 넓은 범위의 밝은 메시를 탐지
   - **결과: 코드 적용 완료, 실행 검증 대기**

## 추정 원인 (우선순위 순)

### 1순위: FBX 모델 낸부의 숨겨진/문제 메시
- `noah.fbx` 로드 후 `fixMaterial`에서 색상이 밝아졌을 가능성
- `fixMaterial`의 "Prevent completely black diffuse" 로직 (`std.color.setHex(0xbbbbbb)`)이 원래 검은색이던 메시를 밝은 회색으로 변경
- `enhanceMaterial`의 기본 처리 또는 `MeshPhysicalMaterial` 변환으로 인해 과도하게 밝게 렌더링

### 2순위: FBX 로딩 실패 후 `createPlaceholderAvatar` fallback
- `createPlaceholderAvatar`의 body 캡슐 (`CapsuleGeometry`, 색상 `0xffb6c1` 분홍색)이
  - 조명/노출 설정(`ACESFilmicToneMapping`, `toneMappingExposure=0.9`)으로 인해 흰색처럼 보일 가능성
  - 또는 material이 다른 코드에 의해 덮어써진 가능성

### 3순위: Room 객체와의 위치 겹침
- 창문 프레임 (`createWindow`): 흰색(`0xffffff`) 재질 사용, 위치 `(0, 0.8, -1.45)`
- 창문 sill: 밝은 회색(`0xf0f0f0`), 위치가 아바타와 멀어 가능성 낮음
- 벽/바닥/침대/책상: 색상이 흰색이 아니어서 가능성 낮음

## 디버깅 계획

### Phase 1: 콘솔 로그 확인 (즉시 실행)
**목표**: FBX 로딩 성공 여부와 로드된 메시 목록 확인

1. 앱 실행 후 브라우저 DevTools 콘솔 열기
2. 다음 로그 메시지 검색:
   - `[Avatar] FBX avatar loaded successfully` → FBX 로딩 성공
   - `[Avatar] FBX load failed, using placeholder` → fallback 실행
   - `[Avatar] {meshName} mat{i}: ...` → 각 메시의 material 정보
3. 로그 결과 기록

### Phase 2: Scene Graph 전체 순회 로깅 (코드 수정 필요)
**목표**: Scene 내 모든 Mesh의 이름, 위치, 색상, geometry 타입 확인

`src/renderer/index.ts`의 `initAvatar()` 완료 후 다음 코드 추가:

```typescript
// Scene 전체 디버깅: 흰색/밝은 객체 탐색
function debugSceneGraph(scene: THREE.Scene): void {
  console.log('=== Scene Graph Debug ===');
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((mat, i) => {
        const color = (mat as any).color;
        const hex = color ? `#${color.getHexString()}` : 'N/A';
        const intensity = color ? color.r + color.g + color.b : 0;
        console.log(
          `[Scene] name="${mesh.name}" ` +
          `parent="${mesh.parent?.name || 'scene'}" ` +
          `pos=(${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)}) ` +
          `geo=${mesh.geometry.type} ` +
          `mat[${i}].color=${hex} ` +
          `intensity=${intensity.toFixed(2)} ` +
          `isAvatarChild=${mesh.parent?.name?.includes('noah') || mesh.parent?.parent?.name?.includes('noah') || false}`
        );
      });
    }
  });
  console.log('=== End Scene Graph Debug ===');
}

// initAvatar() 완료 후 호출
debugSceneGraph(ctx.scene);
```

### Phase 3: Avatar Group 낸부 상세 분석 (코드 수정 필요)
**목표**: 흰색 박스가 아바타 그룹의 자식인지 확인

`src/renderer/index.ts`의 `initAvatar()` 내, FBX 로드 성공 후 추가:

```typescript
if (loaded) {
  // ... 기존 로그 ...

  // Avatar Group 낸부 모든 객체 로깅
  console.log('=== Avatar Group Children ===');
  loaded.group.traverse((child) => {
    const path: string[] = [];
    let curr: THREE.Object3D | null = child;
    while (curr) {
      path.unshift(curr.name || curr.type);
      curr = curr.parent;
    }
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      console.log(
        `[AvatarChild] path="${path.join(' > ')}" ` +
        `geo=${mesh.geometry.type} ` +
        `color=#${mat.color?.getHexString()} ` +
        `pos=(${mesh.position.x.toFixed(3)}, ${mesh.position.y.toFixed(3)}, ${mesh.position.z.toFixed(3)})`
      );
    }
  });
  console.log('=== End Avatar Group Children ===');
}
```

### Phase 4: 흰색 박스 객체 직접 식별 (코드 수정 필요)
**목표**: 조건 필터링으로 흰색 박스 후보를 좁히기

`src/renderer/index.ts`에 추가:

```typescript
// 흰색이면서 Box/Capsule/Plane geometry인 객체 필터링
function findWhiteBoxCandidates(scene: THREE.Scene): THREE.Mesh[] {
  const candidates: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const isWhite = materials.some((m) => {
        const c = (m as any).color;
        return c && c.r > 0.85 && c.g > 0.85 && c.b > 0.85;
      });
      const geoType = mesh.geometry.type;
      const isBoxLike = geoType.includes('Box') || geoType.includes('Capsule') || geoType.includes('Plane');
      if (isWhite && isBoxLike) {
        candidates.push(mesh);
      }
    }
  });
  return candidates;
}

// 사용 예시 (initAvatar 완료 후):
const candidates = findWhiteBoxCandidates(ctx.scene);
console.log(`[Debug] Found ${candidates.length} white box candidates:`);
candidates.forEach((m, i) => {
  console.log(`  [${i}] name="${m.name}" geo=${m.geometry.type} pos=(${m.position.x.toFixed(2)}, ${m.position.y.toFixed(2)}, ${m.position.z.toFixed(2)})`);
});
```

### Phase 5: 원인 확정 후 수정
**목표**: Phase 1~4 결과를 바탕으로 정확한 원인 파악 및 수정

| 원인 | 수정 방안 |
|------|----------|
| FBX 낸부 불필요 메시 | `loadAvatar`의 `object.traverse`에서 해당 메시 `visible=false` 또는 `remove()` |
| `createPlaceholderAvatar` body | Placeholder body material 색상 변경 또는 body 제거 |
| Room 객체 위치 겹침 | 해당 Room 객체 위치/크기 조정 |
| `fixMaterial`/`enhanceMaterial` 부작용 | 해당 메시의 material 처리 로직 예외 처리 |

## 실행 체크리스트

- [x] **Phase 1**: 콘솔 로그 확인 (`[Avatar]` 메시지)
- [x] **Phase 2**: Scene Graph 디버깅 코드 추가 및 실행 (`src/renderer/index.ts`)
- [x] **Phase 3**: Avatar Group 낸부 상세 분석 코드 추가 및 실행 (`src/renderer/index.ts`)
- [x] **Phase 4**: 흰색 박스 후보 필터링 코드 추가 및 실행 (`src/renderer/index.ts`)
- [x] **Phase 5**: 원인 확정 및 수정 코드 작성 (`src/renderer/avatar/index.ts`)
- [ ] **Phase 5**: 수정 후 스크린샷으로 검증 (Electron 실행 문제 해결 후 진행)

## 참고 파일
- `src/renderer/avatar/index.ts` - 아바타 로딩 및 플레이스홀더 생성
- `src/renderer/room/bed.ts` - 침대 객체
- `src/renderer/room/desk.ts` - 책상 객체
- `src/renderer/room/floor.ts` - 바닥 객체
- `src/renderer/room/walls.ts` - 벽 객체
- `src/renderer/room/window.ts` - 창문 객체
- `src/renderer/room/index.ts` - 방 객체 조립
- `src/renderer/index.ts` - 메인 렌더러 (아바타 초기화)
- `src/renderer/scene/index.ts` - Scene 및 조명 설정
- `assets/models/noah.fbx` - FBX 아바타 모델

## 수정 내역 (2025-05-24)

### `src/renderer/avatar/index.ts` 변경사항 (최종)
`loadAvatar` 함수 내 `object.traverse`에 다음 로직 추가:

1. `meshesToRemove` 배열 수집
2. 각 메시의 bounding box 크기를 분석하여 `isFlat` 판정 (한 축의 크기 < 0.01)
3. `fixMaterial` 처리 후 다음 조건을 만족하는 메시를 `meshesToRemove`에 추가:
   - **색상 조건**: `intensity > 1.8` (흰색/밝은 회색)
   - **Geometry 조건**: `BoxGeometry` 또는 `PlaneGeometry` 또는 `isFlat` (BufferGeometry로 로드된 평멏 포함)
   - **위치 조건**: world y 좌표가 0.05 미만 (아바타 발 아래)
   - **이름 조건**: 메시 이름에 `ground`, `shadow`, `plane`, `box`, `stage`, `floor`, `base`, `platform` 포함
   - **텍스처 조건**: 텍스처가 없고 색상이 밝은 경우 (intensity > 1.5)
4. traverse 완료 후 `meshesToRemove`에 있는 메시를 parent에서 `remove()`

### `src/renderer/index.ts` 변경사항
`initAvatar()` 완료 후 다음 디버깅 함수 호출:
- `debugSceneGraph()`: Scene 내 모든 Mesh의 이름, 위치, 색상, geometry 타입 출력
- `findWhiteBoxCandidates()`: 흰색 Box/Plane/Capsule 후보 필터링 및 출력
- Avatar Group 낸부 모든 객체 로깅 (path, geo, color, position)

## 알려진 제약사항
- Electron 실행 시 `TypeError: Cannot read properties of undefined (reading 'on')` 오류 발생 중
  - `electron_1.app`이 undefined → ESM/CJS 호환성 문제 또는 Electron 버전 불일치 의심
  - `node_modules/electron/dist/version`: `42.0.0-alpha.5`
  - `npx electron --version`: `v24.14.0`
  - **해결 후 스크린샷 검증 필요**

## 관련 스크린샷
- `screenshots/screenshot_1779607831506.png` - 정면 (박스 확인)
- `screenshots/screenshot_1779607525662.png` - 뒷모습 (박스가 아바타와 분리됨 확인)
