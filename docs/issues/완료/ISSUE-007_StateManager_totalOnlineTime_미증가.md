---
issue_id: ISSUE-007
type: 버그
priority: 높음
status: 진행예정
labels: [bug, critical, state]
related: [ISSUE-006]
---

## 제목

StateManager `totalOnlineTime`이 절대 증가하지 않는 버그

## 배경 / 설명

`NoahState` 인터페이스에 `totalOnlineTime` 필드(누적 온라인 시간, 초 단위)가 정의되어 있지만, 이를 증가시키는 로직이 구현되어 있지 않습니다.

**문제 코드 위치:** `src/main/state/index.ts`

`StateManager`의 `tick()` 메서드(라인 72-76):
```typescript
public tick(now: number = Date.now()): NoahState {
  this.state = { ...this.state, lastSeen: now } satisfies NoahState;
  this.emitter.emit('state', this.state);
  return this.state;
}
```

`tick()`이 호출될 때마다 `lastSeen`만 갱신되고 `totalOnlineTime`은 증가하지 않습니다.


`totalOfflineTime`은 `reconcileAbsence()`에서 정상적으로 증가합니다(라인 97-106):
```typescript
public reconcileAbsence(absenceSeconds: number): NoahState {
  const reconciled = reconcileAbsenceUtil(this.state, absenceSeconds);
  this.state = {
    ...reconciled,
    lastSeen: Date.now(),
    totalOfflineTime: this.state.totalOfflineTime + absenceSeconds,
  };
  ...
}
```

## 재현 단계

1. `StateManager` 인스턴스 생성
2. `tick()`을 여러 번 호출
3. `getState().totalOnlineTime` 확인 → 항상 0

## 예상 동작

`tick()`이 호출될 때마다 `totalOnlineTime`이 마지막 tick 이후 경과 시간(초 단위)만큼 증가해야 합니다.


## 실제 동작

`totalOnlineTime`이 초기값 0에서 절대 변하지 않습니다.

## 해결 방안

`tick()` 메서드에서 `totalOnlineTime`을 증가시키는 로직을 추가합니다:

```typescript
public tick(now: number = Date.now()): NoahState {
  const elapsed = Math.max(0, Math.floor((now - this.state.lastSeen) / 1000));
  this.state = {
    ...this.state,
    lastSeen: now,
    totalOnlineTime: this.state.totalOnlineTime + elapsed,
  } satisfies NoahState;
  this.emitter.emit('state', this.state);
  return this.state;
}
```

## 작업 내용

- [ ] `src/main/state/index.ts`의 `tick()` 메서드에 `totalOnlineTime` 증가 로직 추가
- [ ] `totalOnlineTime` 누적이 정상 동작하는지 확인하는 테스트 추가
- [ ] 기존 테스트 통과 확인

## 완료 기준

- [ ] `tick()` 호출 시 `totalOnlineTime`이 정상적으로 증가
- [ ] 세션 간 누적 시간이 올바르게 유지됨
- [ ] 모든 기존 테스트 통과

## 참고 / 관련 이슈

- TODO.md 🔴 Critical 항목 #2
- ISSUE-006 (SessionTracker 관련)
