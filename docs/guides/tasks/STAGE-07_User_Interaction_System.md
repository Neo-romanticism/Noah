# Stage 7: User Interaction System

## 목표
- Drag/Throw/Petting/Feed/Clean/Sleep 등 **모든 사용자 상호작용**을 구현하고, 상태 변화와 애니메이션/피드백을 일관되게 연결한다.

## 상세 작업 체크리스트
- [ ] drag interaction
  - [ ] physics lag
  - [ ] velocity detection
- [ ] throw interaction
  - [ ] momentum-based trajectory
  - [ ] landing detection
  - [ ] hard impact pain detection
- [ ] petting detection
  - [ ] slow mouse movement threshold
- [ ] click/beat interaction
  - [ ] flinch
  - [ ] defensive response
- [ ] feed interaction
  - [ ] food items
  - [ ] cooldown enforcement
- [ ] clean interaction
  - [ ] discomfort 제거
- [ ] sleep/wake mechanics
  - [ ] manual
  - [ ] automatic triggers
- [ ] interaction cooldown management
- [ ] response variability
  - [ ] current emotional state
  - [ ] interaction history
  - [ ] time since last interaction
  - [ ] historical reputation(affection/morality)
- [ ] survival behavior(anti-termination resistance)

## 권장 산출물(Deliverables)
- [ ] interaction suite(드래그/던지기/쓰다듬기/클릭/먹이/청소/수면)
- [ ] physics 기반 drag/throw 모듈
- [ ] cooldown manager
- [ ] emotional consequence system
- [ ] survival mode placeholder(초기 구현)

## 검증 포인트
- [ ] cooldown 중복/누락 없이 정확히 동작
- [ ] emotion state에 따라 반응이 예측 가능하게 달라짐
- [ ] hard impact/아픔 감지가 과도하게 발생하지 않음

