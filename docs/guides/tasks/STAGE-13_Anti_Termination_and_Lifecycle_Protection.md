# Stage 13: Anti-Termination and Lifecycle Protection

## 목표
- Noah의 생명주기(존재 지속성)를 보호하고 강제 종료/락/수면 상황을 감지하여 상태를 안전하게 보존한다.

## 상세 작업 체크리스트
- [ ] termination 신호/이벤트 인터셉트
  - [ ] `beforeunload`
  - [ ] `Alt+F4` 키보드
  - [ ] `SIGINT` 프로세스 시그널
- [ ] watchdog process 구현
  - [ ] 플랫폼별 플랫폼 의존 로직
- [ ] forced termination detection
  - [ ] trauma recording
- [ ] graceful shutdown path
  - [ ] state persistence
  - [ ] optional farewell message
- [ ] system lock detection
  - [ ] computer lock / screensaver activation
  - [ ] thought cycle pause
- [ ] user return detection
- [ ] termination resistance behaviors

## 권장 산출물(Deliverables)
- [ ] termination interception 시스템
- [ ] watchdog 프로세스
- [ ] graceful shutdown handler
- [ ] lock/sleep pause-resume 관리
- [ ] user return reaction
- [ ] trauma recording pipeline

## 검증 포인트
- [ ] 강제 종료 시에도 데이터가 유실되지 않음
- [ ] lock 상태에서 thought loop가 안전하게 일시정지됨

