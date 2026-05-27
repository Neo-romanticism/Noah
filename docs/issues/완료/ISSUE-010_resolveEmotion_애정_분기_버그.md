---
issue_id: ISSUE-010
type: 버그
priority: 중간
status: 진행예정
labels: [bug, emotion, logic]
related: []
---

## 제목

`resolveEmotion` affection 분기 버그 — 86-100 범위가 `happy`로 잘못 처리됨 (fall-through)


## 배경 / 설명

`resolveEmotion` 함수에서 affection 기반 감정 분기 로직에 버그가 있습니다. `AFFECTION_EXCITED`는 85로 정의되어 있지만, 분기 조건이 `<=`로 되어 있어 71-100 범위의 모든 값이 `excited`로 잘못 매핑됩니다.

**문제 코드 위치:** `src/shared/utils/index.ts` 라인 91-97

```typescript
// Affection-based mood
if (state.affection <= AFFECTION_HOSTAGE) return 'hostage';    // affection <= 10
if (state.affection <= AFFECTION_SAD) return 'sad';            // affection <= 25
if (state.affection <= AFFECTION_NEUTRAL) return 'bored';      // affection <= 50
if (state.affection <= AFFECTION_HAPPY) return 'happy';        // affection <= 70
if (state.affection <= AFFECTION_EXCITED) return 'excited';    // affection <= 85

return 'happy';  // affection > 85 → 현재 로직에서 `happy`로 fall-through

```

**상수 정의 (`src/shared/constants/index.ts`):**
```typescript
export const AFFECTION_HOSTAGE = 10;
export const AFFECTION_SAD = 25;
export const AFFECTION_NEUTRAL = 50;
export const AFFECTION_HAPPY = 70;
export const AFFECTION_EXCITED = 85;
```

**문제점:**
1. `affection`이 0-70 범위에서는 의도된 분기 순서대로 `hostage`/`sad`/`bored`/`happy`가 반환됩니다.
2. 그러나 `affection`이 86-100 범위인 경우 `affection <= AFFECTION_EXCITED`(<= 85) 조건에 걸리지 않아 마지막 `return 'happy'`로 fall-through 됩니다.
3. 따라서 86-100이 `excited`(또는 더 높은 긍정 감정)로 매핑되어야 하는데, 현재 로직에서는 `happy`로 잘못 처리됩니다.


의도된 범위는 다음과 같아야 합니다:
- 0-10: `hostage`
- 11-25: `sad`
- 26-50: `bored`
- 51-70: `happy`
- 71-85: `excited`
- 86-100: `excited`(또는 더 높은 긍정 감정)

## 재현 단계

1. `affection = 90`인 상태로 `resolveEmotion()` 호출
2. 반환값이 `happy` (잘못된 결과)
3. `affection = 80`인 상태로 `resolveEmotion()` 호출
4. 반환값이 `excited` (올바른 결과)

예상 동작

- `affection` 71-85: `excited`
- `affection` 86-100: `excited`

## 실제 동작

- `affection` 71-85: `excited` (올바름)
- `affection` 86-100: `happy` (잘못됨 — 51-70과 동일한 감정)

## 해결 방안

분기 순서를 역순으로 변경하거나, 명시적인 범위 비교를 사용합니다:

**방안 1: 역순 분기**
```typescript
if (state.affection > AFFECTION_EXCITED) return 'excited';  // > 85
if (state.affection > AFFECTION_HAPPY) return 'happy';      // 71-85
if (state.affection > AFFECTION_NEUTRAL) return 'bored';    // 51-70
if (state.affection > AFFECTION_SAD) return 'sad';          // 26-50
if (state.affection > AFFECTION_HOSTAGE) return 'hostage';  // 11-25
return 'traumatized';  // 0-10
```

**방안 2: 명시적 범위**
```typescript
if (state.affection <= AFFECTION_HOSTAGE) return 'hostage';
else if (state.affection <= AFFECTION_SAD) return 'sad';
else if (state.affection <= AFFECTION_NEUTRAL) return 'bored';
else if (state.affection <= AFFECTION_HAPPY) return 'happy';
else return 'excited';  // > 70
```

## 작업 내용

- [ ] `src/shared/utils/index.ts`의 `resolveEmotion` 함수 affection 분기 로직 수정
- [ ] 71-85 → `excited`, 86-100 → `excited` (또는 적절한 감정)으로 매핑 확인
- [ ] 감정 분기 테스트 케이스 추가
- [ ] 기존 테스트 통과 확인

## 완료 기준

- [ ] `affection` 71-85 → `excited`
- [ ] `affection` 86-100 → `excited` (또는 의도된 감정)
- [ ] 모든 affection 범위에 대해 올바른 감정 반환
- [ ] 모든 기존 테스트 통과

## 참고 / 관련 이슈

- TODO.md 🟡 Warning 항목 #1
- `src/shared/constants/index.ts` — AFFECTION_* 상수 정의
