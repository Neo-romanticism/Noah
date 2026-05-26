# Issue: RENDERING-003 — Avatar Renders Pure White

**Date:** 2026-05-24
**Priority:** High
**Status:** Completed
**Component:** Renderer / Avatar Material / Lighting

## Summary

방 메쉬의 화이트아웃 해결 후 아바타가 너무 밝게(Whiteout) 또는 너무 어둡게(Blackout) 렌더링되는 문제를 조명 균형 재조정과 지능형 재질 보정 로직을 통해 최종 해결함.

## Solution

### 1. 조명 및 노출 설정 재조정 (`src/renderer/scene/index.ts`)
- `toneMappingExposure`를 0.9로 설정하여 전반적인 가시성 확보.
- `AmbientLight` (0.4) 및 `DirectionalLight` (Key: 0.75, Fill: 0.3, Rim: 0.3) 강도를 상향하여 '완전한 검정색'으로 보이는 현상 해결.
- ACESFilmic 톤매핑을 유지하여 조명 상향에 따른 과노출 억제.

### 2. 지능형 아바타 재질 보정 및 방어적 렌더링 (`src/renderer/avatar/index.ts`)
- **텍스처 인식 보정**: 텍스처(map)가 존재하는 경우 diffuse 색상을 흰색(0xffffff)으로 보정.
- **가시성 보장**: 텍스처가 없는 경우 최소 밝기(0xbbbbbb) 보장 및 최소 투명도(0.5) 설정으로 암전 방지.
- **법선 및 색상 간섭 제거**: `DoubleSide` 렌더링으로 뒤집힌 법선 대응, `vertexColors` 비활성화로 FBX 정점 색상 간섭 차단.
- **반사 제어**: `roughness` 및 `metalness` 값을 조정하여 안정적인 쉐이딩 확보.

### 3. 디버그 인프라 구축 (검증 자동화)
- **자동 스크린샷**: 아바타 로드 2초 후 `screenshots/` 폴더에 현 상태를 PNG로 자동 저장하여 시각적 확인 지원.
- **상세 로깅**: 재질별 텍스처 유무, 최종 적용 색상값 등을 콘솔에 출력하여 데이터 기반 추적 가능.

### 3. 텍스처 컬러 스페이스 및 라이트 관리
- 모든 텍스처에 `THREE.SRGBColorSpace`를 적용하여 정확한 색감 표현.
- 모델 내 임베디드 라이트 제거 로직을 유지하여 조명 간섭 최소화.

## Verification Result

- `tests/renderer/avatar.test.ts` 통과.
- 조명 강도 상향과 재질별 맞춤 보정 로직의 조합으로 다양한 재질 구성에서도 아바타가 선명하게 보이도록 조치함.

## Related

- [RENDERING-002_방메쉬_흰색_렌더링.md](../완료/RENDERING-002_방메쉬_흰색_렌더링.md) — 방 메쉬 화이트아웃 해결 이력
