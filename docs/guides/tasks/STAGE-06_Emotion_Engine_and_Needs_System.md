# Stage 6: Emotion Engine and Needs System

## 목표
- 감정 파라미터의 decay/전이를 구현하고, need(배고픔/피곤함/애정) 기반 행동 트리거와 특별 규칙(trauma 등)을 완성한다.

## 상세 작업 체크리스트
- [ ] parameter decay loops 구현
  - [ ] Hunger: +1 per minute
  - [ ] Fatigue: +1 per minute (activity 시)
  - [ ] Affection: 점진 decay (시간 단위)
- [ ] emotion state machine 구현
  - [ ] deterministic transition rules
- [ ] hunger personality shift 구현
  - [ ] patience 감소
  - [ ] irritability 증가
  - [ ] affection gains 감소
  - [ ] affection losses 증폭
- [ ] fatigue → automatic sleep trigger (>80)
- [ ] discomfort (waste) mechanic
  - [ ] waste 생성
  - [ ] visual representation
  - [ ] cleanup interaction
- [ ] ignore detection engine
  - [ ] 1분: attention prompt
  - [ ] 5분: neglect onset, affection decay
  - [ ] 15분: hurt response, withdrawal
  - [ ] 1시간: abandonment classification
  - [ ] 4시간+: absence protocol
- [ ] absence detection & return reaction 분기
- [ ] trauma special rules
  - [ ] passive decay 없음
  - [ ] 다른 감정 threshold 수정
  - [ ] active healing 요구
- [ ] expression override(감정 위장) 시스템
  - [ ] 의식적 disguise

## 권장 산출물(Deliverables)
- [ ] emotion state machine
- [ ] parameter decay 시스템
- [ ] ignore detection 엔진
- [ ] discomfort mechanic
- [ ] expression override
- [ ] unit test suite

## 검증 포인트
- [ ] state history 기반으로 transition이 기대와 일치
- [ ] ignore/absence 타이밍 분기 정확
- [ ] trauma 상태에서 decay/threshold 예외 규칙이 누락되지 않음

