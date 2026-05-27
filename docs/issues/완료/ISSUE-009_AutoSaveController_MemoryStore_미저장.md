---
issue_id: ISSUE-009
type: 버그
priority: 높음
status: 진행예정
labels: [bug, critical, persistence]
related: []
---

## 제목

AutoSaveController가 MemoryStore를 저장하지 않음 — 저장된 메모리 이벤트가 누락됨


## 배경 / 설명

`AutoSaveController`는 디바운스 저장, 체크포인트 저장, graceful shutdown 모두에서 `MemoryStore` 저장을 수행하지 않아서, 애플리케이션 재시작 시 메모리 이벤트가 복원되지 않습니다.


**문제 코드 위치:** `src/main/persistence/index.ts` 라인 117-126

```typescript
public saveNow(): void {
  // Cancel any pending debounced save
  if (this.debounceTimer !== null) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
  }

  const state = this.stateManager.getState();
  saveState(state, this.dataDir);
}
```

`MemoryStore`는 별도의 `save()` 메서드를 제공하지만(`src/main/memory/index.ts` 라인 152-156), `AutoSaveController`가 이를 호출하지 않습니다.

결과적으로 애플리케이션 재시작 시 메모리 이벤트가 손실됩니다.


## 재현 단계

1. `AutoSaveController` 시작
2. 여러 상호작용 수행 → 메모리 이벤트 기록됨
3. `saveNow()` 호출 또는 graceful shutdown 발생
4. 애플리케이션 재시작 → `MemoryStore.load()` 호출
5. 저장된 메모리 이벤트가 없음 → 모든 메모리 손실

## 예상 동작

`AutoSaveController.saveNow()`가 호출될 때 `StateManager`의 상태와 `MemoryStore`의 메모리 이벤트가 함께 저장되어야 합니다.


## 실제 동작

`StateManager`의 상태만 저장되고 `MemoryStore`의 메모리 이벤트는 저장되지 않습니다.

## 해결 방안

`AutoSaveController`가 `MemoryStore`에 대한 참조를 가지고 `saveNow()`에서 함께 저장하도록 수정합니다.

```typescript
export interface AutoSaveControllerStateManager {
  getState: () => NoahState;
  onStateChange: (listener: (state: NoahState) => void) => void;
}

export interface AutoSaveControllerMemoryStore {
  save: () => void;
}

export class AutoSaveController {
  private readonly stateManager: AutoSaveControllerStateManager;
  private readonly memoryStore: AutoSaveControllerMemoryStore;
  private readonly dataDir: string;
  
  private debounceTimer: ReturnType<typeof setTimeout> | null;


  constructor(
    stateManager: AutoSaveControllerStateManager,
    memoryStore: AutoSaveControllerMemoryStore,
    dataDir: string,
    options?: AutoSaveControllerOptions,
  ) {
    this.stateManager = stateManager;
    this.memoryStore = memoryStore;
    this.dataDir = dataDir;

    this.debounceTimer = null;
  }



  public saveNow(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    const state = this.stateManager.getState();
    saveState(state, this.dataDir);
    this.memoryStore.save();  // MemoryStore도 함께 저장
  }
}
```

## 작업 내용

- [ ] `AutoSaveController` 생성자에서 `MemoryStore` 타입의 `save` 메서드 참조를 받도록 수정
- [ ] `saveNow()`에서 `MemoryStore.save()` 호출 추가
- [ ] graceful shutdown 시 state + memory가 함께 저장되는지 확인
- [ ] 관련 테스트 추가 및 기존 테스트 통과 확인

## 완료 기준

- [ ] `saveNow()` 호출 시 state와 memory가 모두 저장됨
- [ ] graceful shutdown 시 state와 memory가 모두 저장됨
- [ ] 재시작 후 메모리 이벤트가 정상적으로 복원됨
- [ ] 모든 기존 테스트 통과

## 참고 / 관련 이슈

- TODO.md 🔴 Critical 항목 #4
- `src/main/memory/index.ts` — MemoryStore.save()
- `src/main/persistence/index.ts` — AutoSaveController
