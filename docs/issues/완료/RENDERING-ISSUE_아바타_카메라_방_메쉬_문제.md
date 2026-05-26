# Issue: Rendering Problems - Avatar Size, Camera Distance, Room Mesh

**Date:** 2026-05-24
**Priority:** High
**Status:** Completed
**Component:** Renderer / Scene Setup / Avatar System

## Description

현재 렌더링 화면에서 다음과 같은 문제들이 관찰됨:

1. **아바타 크기 문제**: 아바타가 예상보다 너무 크게 렌더링되고 있음
2. **카메라 거리 문제**: 카메라가 아바타에 너무 가까이 위치함
3. **방 메쉬 렌더링 문제**: 방 메쉬가 하얗게 나오고 렌더링 오류가 있음
4. **메쉬 식별 문제**: 검은 기둥들은 아바타의 다리로 추정되며, 하얀 부분은 방 메쉬로 추정됨

## 문제 현상

![렌더링 문제 이미지](문제이미지링크)

- 검은색 수직 기둥: 아바타의 다리로 추정 (비정상적으로 크고 왜곡됨)
- 하얀색 부분: 방 메쉬로 추정되나 텍스처/재질이 적용되지 않음
- 카메라가 너무 가까이 위치하여 전체적인 비율이 맞지 않음

## Investigation Notes

### Code Flow

1. **`src/renderer/scene/index.ts`** - Scene 및 카메라 설정
   - 카메라 위치: `(0, 1.2, 3.5)` looking at `(0, 0.3, 0)`
   - 카메라 frustum 설정이 아바타 크기와 맞지 않음

2. **`src/renderer/avatar/index.ts`** - Avatar 로딩
   - FBX 모델 스케일: 현재 `1.0`으로 설정됨 (AVATAR-INVISIBLE 이슈 수정 후)
   - 아바타 위치: `(0, 0, 0.5)`

3. **`src/renderer/room/index.ts`** - Room 메쉬 로딩
   - 방 메쉬 재질/텍스처 설정 확인 필요
   - 조명 설정 확인 필요

### Potential Issues Identified

1. **아바타 스케일 문제**:
   - 현재 스케일 `1.0`이 실제 환경에 비해 너무 큼
   - FBX 모델의 원본 단위 확인 필요 (미터 vs 센티미터)

2. **카메라 설정 문제**:
   - 카메라 위치가 아바타에 너무 가까움
   - 카메라 frustum 설정이 아바타 크기와 맞지 않음

3. **방 메쉬 렌더링 문제**:
   - 재질/텍스처가 적용되지 않음 (하얀색으로 보임)
   - 조명 설정이 적절하지 않음
   - 메쉬 로딩 실패 가능성

4. **씬 구성 문제**:
   - 아바타와 방 메쉬의 상대적 크기/위치가 맞지 않음
   - 카메라 앵글이 적절하지 않음

## Debugging Steps

1. **아바타 스케일 조정**:
   - 현재 스케일 `1.0`에서 `0.1` 또는 `0.05`로 조정 테스트
   - FBX 모델의 실제 크기 확인 (Blender 등에서)

2. **카메라 설정 조정**:
   - 카메라 위치 변경: `(0, 1.2, 5.0)` 또는 더 먼 위치로 테스트
   - 카메라 frustum 설정 확인 (near/far plane)

3. **방 메쉬 재질 확인**:
   - 재질/텍스처 로딩 확인
   - 기본 재질 적용 테스트 (MeshBasicMaterial 등)
   - 조명 설정 확인 (AmbientLight, DirectionalLight)

4. **씬 구성 확인**:
   - 아바타와 방 메쉬의 상대적 위치 확인
   - 카메라 앵글 조정 (lookAt 위치 변경)

## Files to Check

- `src/renderer/scene/index.ts` - 카메라 및 씬 설정
- `src/renderer/avatar/index.ts` - 아바타 로딩 및 스케일
- `src/renderer/room/index.ts` - 방 메쉬 로딩 및 재질
- `src/renderer/index.ts` - 초기화 및 씬 구성
- `assets/models/noah.fbx` - 아바타 모델 파일
- `assets/rooms/` - 방 메쉬 파일들

## Related Issues

- [AVATAR-INVISIBLE](완료/AVATAR-INVISIBLE.md) - 아바타 스케일 수정 이력
- [Stage4_Renderer_Scene_Setup](docs/features/Stage4_Renderer_Scene_Setup.md) - 렌더러 초기 설정 문서

## Annotation for Next Agent

**Debugging hints:**

1. **아바타 스케일 테스트**:
   - `src/renderer/avatar/index.ts`에서 스케일 값을 `0.1`로 변경 후 테스트
   - FBX 모델의 실제 크기 확인 (Blender에서 UnitScaleFactor 확인)

2. **카메라 위치 테스트**:
   - `src/renderer/scene/index.ts`에서 카메라 위치 변경: `(0, 1.2, 5.0)`
   - lookAt 위치 조정: `(0, 0.5, 0)`으로 변경 테스트

3. **방 메쉬 재질 테스트**:
   - `src/renderer/room/index.ts`에서 기본 재질 적용:
     ```typescript
     const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
     ```
   - 조명 추가 테스트 (AmbientLight, DirectionalLight)

4. **콘솔 로그 확인**:
   - 아바타 로딩 로그: `[Avatar] FBX avatar loaded successfully`
   - 방 메쉬 로딩 로그: `[Room] Room meshes loaded`
   - 카메라 설정 로그 추가

5. **씬 구성 확인**:
   - 아바타와 방 메쉬의 상대적 크기 확인
   - 카메라 frustum 설정 확인 (near/far plane)