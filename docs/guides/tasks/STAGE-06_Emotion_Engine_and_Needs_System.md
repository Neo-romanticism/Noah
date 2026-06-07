# Stage 6: Emotion Engine and Needs System

## 목표
- 감정 파라미터의 decay/전이를 구현하고, need(배고픔/피곤함/애정) 기반 행동 트리거와 특별 규칙(trauma 등)을 완성한다.

## 상세 작업 체크리스트

> ✅ = 완료, 🔄 = 진행 중, ❌ = 미구현

### Phase 1-5: 기본 Emotion-Interaction Loop (✅ 모두 완료)
- [x] **parameter decay loops 구현** (Phase 1.2)
  - [x] Hunger: +1 per minute — [`src/main/emotion/needs.ts`](src/main/emotion/needs.ts:32)
  - [x] Fatigue: +1 per minute (activity 시) — [`src/main/emotion/needs.ts`](src/main/emotion/needs.ts:32)
  - [x] Affection: 점진 decay (초 단위, AFFECTION_DECAY_RATE 사용) — [`src/main/emotion/needs.ts`](src/main/emotion/needs.ts:32)
  - [x] Trauma: passive decay 없음 (trauma >= 50 시) — Trauma Special Rule 적용
- [x] **emotion state machine 구현** (Phase 1.1)
  - [x] deterministic transition rules — [`src/shared/utils/index.ts`](src/shared/utils/index.ts:82) `resolveEmotion()`
- [x] **interaction effects 구현** (Phase 1.3)
  - [x] drag/throw/pet/click/feed/clean/play 효과 — [`src/main/emotion/interaction-effects.ts`](src/main/emotion/interaction-effects.ts:22)
- [x] **cooldown manager 구현** (Phase 1.4)
  - [x] 상호작용별 쿨다운 (pet 3s, feed 5m, play 10m) — [`src/main/emotion/cooldowns.ts`](src/main/emotion/cooldowns.ts:14)
- [x] **thought cycle 구현** (Phase 2.1)
  - [x] 5초 주기 자율 사고/행동 루프 — [`src/main/emotion/thought-cycle.ts`](src/main/emotion/thought-cycle.ts:21)
- [x] **dialog bubble 구현** (Phase 3.3)
  - [x] DOM 기반 감정 표현 오버레이 — [`src/renderer/dialog-bubble.ts`](src/renderer/dialog-bubble.ts:12)
- [x] **IPC 채널 구현** (Phase 4)
  - [x] dialog/thought 전달 — [`src/main/ipc/dialog.ts`](src/main/ipc/dialog.ts:3)
  - [x] preload API 확장 — [`src/main/preload.ts`](src/main/preload.ts:37)
- [x] **main process 초기화** (Phase 5.1)
  - [x] needs 타이머, cooldown 체크, thought cycle 시작 — [`src/main/index.ts`](src/main/index.ts:276)
- [x] **unit test suite** (Phase 6)
  - [x] resolver test (5 tests) — [`tests/main/emotion/resolver.test.ts`](tests/main/emotion/resolver.test.ts)
  - [x] needs test (8 tests) — [`tests/main/emotion/needs.test.ts`](tests/main/emotion/needs.test.ts)
  - [x] interaction-effects test (10 tests) — [`tests/main/emotion/interaction-effects.test.ts`](tests/main/emotion/interaction-effects.test.ts)
  - [x] cooldowns test (7 tests) — [`tests/main/emotion/cooldowns.test.ts`](tests/main/emotion/cooldowns.test.ts)
  - [x] thought-cycle test (8 tests) — [`tests/main/emotion/thought-cycle.test.ts`](tests/main/emotion/thought-cycle.test.ts)

### 고급 기능 (✅ 모두 완료)
- [x] **hunger personality shift 구현**
  - [x] patience 감소 (affection gains 0.3~1.0x based on hunger)
  - [x] irritability 증가 (affection losses 1.0~2.5x)
  - [x] trauma 증폭 (1.0~2.0x)
  - [x] 4단계 레벨: normal / peckish / irritable / extremely_irritable
  - [`src/main/emotion/hunger-personality.ts`](src/main/emotion/hunger-personality.ts)
