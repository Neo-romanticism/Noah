# ISSUE-012: NoahState 버전 마이그레이션

## 상태
✅ 완료

## 문제
`NoahState.version` 필드는 있지만, 구버전 상태 로드 시 마이그레이션 로직이 없음.

## 해결
1. `src/main/persistence/index.ts`에 `MIGRATIONS: Record<number, (state: NoahState) => NoahState>` 맵 정의
2. `loadState()`에서 `loadStateWithBackup()` 후 `migrateState()` 호출
3. `migrateState()`에서 `parsed.version < CURRENT_VERSION` 시 순차적 마이그레이션 적용
4. 버전이 더 높은 경우(미래 스키마) 기본 상태로 리셋

## 수정 파일
- `src/main/persistence/index.ts`

## 테스트
- `tests/main/persistence.test.ts` — migrateState 관련 4개 테스트 추가 (current version, missing version, future version, bump version)
