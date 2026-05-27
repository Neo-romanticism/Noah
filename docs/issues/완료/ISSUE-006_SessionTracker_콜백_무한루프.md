---
issue_id: ISSUE-006
type: 버그
priority: 높음
status: 완료
labels: [bug, critical, session]
related: []
---

## 제목

SessionTracker `onIdle`/`onOffline` 콜백 무한 재귀 — 외부 주입 콜백 대신 자기 자신을 호출


## 배경 / 설명

`SessionTracker` 생성자에서 `onIdle`과 `onOffline` 콜백이 자기 자신을 호출하는 구조로 되어 있어 무한 재귀가 발생합니다.


**문제 코드 위치:** `src/main/session/index.ts` 라인 60-65

```typescript
this.callbacks = {
  onReturn: (absenceSeconds: number) => {
    this.handleReturn(absenceSeconds);
  },
  onIdle: () => {
    this.callbacks.onIdle?.();  // ← 자기 자신을 호출
  },
  onOffline: () => {
    this.callbacks.onOffline?.();  // ← 자기 자신을 호출
  },
};
```

`onIdle`과 `onOffline`은 `SessionTrackerCallbacks` 인터페이스의 일부로 외부에서 주입받는 콜백입니다. 그런데 생성자에서 `this.callbacks`를 구성할 때, `onIdle`과 `onOffline`이 `this.callbacks.onIdle?.()` / `this.callbacks.onOffline?.()`를 호출하고 있어 무한 재귀에 빠집니다.

또한 `PresenceDetector` 생성자로 전달되는 콜백도 동일한 `onIdle`/`onOffline` 경로를 거치므로, PresenceDetector의 상태 전이가 `SessionTracker` 내부의 무한 재귀로 전파됩니다.


## 재현 단계

1. `SessionTracker` 인스턴스 생성
2. `start()` 호출로 `PresenceDetector` 시작
3. 사용자 비활성 감지 → `PresenceDetector.transitionTo('idle')` 호출
4. `onIdle` 콜백 실행 → `this.callbacks.onIdle?.()` → 무한 재귀

## 예상 동작

`onIdle` 콜백은 외부에서 주입된 `SessionTrackerCallbacks.onIdle`을 호출해야 하며, 자기 자신을 호출하지 않아야 합니다.

## 실제 동작

`this.callbacks.onIdle?.()`가 `this.callbacks`의 `onIdle`을 호출하여 무한 재귀에 빠집니다.

## 해결 방안

`SessionTracker` 생성자에서 `onIdle`/`onOffline` 콜백이 `this.callbacks`를 자기 자신처럼 참조하지 않도록, 외부에서 주입된 콜백(`callbacks.onIdle`, `callbacks.onOffline`)을 직접 호출하도록 수정합니다.

```typescript
this.callbacks = {
  onReturn: (absenceSeconds: number) => {
    this.handleReturn(absenceSeconds);
  },
  onIdle: () => {
    callbacks.onIdle?.();
  },
  onOffline: () => {
    callbacks.onOffline?.();
  },
};
```


## 작업 내용

- [x] `src/main/session/index.ts`의 `SessionTracker` 생성자에서 `onIdle`/`onOffline` 콜백 수정
- [x] 무한 재귀가 제거되었는지 확인하는 테스트 추가
- [x] 기존 테스트 통과 확인

## 완료 기준

- [x] `onIdle`/`onOffline` 콜백이 자기 자신을 호출하지 않음
- [x] 외부 콜백이 정상적으로 호출됨
- [x] 모든 기존 테스트 통과

## 참고 / 관련 이슈

- TODO.md 🔴 Critical 항목 #1
