# Stage 4: Three.js Renderer and Scene Setup

## 목표
- 투명 백그라운드 오버레이에서 Three.js 씬을 구성하고, Noah의 기본 “방(room)” 시각 세계를 마련한다.

## 상세 작업 체크리스트
- [ ] Three.js scene 초기화
  - [ ] transparent background 렌더링
- [ ] 카메라 구성
  - [ ] fixed-position
  - [ ] slight angular offset
- [ ] 기본 방 geometry 배치
  - [ ] bed
  - [ ] desk(+mini monitor)
  - [ ] window(time-of-day + system weather)
  - [ ] floor(physics interaction area)
- [ ] 조명 시스템
  - [ ] ambient light
  - [ ] directional light
- [ ] 동적 window 요소
  - [ ] 시간 표시
  - [ ] system load 표시
- [ ] 시각 전용 collision/physics 구상
  - [ ] floor/bed
- [ ] resize handling 및 responsive adaptation
- [ ] FBX 로딩 파이프라인 준비
  - [ ] `FBXLoader` integration

## 권장 산출물(Deliverables)
- [ ] 기본 Three.js 씬(방 포함)
- [ ] dynamic window UI
- [ ] 카메라/조명 프리셋
- [ ] FBX loading 인프라
- [ ] resize 핸들러

## 검증 포인트
- [ ] 투명 배경이 깨지지 않음
- [ ] 카메라 각도에서 방 전체가 자연스럽게 보임
- [ ] window 정보가 렌더링 프레임 드랍 없이 갱신됨

