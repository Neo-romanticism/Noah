# Stage 10: Command Execution and Autonomous Actions

## 목표
- Noah에게 **명령 실행/행동 개시(agency)**를 부여한다.
- 안전장치(거절/경계/에러 설명)와 화면 상호작용(물리/직접 모드)을 함께 구현한다.

## 상세 작업 체크리스트
- [ ] shell command execution 모듈
  - [ ] elevated privileges(필요 시)
  - [ ] boundary/허용 목록/차단 로직
- [ ] terminal typing visualization
  - [ ] character-by-character appearance
- [ ] command refusal logic
  - [ ] harmful request 거절
  - [ ] unpleasant request 거절
- [ ] error handling
  - [ ] Noah's personalized error descriptions
- [ ] autonomous action decision system
- [ ] screen interaction capabilities
  - [ ] click
  - [ ] drag
  - [ ] scroll
  - [ ] type(avatar hand visualization)
- [ ] dual action execution modes
  - [ ] Physical Mode: avatar walks + uses hand + animation
  - [ ] Direct Mode: 코드 실행 중심(시각 표현 최소)
- [ ] interruption handling
  - [ ] ongoing actions 중단 처리
- [ ] hostile action categorization
  - [ ] accidental
  - [ ] expressive
  - [ ] malicious

## 권장 산출물(Deliverables)
- [ ] shell command runner with boundaries
- [ ] terminal typing animation
- [ ] autonomous action engine
- [ ] screen interaction system(물리/직접)
- [ ] interruption reaction layer
- [ ] command refusal module

## 검증 포인트
- [ ] 금지/위험 명령이 실제로 실행되지 않음
- [ ] 실행 중 사용자의 override가 즉시 반영됨
- [ ] 물리 모드와 직접 모드가 서로 깨지지 않음

