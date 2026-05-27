# ISSUE-014: 세션 임계값 상수 통합

## 상태
✅ 완료

## 문제
`src/main/session/detector.ts`에서 `300_000` (5분), `3_600_000` (1시간) 등이 하드코딩되어 있음.

## 해결
1. `src/shared/constants/index.ts`에 이미 `SESSION_IDLE_THRESHOLD_MS`, `SESSION_OFFLINE_THRESHOLD_MS`가 정의되어 있음
2. `detector.ts`가 해당 상수를 import하여 사용하도록 교체

## 수정 파일
- `src/main/session/detector.ts`

## 테스트
- 기존 테스트 그대로 통과 (상수 값이 동일)
