# ISSUE-011: PresenceDetector `removeAllListeners` 전역 제거 위험

## 상태
✅ 완료

## 문제
`PresenceDetector`에서 `powerMonitor.removeAllListeners()`가 전체 리스너를 제거하여 다른 모듈의 리스너도 날려버릴 위험이 있음.

## 해결
- `detector.ts`는 이미 `removeListener('event', this.handler)` 형태로 특정 핸들러만 제거하도록 구현되어 있었음.
- `start()`에서도 `removeListener`를 먼저 호출한 후 `on`으로 등록하여 중복 방지.
- `SESSION_IDLE_THRESHOLD_MS`, `SESSION_OFFLINE_THRESHOLD_MS` 상수를 `shared/constants/index.ts`에서 import하여 하드코딩 제거.

## 수정 파일
- `src/main/session/detector.ts`

## 테스트
- `tests/main/session.test.ts` — "removes only its own listeners, not other modules listeners" 통과
