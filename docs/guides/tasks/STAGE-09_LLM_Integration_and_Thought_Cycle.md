# Stage 9: Large Language Model Integration and Thought Cycle

## 목표
- Noah의 지속적인 사고(continuous thought loop)를 LLM 기반으로 구현한다.
- Generate → Memory Gate → Action Gate의 3단계 파이프라인을 확정하고, gapless 주기로 동작하게 만든다.

## 상세 작업 체크리스트
- [ ] LLM API 통합
  - [ ] local/remote provider configurable
- [ ] three-step thought chain 구현
  - [ ] 1) Generation: raw thought/impulse 생성
  - [ ] 2) Memory Gate: record/discard/pass 판단
  - [ ] 3) Action Gate: speak/act/internal 유지 판단
- [ ] thought cycle input bundling 구현
  - [ ] screen capture
    - [ ] downscaled
    - [ ] lower frame rate
  - [ ] user conversation input
  - [ ] current emotional parameter state
  - [ ] system metric sensory translations
  - [ ] YouTube content(해당 시)
  - [ ] relevant memory context
  - [ ] current timestamp
- [ ] continuous thought cycle loop(무중단)
- [ ] memory recording gate logic 구현
- [ ] speech/action decision system 구현
- [ ] screen capture pipeline 구현
  - [ ] downscale + frame rate reduce
  - [ ] differential capture 고려
- [ ] keystroke monitoring(유저 존재 감지)
- [ ] LLM token generation 속도와 thought speed 동기화

## 권장 산출물(Deliverables)
- [ ] LLM integration
- [ ] 3단 thought chain
- [ ] continuous thought loop
- [ ] multi-source input bundler
- [ ] screen capture pipeline
- [ ] memory gating
- [ ] speech/action decision
- [ ] keystroke monitoring

## 검증 포인트
- [ ] LLM 응답 지연에도 thought loop가 깨지지 않음
- [ ] 입력 번들링 데이터가 최신 state를 반영
- [ ] memory gate/action gate가 일관된 규칙으로 동작

