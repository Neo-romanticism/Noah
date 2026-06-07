---
issue_id: ISSUE-020
type: 버그
priority: 높음
status: 진행예정
labels: [bug, state, memory]
related: [docs/guides/Midterm_Alignment_Check.md]
---

## 환경 정보

- OS: Linux
- 버전/빌드: v1.0.0 (Stage 06 완료 상태)

## 버그 설명

사용자가 먹이를 주거나(`feed`), 쓰다듬거나(`pet`), 청소를 완료(`clean`)하는 등의 핵심 상호작용을 실행할 때, 노아가 이를 인지하는 메모리 저장 장치(`MemoryStore`)에 이벤트 히스토리가 남지 않고 유실되는 치명적인 버그가 있습니다. 

## 재현 단계

1. 렌더러 내에서 노아에게 `feed` 액션을 준다.
2. [src/main/index.ts](src/main/index.ts)의 IPC 핸들러가 이를 수신하여 스탯 변동(`delta`) 값을 게산한다.
3. `Object.keys(delta).length > 0` 분기조건을 통과하면서 `stateManager.modify()`를 동작시킨다.
4. 상호작용은 성공하여 배고픔 수치는 줄어드나, `MemoryStore`에 기록을 남기는 `stateManager.applyInteraction()`은 호출되지 않아 `memories.json` 로그가 갱신되지 않고 누락된다.

## 예상 동작

어떤 종류의 사용자 상호작용이든 (스탯 변동이 발생하든 발생하지 않든) 올바른 상호작용 이력(`fed`, `petted`, `cleaned`, `dragged`, `thrown` 등)이 `MemoryStore`에 정식 로그로 남아야 하며, `memories.json`에 저장을 거쳐 향후 LLM 등이 노아의 최근 기억(Memory Context)으로 온전히 활용될 수 있어야 합니다.

## 실제 동작

`src/main/index.ts`의 `onAction`에서 스탯 변동값(`delta`)이 적용되는 변동 상호작용 분기 시에는 메모리 생성이 단절되고 단순 스탯 수정만 이루어집니다. 이로 인해 노아가 밥을 먹이거나 이물질을 치워주었어도 과거를 전혀 기억하지 못하게 됩니다 (단순 에러 분기 시에만 메모리가 쓰여지고 있음).

## 해결 방안

1. [src/main/index.ts](src/main/index.ts) 내 상호작용 반응기 로직의 리팩토링:
   - 스탯의 단순 변경이나 `modify`를 수행할 때에도, 해당 유형에 상응하는 메모리 이벤트(`MemoryEvent`) 발행이 한 세트로 엮이도록 보정합니다.
2. `StateManager`의 `applyInteraction` 기능 설계 재정의:
   - 상호작용 변동값과 이력 생성이 매번 별도 분기로 찢기지 않도록, `applyInteraction(event)` 호출만으로 스탯 변동(With `applyInteraction` 내부 연산)과 메모리 생성이 단일 원자적 루프로 동작하도록 단순화시킵니다.
