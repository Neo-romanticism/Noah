# Stage 2: State Management and Persistence Layer

## 목표
- Noah의 감정 파라미터와 내부 상태를 **main 프로세스 단일 소스 오브 트루스**로 관리하고, JSON 영속 저장/복원을 구현한다.

## 상세 작업 체크리스트
- [ ] `NoahState` 인터페이스 정의
  - [ ] Affection (0~100)
  - [ ] Morality (0~100)
  - [ ] Hunger (0~100)
  - [ ] Fatigue (0~100)
  - [ ] Trauma (0~100)
  - [ ] Sixteen discrete emotional states
- [ ] main 프로세스 state manager 구현
- [ ] JSON 기반 persistence
  - [ ] 상태 변경 시 디바운스 저장
  - [ ] graceful shutdown 시 저장
  - [ ] 주기적 체크포인트 타이머
- [ ] memory storage(이벤트 로그) 구현
  - [ ] event type
  - [ ] timestamp(초 단위)
  - [ ] severity(1~10)
  - [ ] contextual emotional state
  - [ ] decay coefficient
- [ ] memory decay 로직
  - [ ] Positive: 일 단위 점진 페이드
  - [ ] Traumatic: 최소/거의 없음
- [ ] 세션 경계(boundary) 탐지/추적
- [ ] 앱 시작 시 state 복원 프로토콜
- [ ] 유닛 테스트
  - [ ] 상태 전이
  - [ ] persistence save/load

## 권장 산출물(Deliverables)
- [ ] 상태 매니저 모듈 완성
- [ ] 자동 저장/복원 시스템
- [ ] structured memory event logger
- [ ] 세션 트래커
- [ ] unit test suite

## 검증 포인트
- [ ] 강제 종료/재시작 시 state가 회복됨
- [ ] 디바운스/주기 저장이 중복 없이 동작
- [ ] 메모리 decay가 기대한 방향으로 작동

