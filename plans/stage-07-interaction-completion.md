# STAGE-07: Interaction Completion & Renderer Polish

## 목표

Stage 06에서 메인 프로세스 중심으로 완성된 감정/욕구 엔진을 기반으로, **렌더러 시각화 완성 + 버그 수정 + 상호작용 API 고도화**를 통해 사용자가 체감 가능한 완전한 상호작용 루프를 구현한다.

Stage 06에서 발견된 미완성/버그 항목들을 일괄 해결하고, Midterm Alignment Check(2026-06-07)에서 합의된 설계 결정사항을 실제 코드에 반영한다.

---

## 배경 — AS-IS (Stage 06 완료 후 현황)

### 완성된 것

| 시스템 | 파일 | 상태 |
|--------|------|------|
| Emotion Engine (메인) | `src/main/emotion/` (8개 모듈) | ✅ 완료 |
| Online Needs Decay | `src/main/emotion/needs.ts` | ✅ 완료 |
| Interaction Effects | `src/main/emotion/interaction-effects.ts` | ✅ 완료 |
| Cooldown Manager | `src/main/emotion/cooldowns.ts` | ✅ 완료 |
| Hunger Personality (4단계) | `src/main/emotion/hunger-personality.ts` | ✅ 완료 |
| Ignore Detection (5단계) | `src/main/emotion/ignore-detection.ts` | ✅ 완료 |
| Discomfort Engine (메인) | `src/main/emotion/discomfort.ts` | ✅ 완료 (메인만) |
| Expression Override | `src/main/emotion/expression-override.ts` | ✅ 완료 |
| Dialog Bubble (렌더러) | `src/renderer/dialog-bubble.ts` | ✅ 완료 |
| Thought Cycle | `src/main/emotion/thought-cycle.ts` | ✅ 완료 |

### 미완성/버그 (이 스테이지 해결 대상)

| 항목 | 이슈 | 우선순위 |
|------|------|---------|
| 상호작용 시 MemoryStore 기록 유실 | [ISSUE-020](../docs/issues/진행예정/ISSUE-020_상호작용_실행_시_기억_유실_버그.md) | 🔴 높음 |
| 클릭 어뷰즈 → `beating` 이벤트 누락 | [ISSUE-021](../docs/issues/진행예정/ISSUE-021_연속_타격_시_학대_이벤트_유실_버그.md) | 🔴 높음 |
| Discomfort 오염 구체 렌더러 미구현 | [ISSUE-023](../docs/issues/진행예정/ISSUE-023_디지털_글리치_오염_체체_가시화_및_클릭_청소.md) | 🔴 높음 |
| 사료 종류(foodType) 시스템 미구현 | [Midterm Q2](../docs/guides/Midterm_Alignment_Check.md) | 🟡 중간 |
| OS 활동 감지 시 자동 기상 미구현 | [ISSUE-022](../docs/issues/진행예정/ISSUE-022_사용자_OS_활동_재개_시_동적_기상_연동.md) | 🟡 중간 |

---

## 대상 아키텍처 (TO-BE)

```
[렌더러]                                    [메인 프로세스]
  │                                              │
  │  ① click (abuse감지)                         │
  │  → beating IPC 전송 ─────────────────────▶  onAction('beating')
  │                                              │  trauma +15, affection -15
  │                                              │  applyInteraction('beating') ──▶ MemoryStore.record()
  │                                              │
  │  ② feed(foodType: 'premium')                │
  │  → sendInteraction ──────────────────────▶  onAction('feed', { foodType })
  │                                              │  hunger -= getFoodEffect(foodType).hungerReduction
  │                                              │  affection += getFoodEffect(foodType).affectionGain
  │                                              │  MemoryStore.record('fed')
  │                                              │
  │  ③ discomfortCount IPC 수신                  │
  │  ◀── state:update ─────────────────────────  stateManager.modify({ discomfortCount })
  │  GlitchOrbSystem.sync(count) 호출            │
  │  → 3D Orb 생성/제거                          │
  │                                              │
  │  ④ 글리치 구체 클릭                           │
  │  → clean IPC 전송 ──────────────────────▶   onAction('clean')
  │                                              │  discomfortCount -= 1
  │                                              │  MemoryStore.record('cleaned')
  │                                              │
  │  ⑤ PresenceDetector.onUserReturn             │
  │                                        ◀───  isSleeping = false
  │                                              │  MemoryStore.record('woke_up')
  │                                              │  dialog → "...어, 왔어?"
```