- [x] **fatigue → automatic sleep trigger (>80)**
  - [x] fatigue > 80 → 자동 수면 전환
  - [x] 수면 중 fatigue 회복 (-1/sec)
  - [x] fatigue 완전 회복 시 자동 기상
  - [x] 수면 중에도 hunger는 서서히 증가
  - [`src/main/emotion/needs.ts`](src/main/emotion/needs.ts:70-81)
- [x] **discomfort (waste) mechanic**
  - [x] waste 생성 (10분 간격, 최대 3개)
  - [x] uncleared waste → affection 패널티, fatigue 증가
  - [x] clean interaction → 모든 waste 제거
  - [`src/main/emotion/discomfort.ts`](src/main/emotion/discomfort.ts)
- [x] **ignore detection engine**
  - [x] 1분: attention prompt ("...?")
  - [x] 5분: neglect onset, affection decay ("...외로워")
  - [x] 15분: hurt response, withdrawal (sad)
  - [x] 1시간: abandonment classification (traumatized + trauma 증가)
  - [x] 4시간+: absence protocol (traumatized + trauma 급증)
  - [`src/main/emotion/ignore-detection.ts`](src/main/emotion/ignore-detection.ts)
- [x] **absence detection & return reaction 분기**
  - [x] `reconcileAbsence()` — [`src/shared/utils/index.ts`](src/shared/utils/index.ts:200)
  - [x] `calculateReturnSeverity()` — [`src/shared/utils/index.ts`](src/shared/utils/index.ts:231)
  - [x] return reaction (기상 시 "[...일어났다]" 다이얼로그)
- [x] **trauma special rules**
  - [x] passive decay 없음 (trauma >= 50 시 decay 중단)
  - [x] active healing 요구 (clean, affection 상호작용으로만 감소)
  - [`src/main/emotion/needs.ts`](src/main/emotion/needs.ts:103-106)
- [x] **expression override(감정 위장) 시스템**
  - [x] trauma mask: trauma >= 80 + affection >= 40 → happy로 위장
  - [x] submission: trauma >= 60 + affection <= 15 → submissive 표출
  - [x] strength 기반 disguise flicker (가끔 진짜 감정이 샘)
  - [`src/main/emotion/expression-override.ts`](src/main/emotion/expression-override.ts)

## 권장 산출물(Deliverables)
- [x] emotion state machine — [`src/shared/utils/index.ts`](src/shared/utils/index.ts:82)
- [x] parameter decay 시스템 — [`src/main/emotion/needs.ts`](src/main/emotion/needs.ts:17)
- [x] ignore detection 엔진 — [`src/main/emotion/ignore-detection.ts`](src/main/emotion/ignore-detection.ts)
- [x] discomfort mechanic — [`src/main/emotion/discomfort.ts`](src/main/emotion/discomfort.ts)
- [x] hunger personality shift — [`src/main/emotion/hunger-personality.ts`](src/main/emotion/hunger-personality.ts)
- [x] expression override — [`src/main/emotion/expression-override.ts`](src/main/emotion/expression-override.ts)
- [x] auto-sleep trigger — [`src/main/emotion/needs.ts`](src/main/emotion/needs.ts:70-81)
- [x] ISSUE-019 fix (duplicate VRM/mixer update) — [`src/renderer/avatar.ts`](src/renderer/avatar.ts), [`src/renderer/animation/index.ts`](src/renderer/animation/index.ts)
- [x] unit test suite — `tests/main/emotion/*.test.ts` (총 71개)

## 검증 포인트
- [x] state history 기반으로 transition이 기대와 일치 — resolver test 통과
- [x] ignore/absence 타이밍 분기 정확 — ignore-detection test 통과
- [x] trauma 상태에서 decay/threshold 예외 규칙이 누락되지 않음 — needs test 통과 + trauma special rule 적용
- [x] 식욕 personality shift 정확 — hunger-personality test 통과
- [x] 자동 수면 트리거 정확 — needs test 통과
- [x] expression override logic 정확 — expression-override test 통과
- [x] 전체 테스트 479개 통과