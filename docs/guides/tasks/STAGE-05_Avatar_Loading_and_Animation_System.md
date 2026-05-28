# Stage 5: Avatar Loading and Animation System

## 목표
- FBX 기반 Noah 아바타를 씬에 로드하고, 애니메이션/표정/감정 매핑을 위한 컨트롤러를 구축한다.

## 상세 작업 체크리스트
- [ ] Noah FBX 아바타 로딩
  - [ ] skeletal 구조 포함 확인
- [ ] 애니메이션 시스템
  - [ ] priority-based queue 관리
  - [ ] 애니메이션 전환/루핑 로직
- [ ] 애니메이션 카탈로그(트리거) 구현
  - [ ] `idle`
  - [ ] `drag`
  - [ ] `throw`
  - [ ] `land`
  - [ ] `dizzy`
  - [ ] `eat`
  - [ ] `sleep`
  - [ ] `happy`
  - [ ] `sad`
  - [ ] `angry`
- [ ] blend shape / morph target 시스템 구축
  - [ ] facial expression 제어
- [ ] 16개 감정 맵핑
  - [ ] 얼굴(FBX/VRM BlendShape 등)
  - [ ] 바디 포스/움직임
  - [ ] dialog category 선택
  - [ ] TTS parameter 조절
- [ ] transition interpolation 로직
- [ ] 개발 초기 단계를 위한 **placeholder (임시) geometry** — 실제 FBX 아바타 수급 전까지 캡슐/박스 등 임시 메쉬 사용

## 권장 산출물(Deliverables)
- [ ] FBX avatar integration
- [ ] priority animation controller
- [ ] 얼굴/표정 매핑 시스템
- [ ] animation catalog + transition rules
- [ ] blend shape controller
- [ ] development placeholder — **임시 메쉬**. 실제 FBX 아바타 도입 시 교체 예정

## 검증 포인트
- [ ] 트리거 연타 시 우선순위가 일관됨
- [ ] 애니메이션 전환이 튀지 않음(보간)
- [ ] placeholder 환경에서도 렌더링 파이프라인이 유지됨 — **임시 메쉬로 파이프라인 검증 후 FBX 교체**