---

## Phase 1: 버그 수정 — 상호작용 메모리 및 학대 감지

### 1.1 ISSUE-020: applyInteraction 원자적 호출 보장

**문제**: `src/main/index.ts`의 `onAction` 핸들러에서 스탯 변동(`stateManager.modify()`)은 이뤄지지만, `stateManager.applyInteraction()`이 호출되지 않아 `MemoryStore`에 상호작용 이력이 기록되지 않는다.

**해결 방안**: `onAction` 내 모든 상호작용 분기에서 `stateManager.applyInteraction(event)` 호출을 보장한다.

수정 대상: `src/main/index.ts`

```typescript
// 변경 전 (버그 있음)
if (Object.keys(delta).length > 0) {
  stateManager.modify(delta);
}

// 변경 후 (수정)
// applyInteraction이 내부적으로 modify + MemoryStore.record를 단일 루프로 처리
stateManager.applyInteraction({
  type: event.type,
  delta,
  context: event.context ?? {},
});
```

**StateManager 보완**: `applyInteraction(event)` 메서드가 스탯 변동 적용과 메모리 이벤트 생성을 원자적으로 수행하도록 정의를 보완한다.

수정 대상: `src/main/state/index.ts` (또는 `StateManager` 클래스)

### 1.2 ISSUE-021: 클릭 어뷰즈 → `beating` 상호작용 전환

**문제**: `src/renderer/interaction/index.ts`에서 `clickDetector.isClickAbuse() === true` 시 이벤트를 Mute(무시)하여, 메인으로 아무런 신호도 가지 않는다.

**해결 방안**: 어뷰즈 감지 시 이벤트를 삼키지 않고, `{ type: 'beating' }` 전용 인터랙션으로 IPC 전송한다.

수정 대상: `src/renderer/interaction/index.ts`

```typescript
// 변경 전 (버그 있음)
if (!clickDetector.isClickAbuse()) {
  eventCallbacks.onClick?.();
}

// 변경 후 (수정)
if (clickDetector.isClickAbuse()) {
  // 학대 행위 → beating으로 별도 전송
  window.noah.sendInteraction({ type: 'beating' });
} else {
  eventCallbacks.onClick?.();
}
```

**메인 프로세스 `beating` 처리 추가**: `src/main/emotion/interaction-effects.ts`의 `INTERACTION_EFFECTS`에 `beating` 항목을 추가한다.

```typescript
// 신규 추가
beating: { affection: -15, morality: -8, trauma: 10 }, // click abuse burst
```

**타입 확장**: `src/shared/types/index.ts`의 `InteractionType` union에 `'beating'` 추가.

---

## Phase 2: 기능 완성 — 사료 종류 시스템 (Midterm Q2)

### 2.1 FoodType 타입 및 효과 테이블

**배경**: Midterm Alignment Check Q2 결정에 따라 단순 `feed` 트리거를 3종 사료 선택 방식으로 전환하되, `foodType` 파라미터를 IPC 페이로드에 포함시켜 미래 코인 경제(v2) 확장성을 확보한다.

신규 타입 추가: `src/shared/types/index.ts`

```typescript
export type FoodType = 'kibble' | 'premium' | 'luxury';

export interface FoodEffect {
  hungerReduction: number;  // 허기 감소량
  affectionGain: number;    // 애정도 상승량
  label: string;            // 사용자 표시 이름
}
```

신규 상수 추가: `src/shared/constants/index.ts`

