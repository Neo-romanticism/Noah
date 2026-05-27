# ISSUE-013: formatDuration 헬퍼 추출

## 상태
✅ 완료

## 문제
`SessionTracker.formatAbsence()` 메서드에서 `Math.floor(seconds / 3600)`, `Math.floor((seconds % 3600) / 60)` 패턴이 중복될 수 있음.

## 해결
1. `src/shared/utils/index.ts`에 `formatDuration(seconds: number): string` 추가
2. `src/main/session/index.ts`의 `formatAbsence()`가 `formatDuration()`을 호출하도록 리팩토링

## 수정 파일
- `src/shared/utils/index.ts`
- `src/main/session/index.ts`

## 테스트
- `tests/shared/utils.test.ts` — formatDuration 관련 4개 테스트 추가 (seconds, minutes, hours, days)
