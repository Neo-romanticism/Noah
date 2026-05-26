# Issue: RENDERING-002 — Room Meshes Render Pure White (Avatar OK)

**Date:** 2026-05-24
**Priority:** High
**Status:** Completed
**Component:** Renderer / Scene Setup / Room Materials

## Summary

아바타는 정상(회색, 명암 있음)으로 렌더링되나, **모든 방 메쉬(벽, 바닥, 침대, 책상)가 순백색으로 렌더링**됨.  
빌드 직후 잠시 정상 색상으로 보이다가 즉시 하얗게 변함.  
`MeshStandardMaterial` 색상/조명/톤매핑 변경에도 변화 없음.

## Current Visual State

- **아바타**: 회색 T-포즈, 명암 정상 ✅
- **벽/바닥/가구**: 순백색 (색상 정보 소실) ❌
- **배경(skyPlane)**: 하늘색 정상 ✅
- **Metrics UI**: 초록/볼록/회색 정상 ✅

## Key Observation

아바타와 방 메쉬 모두 `MeshStandardMaterial`을 사용하나,  
**아바타만 정상이고 방 메쉬만 하얗게 보임.**

→ 아바타는 `fixMaterial()`에서 `color.setHex(0x888888)`로 강제 설정됨.  
→ 방 메쉬는 코드상 `color: 0xa09078` 등으로 설정되었으나 실제로는 흰색으로 출력됨.

## Changes Already Tried (No Effect)

| 변경 항목 | Before | After | 결과 |
|-----------|--------|-------|------|
| 아바타 스케일 | 1.0 | 0.3 | 크기 정상화됨 |
| 침대 위치 | (0, 1.6, 3.5) | (0, 1.4, 4.5) | 거리 정상화됨 |
| 방 메쉬 y 위치 | -0.5 | 0 | 위치 정상화됨 |
| 벽/바닥 `DoubleSide` | 추가 | 제거 | 변화 없음 |
| 조명 강도 | Ambient 0.5 / Key 0.8 | Ambient 0.25 / Key 0.5 | 변화 없음 |
| 방 메쉬 색상 | 원본 밝은 색 | 어두운 색 (0xa09078 등) | 변화 없음 |
| Tone Mapping | 없음 | ACESFilmic | 변화 없음 |
| 아바타 재질 fix | 없음 | `fixMaterial()` 추가 | 아바타 정상화됨 |
| 배경 평면 위치 | z: -2 (20×20) | z: -20 (200×200) | 배경 정상화됨 |

## Hypotheses to Investigate

### H1: `MeshStandardMaterial` 자체가 방 메쉬에서는 작동하지 않음
- **Test**: 방 메쉬를 `MeshBasicMaterial`로 임시 교체
- **Expected**: `MeshBasicMaterial`이면 조명 무관하게 지정한 색상 그대로 출력됨
- **If passes**: `MeshStandardMaterial`의 조명/색상 계산에 문제가 있음
- **If fails**: 재질 타입과 무관한 다른 원인 (geometry, renderer 설정 등)

### H2: Three.js Color Management / ColorSpace 문제
- **Context**: Three.js r152+부터 `outputColorSpace` 기본값이 `SRGBColorSpace`
- **Test**: `renderer.outputColorSpace = THREE.SRGBColorSpace` 명시적 설정
- **Also test**: `renderer.outputColorSpace = THREE.LinearSRGBColorSpace`

### H3: 방 메쉬의 geometry normal 문제
- **Context**: `PlaneGeometry`의 normal 방향이 조명 계산에 영향
- **Test**: `geometry.computeVertexNormals()` 강제 호출
- **Also test**: `mesh.geometry = mesh.geometry.clone()` 후 normal 재계산

### H4: Renderer 초기화 시점 문제
- **Context**: `alpha: true` + `scene.background = null` (투명 오버레이)
- **Test**: `scene.background = new THREE.Color(0x000000)` 설정 (투명 해제)
- **Also test**: `renderer.alpha = false`로 변경

### H5: FBX 모델 로딩이 씬 전체에 영향
- **Context**: `loadAvatar` 낶에서 `scene.add(object)` 호출
- **Test**: 아바타 로딩을 완전히 제거하고 방 메쉬만 렌더링
- **If passes**: FBX 모델이 씬의 global state를 오염시킴
- **If fails**: 아바타와 무관한 원인

## Files Modified in This Session

- `src/renderer/index.ts` — 아바타 스케일 0.3, 로깅 추가
- `src/renderer/scene/index.ts` — 침대 위치, 톤매핑, 조명 강도
- `src/renderer/avatar/index.ts` — `fixMaterial()` 추가
- `src/renderer/room/index.ts` — y 위치 0으로 조정
- `src/renderer/room/walls.ts` — 색상, `DoubleSide` 추가 후 제거
- `src/renderer/room/floor.ts` — 색상, `DoubleSide` 추가 후 제거
- `src/renderer/room/bed.ts` — 색상 어둡게
- `src/renderer/room/desk.ts` — 색상 어둡게
- `src/renderer/ui/metrics.ts` — 배경 평면 위치/크기

## Next Recommended Steps

1. **H1 테스트**: `walls.ts`, `floor.ts`를 `MeshBasicMaterial`로 임시 변경 → 빌드 → 확인
2. **H5 테스트**: `renderer/index.ts`에서 `initAvatar()` 호출 주석 처리 → 빌드 → 확인
3. 둘 중 하나라도 변화가 있으면 해당 방향으로 깊이 파고듦
4. 둘 다 변화 없으면 H2/H3/H4 순으로 테스트

## Resolution

1. **Renderer 초기화 수정**: `alpha: false` 및 `sRGBColorSpace` 명시적 설정으로 화이트아웃 방지.
2. **조명 강도 최적화**: Ambient(0.4), Directional(0.8)로 어두웠던 방 밝기 개선.
3. **재질 복구**: `MeshStandardMaterial`로 복구하여 정상적인 조명 반응 확보.
4. **Vertex Normals**: 모든 geometry에 `computeVertexNormals()` 적용하여 쉐이딩 정확도 향상.

## Related

- [AVATAR-INVISIBLE](../완료/AVATAR-INVISIBLE.md) — 아바타 스케일 이력
- [RENDERING-ISSUE_아바타_침대_방_메쉬_문제.md](RENDERING-ISSUE_아바타_침대_방_메쉬_문제.md) — 초기 이슈 (아바타/침대/방 메쉬 종합)