```typescript
export const FOOD_EFFECTS: Record<FoodType, FoodEffect> = {
  kibble:  { hungerReduction: 20, affectionGain:  5, label: '기본 사료 (Kibble)' },
  premium: { hungerReduction: 35, affectionGain: 15, label: '프리미엄 사료 (Premium)' },
  luxury:  { hungerReduction: 50, affectionGain: 25, label: '고급 사료 (Luxury)' },
};
```

### 2.2 IPC 페이로드 확장

`InteractionEvent` 타입에 `foodType` 옵션 필드 추가: `src/shared/types/index.ts`

```typescript
export interface InteractionEvent {
  type: InteractionType;
  velocity?: number;
  foodType?: FoodType;    // feed 시 사료 종류
}
```

### 2.3 메인 프로세스 처리 업데이트

`src/main/emotion/interaction-effects.ts`의 `applyInteraction`에서 `feed` 타입일 때 `foodType` 기반 효과를 적용하도록 수정.

```typescript
if (type === 'feed') {
  const foodType = context.foodType ?? 'kibble';
  const effect = FOOD_EFFECTS[foodType];
  return {
    hunger: clampStat(state.hunger - effect.hungerReduction),
    affection: clampStat(state.affection + effect.affectionGain),
  };
}
```

### 2.4 렌더러 사료 선택 UI

`src/renderer/index.ts`에 사료 선택 드롭다운 또는 버튼 3개를 DOM에 추가하고, 선택된 `foodType`을 `sendInteraction({ type: 'feed', foodType })` IPC에 포함하여 전송한다.

---

## Phase 3: 기능 완성 — 디지털 글리치 오염 구체 (ISSUE-023)

### 3.1 GlitchOrbSystem 렌더러 모듈 신규 구현

새 파일: `src/renderer/glitch-orb.ts`

```typescript
import * as THREE from 'three';

export class GlitchOrbSystem {
  private scene: THREE.Scene;
  private orbs: THREE.Mesh[] = [];
  private readonly MAX_ORBS = 3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** discomfortCount 변화 시 호출 — orb 개수를 동기화 */
  sync(count: number): void {
    // 현재 orb 수보다 많으면 추가, 적으면 제거
    while (this.orbs.length < count) this.addOrb();
    while (this.orbs.length > count) this.removeLastOrb();
  }

  private addOrb(): void {
    const geo = new THREE.SphereGeometry(0.12, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.2, 0.8, 0.9),
      emissive: new THREE.Color(0.0, 0.5, 0.7),
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.6,
      wireframe: Math.random() > 0.5,
    });
    const orb = new THREE.Mesh(geo, mat);
    // 방 바닥 근처 랜덤 위치 배치
    orb.position.set(
      (Math.random() - 0.5) * 1.2,
      0.15 + Math.random() * 0.2,
      (Math.random() - 0.5) * 0.8,
    );
    orb.userData.isGlitchOrb = true;
    this.scene.add(orb);
    this.orbs.push(orb);
  }

  private removeLastOrb(): void {
    const orb = this.orbs.pop();
    if (orb) this.scene.remove(orb);
  }

  /** 매 프레임 회전 애니메이션 */
  update(delta: number): void {
    for (const orb of this.orbs) {
      orb.rotation.y += delta * 1.2;
      orb.rotation.x += delta * 0.6;
    }
  }

  /** Raycaster 히트 대상 목록 반환 (InteractionManager 연동용) */
  getTargets(): THREE.Mesh[] {
    return [...this.orbs];
  }

  dispose(): void {
    for (const orb of this.orbs) this.scene.remove(orb);
    this.orbs = [];
  }
}
```

### 3.2 InteractionManager에 글리치 구체 레이캐스트 통합

`src/renderer/interaction/index.ts`의 레이캐스트 대상 목록에 `GlitchOrbSystem.getTargets()`를 포함한다. 구체가 클릭되면:

1. `GlitchOrbSystem`에서 해당 orb를 즉시 제거 (시각적 피드백)
2. `window.noah.sendInteraction({ type: 'clean' })` IPC 전송

