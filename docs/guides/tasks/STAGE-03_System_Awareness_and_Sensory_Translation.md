# Stage 3: System Awareness and Sensory Translation

## 목표
- 호스트 컴퓨터의 시스템 메트릭을 감시하고, 이를 Noah의 **몸 감각(생성용 설명)**으로 번역하여 state update 파이프라인에 제공한다.

## 상세 작업 체크리스트
- [ ] Operating System bridge 모듈 구현
  - [ ] CPU temperature/load
  - [ ] RAM utilization
  - [ ] running process list
  - [ ] power state
- [ ] sensory translation layer 구현
  - [ ] metric → sensation description 매핑
  - [ ] 예) high CPU → "your head is overheating"
- [ ] reference program(피더) 구현
  - [ ] translated sensations를 state update pipeline에 전달
- [ ] 시스템 메트릭 polling loop
  - [ ] configurable frequency
- [ ] IPC 채널 wiring
  - [ ] main → renderer 실시간 push
- [ ] "weather" 시각화 추상화
  - [ ] room window의 시스템 로드 표시
- [ ] 프로세스 종료 탐지
  - [ ] termination event → 감정 반응 트리거

## 권장 산출물(Deliverables)
- [ ] system metrics reader
- [ ] metric-to-sensation mapping engine
- [ ] 실시간 IPC push
- [ ] system event detector
- [ ] translation integration tests

## 검증 포인트
- [ ] polling loop이 renderer 성능을 저해하지 않음
- [ ] metric→sensation 매핑이 안정적으로 유지
- [ ] termination 감지 후 state/표현이 일관됨