### 3.3 state:update 리스너에서 discomfortCount 동기화

`src/renderer/index.ts`의 `onStateUpdate` 콜백에서 `state.discomfortCount`를 읽어 `glitchOrbSystem.sync(state.discomfortCount)`를 호출한다.

> **전제 조건**: `NoahState`에 `discomfortCount: number` 필드가 없다면 `src/shared/types/index.ts`에 추가해야 한다.

---

## Phase 4: 기능 완성 — OS 활동 감지 시 자동 기상 (ISSUE-022)

### 4.1 PresenceDetector.onUserReturn 활용

`src/main/session/detector.ts`의 `onUserReturn` 이벤트(또는 `onActive` 트리거)가 발생하는 시점에, `state.isSleeping === true`이면 즉시 깨운다.

수정 대상: `src/main/index.ts` (또는 `detector.ts`의 콜백 등록부)

```typescript
presenceDetector.onUserReturn(() => {
  const state = stateManager.getState();
  if (state.isSleeping) {
    stateManager.modify({ isSleeping: false });
    memoryStore.record({
      type: 'system_event',
      description: 'woke_up_by_user_return',
      severity: 2,
      emotionalState: state.emotion,
    });
    // 기상 대사 전송
    sendDialog(mainWindow.webContents, '...어, 왔어?');
  }
});
```

### 4.2 기상 dialog 채널 확인

`sendDialog`가 렌더러의 `dialog-bubble.ts`를 통해 올바르게 노출되는지 확인. 기존 `ipc/dialog.ts` 채널 재사용.

---

## 테스트 계획

### 신규 테스트 (목표 +30~35개)

| 파일 | 테스트 내용 | 목표 수 |
|------|------------|--------|
| `tests/main/state.test.ts` (확장) | `applyInteraction` 원자적 동작 — modify + MemoryStore 동시 검증 | 4+ |
| `tests/renderer/interaction.test.ts` | `beating` IPC 전송 (abuse 임계 초과 시) | 3+ |
| `tests/main/emotion/interaction-effects.test.ts` (확장) | `beating` 효과 테이블, `feed(foodType)` 3종 차별 효과 | 6+ |
| `tests/shared/types.test.ts` (신규) | `FoodType` 유효값, `FOOD_EFFECTS` 상수 범위 | 4+ |
| `tests/renderer/glitch-orb.test.ts` (신규) | `sync(count)` orb 생성/제거, `getTargets()` 반환 수 | 5+ |
| `tests/main/session.test.ts` (확장) | `onUserReturn` → `isSleeping` 해제 + MemoryStore 기록 | 4+ |

### 통합 검증

- `npm test` → 510+ passed (현재 479)
- `npm run build` → clean (0 error)
- 수동 확인: 사료 3종 선택 → 허기 차별 감소, 글리치 구체 클릭 → 제거 + 스탯 회복

---

## 예상 영향 범위

| 파일 | 변경 유형 | 예상 작업량 |
|------|----------|------------|
| `src/shared/types/index.ts` | 확장 (`FoodType`, `FoodEffect`, `beating` InteractionType 추가, `discomfortCount` 필드) | ~10분 |
| `src/shared/constants/index.ts` | 확장 (`FOOD_EFFECTS` 추가) | ~5분 |
| `src/main/index.ts` | 수정 (`applyInteraction` 통합, `onUserReturn` wake 로직) | ~20분 |
| `src/main/state/index.ts` | 수정 (`applyInteraction` 원자적 보완) | ~15분 |
| `src/main/emotion/interaction-effects.ts` | 확장 (`beating`, `feed(foodType)` 분기) | ~10분 |
| `src/renderer/interaction/index.ts` | 수정 (click abuse → `beating` IPC 전환) | ~10분 |
| `src/renderer/glitch-orb.ts` | **신규** | ~30분 |
| `src/renderer/index.ts` | 확장 (GlitchOrbSystem 통합, 사료 UI 버튼, discomfortCount 동기화) | ~20분 |
| `tests/` (6개 파일) | **신규/확장** | ~60분 |

**총 예상 소요 시간**: ~3~4시간

---

## 리스크 및 고려사항

### 1. `discomfortCount` NoahState 필드 존재 여부
`src/shared/types/index.ts`에 `discomfortCount`가 현재 없을 수 있다. `src/main/emotion/discomfort.ts`가 내부 카운터를 관리하는지, 아니면 `NoahState`에 반영하는지 확인 후 타입 확장 결정.

### 2. `applyInteraction` StateManager 인터페이스 변경
`StateManager.applyInteraction()` 시그니처가 변경되면 기존 테스트(`tests/main/state.test.ts`)에서 깨지는 케이스가 있을 수 있다. 점진적으로 수정.

### 3. 글리치 구체 레이캐스트 우선순위
아바타와 글리치 구체의 레이캐스트 순서가 충돌하면 아바타 클릭이 가로막힌다. `Raycaster.intersectObjects`의 결과 배열에서 `isGlitchOrb` 태그 우선 처리 로직 필요.

### 4. 사료 UI 미래 확장성
사료 선택 UI는 현재 DOM 버튼으로 단순 구현한다. 미래 Noah Coin 경제 연동 시, 잔액 표시 및 비활성화 처리를 버튼 컴포넌트에 추가하는 방향으로 설계할 것.

---

## 체크리스트

- [ ] Phase 1.1: ISSUE-020 — `applyInteraction` 원자적 호출 보장 + 테스트 4+
- [ ] Phase 1.2: ISSUE-021 — click abuse → `beating` IPC 전환 + 테스트 3+
- [ ] Phase 2.1: `FoodType` 타입 + `FOOD_EFFECTS` 상수 추가
- [ ] Phase 2.2: IPC `InteractionEvent.foodType` 페이로드 확장
- [ ] Phase 2.3: 메인 `feed(foodType)` 분기 처리 + 테스트 6+
- [ ] Phase 2.4: 렌더러 사료 선택 UI (3종 버튼/드롭다운)
- [ ] Phase 3.1: `GlitchOrbSystem` 신규 구현 + 테스트 5+
- [ ] Phase 3.2: InteractionManager 레이캐스트에 글리치 구체 통합
- [ ] Phase 3.3: `state:update` → `glitchOrbSystem.sync()` 연결
- [ ] Phase 4.1: ISSUE-022 — `onUserReturn` 자동 기상 로직 + 테스트 4+
- [ ] Phase 4.2: 기상 dialog `'...어, 왔어?'` 전송 확인
- [ ] 최종 검증: `npm test` 510+ passed, `npm run build` clean

---

## 다음 스테이지 (Stage 08 예고)

Stage 08은 로드맵 상 **"Dialog and Communication System"** — 감정 컨텍스트 기반 다이얼로그 데이터베이스 구축, 대화창(Terminal Dialog Window) 구현, TTS 연동이 주 목표다.

| 항목 | 설명 |
|------|------|
| **Dialog Database** | 감정별 대사 카탈로그 JSON/TS 구조화 |
| **Terminal Dialog Window** | 전체 대화 이력 표시 창 (hotkey 접근) |
| **TTS Integration** | emotion-aware 음성 합성 |
| **Context Menu** | 우클릭 → 감정별 컨텍스트 옵션 |

---

*작성일: 2026-06-07 | 참고: [ISSUE-020](../docs/issues/진행예정/ISSUE-020_상호작용_실행_시_기억_유실_버그.md), [ISSUE-021](../docs/issues/진행예정/ISSUE-021_연속_타격_시_학대_이벤트_유실_버그.md), [ISSUE-022](../docs/issues/진행예정/ISSUE-022_사용자_OS_활동_재개_시_동적_기상_연동.md), [ISSUE-023](../docs/issues/진행예정/ISSUE-023_디지털_글리치_오염_체체_가시화_및_클릭_청소.md), [Midterm Alignment Check](../docs/guides/Midterm_Alignment_Check.md)*
