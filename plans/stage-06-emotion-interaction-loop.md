# STAGE-06: Emotion-Interaction Loop

## 목표

Noah의 **감정 상태(Emotion)**와 **사용자 상호작용(Interaction)**이 실시간으로 연결되는 핵심 게임플레이 루프를 구현한다.

Stage 5까지는 아바타 로딩, 애니메이션 파이프라인, 입력 감지 시스템이 각각 독립적으로 동작했다. Stage 6에서는 이들을 하나의 생태계로 통합:

- 사용자의 입력(드래그, 쓰다듬기, 클릭) → 감정 상태 변화 → Noah의 반응(표정 + 애니메이션 + 대화)
- 시간 경과에 따른 욕구 감소(배고픔, 피로) → 감정 상태 변화 → Noah의 자율 행동
- 감정 상태가 애니메이션과 VRM BlendShape 표정에 실시간 반영

---

## 현재 상태 (AS-IS)

### 이미 구현된 것

| 시스템 | 파일 | 상태 | 설명 |
|--------|------|------|------|
| VRM 아바타 로딩 | `src/renderer/avatar.ts` | ✅ 완료 | GLB + @pixiv/three-vrm, 텍스처 내장 |
| 애니메이션 시스템 | `src/renderer/animation/` | ✅ 완료 | 10개 트리거, 우선순위, 블렌딩, VRM Expression |
| 입력 감지 | `src/renderer/interaction/` | ✅ 완료 | hover, drag, pet, click, velocity 측정 |
| 감정 매핑 | `src/renderer/animation/emotion-mapper.ts` | ✅ 완료 | Emotion → bodyAnimation + expression + intensity |
| AnimationSystem.setEmotion() | `src/renderer/animation/index.ts` | ✅ 완료 | `setEmotion(emotion, intensity?)` API 이미 존재 |
| NoahState + Emotion 타입 | `src/shared/types/index.ts` | ✅ 완료 | 16개 Emotion union (happy, sad, angry, scared, playful, tired, hungry, sick, traumatized, submissive, excited, bored, lonely, grateful, jealous, hostage), affection/morality/hunger/fatigue/trauma 필드 |
| Emotion Resolver (shared) | `src/shared/utils/index.ts` | ✅ 완료 | `resolveEmotion()` — shared/pure 함수로 이미 구현됨 |
| Needs 상수 | `src/shared/constants/index.ts` | ✅ 완료 | HUNGER_DECAY_RATE, FATIGUE_DECAY_RATE, AFFECTION_DECAY_RATE, TRAUMA_DECAY_RATE, ABSENCE_* 시리즈 |
| Interaction 상수 | `src/shared/constants/index.ts` | ✅ 부분 | PET_AFFECTION_GAIN(3), FEED_HUNGER_REDUCTION(25), SLEEP_FATIGUE_REDUCTION(40), PLAY_AFFECTION_GAIN(2), PLAY_FATIGUE_COST(10) — drag/throw/click/clean 상수는 없음 |
| IPC 채널 (state/interaction) | `src/main/ipc/`, `src/main/preload.ts` | ✅ 완료 | `state:request`/`state:update`, `action:interaction`/`sendInteraction` 이미 구현 |
| Absence decay | `src/shared/utils/index.ts` | ✅ 완료 | `reconcileAbsence()` — absence(유저 부재) 시 hunger/fatigue/affection decay |

### 아직 없는 것

| 시스템 | 필요 이유 |
|--------|----------|
| **Online Needs Decay** | 유저 접속 중 실시간 hunger/fatigue 증가 로직 (기존 `reconcileAbsence`는 부재 전용) |
| **Interaction Effects** | 사용자 입력이 NoahState 파라미터에 미치는 영향 로직 (drag/throw/pet/click/feed/clean) |
| **Interaction → Main Bridge (renderer)** | renderer의 interaction 콜백을 main process IPC로 전달하는 연결 코드 |
| **Cooldown Manager** | 연속 입력 방지 (pet 3초, throw 2초 등) |
| **Thought Cycle** | 주기적으로 Noah가 "생각"하고 자율 행동/표현을 결정하는 루프 |
| **Dialog Bubble** | Noah의 감정 상태를 텍스트로 표현하는 UI |
| **Dialog/Thought IPC 채널** | main → renderer로 dialog 표시/자율행동 전달 채널 |

---

## 대상 아키텍처 (TO-BE)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            STAGE-06 ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│   │   User Input │     │   Time Tick  │     │   System     │                │
│   │  (mouse, key)│     │  (1 per sec) │     │   Events     │                │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘                │
│          │                    │                    │                         │
│          ▼                    ▼                    ▼                         │
│   ┌─────────────────────────────────────────────────────────┐               │
│   │              Interaction Manager (renderer)              │               │
│   │         drag / throw / pet / click / hover              │               │
│   └─────────────────────────┬───────────────────────────────┘               │
│                             │                                                │
│                             ▼                                                │
│   ┌─────────────────────────────────────────────────────────┐               │
│   │              Emotion Engine (main process)               │               │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │               │
│   │  │  State      │  │  Needs      │  │  Emotion        │  │               │
│   │  │  Manager    │◄─┤  Decay      │◄─┤  Resolver       │  │               │
│   │  │  (existing) │  │  (new)      │  │  (shared util)  │  │               │
│   │  └─────────────┘  └─────────────┘  └─────────────────┘  │               │
│   └─────────────────────────┬───────────────────────────────┘               │
│                             │                                                │
│              ┌──────────────┼──────────────┐                                │
│              ▼              ▼              ▼                                │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│   │  Animation   │  │   Dialog     │  │   Thought    │                     │
│   │  System      │  │   Bubble     │  │   Cycle      │                     │
│   │  (existing)  │  │   (new)      │  │   (new)      │                     │
│   └──────────────┘  └──────────────┘  └──────────────┘                     │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────┐               │
│   │                    Renderer Output                       │               │
│   │         VRM Avatar + Expression + Animation              │               │
│   │              + Dialog Bubble + Metrics                   │               │
│   └─────────────────────────────────────────────────────────┘               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Emotion Engine (Main Process)

### 1.1 Emotion Resolver

새 파일: `src/main/emotion/resolver.ts`

**⚠️ 중요: shared/utils의 resolveEmotion()을 재사용**

`src/shared/utils/index.ts`에 **이미 `resolveEmotion()`이 구현되어 있음**. 여기서는 main process 전용 wrapper만 생성:

```typescript
import { resolveEmotion as sharedResolve } from '../../shared/utils/index.js';
import type { Emotion, NoahState } from '../../shared/types/index.js';

/**
 * Main-process emotion resolver.
 * Wraps the shared pure resolver with main-process-specific logic
 * (e.g., recent events override, cooldown checks).
 */
export function resolveEmotion(state: NoahState): Emotion {
  // Shared heuristics: trauma > 80 → traumatized, trauma > 50 → scared,
  // hunger > 80 → hungry, fatigue > 80 → tired, affection-based mood
  const base = sharedResolve(state);

  // Main-process overrides (future: memory-influence, LLM output, etc.)
  // For Stage 6, just pass through
  return base;
}
```

**Emotion 타입**: `src/shared/types/index.ts`의 `Emotion` union (16개 값)을 그대로 사용. 새 타입 정의 불필요.

### 1.2 Needs Decay System (Online)

새 파일: `src/main/emotion/needs.ts`

**⚠️ 중요: shared/constants의 기존 상수 재사용**

이미 존재하는 상수:
- `HUNGER_DECAY_RATE = 0.01` (≈ +0.6/min)
- `FATIGUE_DECAY_RATE = 0.005` (≈ +0.3/min)
- `AFFECTION_DECAY_RATE = 0.002`
- `TRAUMA_DECAY_RATE = 0.0005`

```typescript
import { HUNGER_DECAY_RATE, FATIGUE_DECAY_RATE, TRAUMA_DECAY_RATE, STAT_MAX, STAT_MIN } from '../../shared/constants/index.js';
import { clampStat } from '../../shared/utils/index.js';
import type { NoahState } from '../../shared/types/index.js';

export interface NeedsConfig {
  hungerRate: number;         // per second (default: HUNGER_DECAY_RATE)
  fatigueRate: number;        // per second (default: FATIGUE_DECAY_RATE)
  traumaDecayRate: number;    // per second (default: TRAUMA_DECAY_RATE)
  activeHungerMultiplier: number;  // 1.5x when playing
  traumaHungerMultiplier: number;  // 2x when trauma > 50
}

export class OnlineNeedsDecay {
  private lastTick: number = Date.now();
  private config: NeedsConfig;

  constructor(config?: Partial<NeedsConfig>) {
    this.config = {
      hungerRate: HUNGER_DECAY_RATE,
      fatigueRate: FATIGUE_DECAY_RATE,
      traumaDecayRate: TRAUMA_DECAY_RATE,
      activeHungerMultiplier: 1.5,
      traumaHungerMultiplier: 2,
      ...config,
    };
  }

  tick(state: NoahState, isActive: boolean): Partial<NoahState> {
    const now = Date.now();
    const seconds = (now - this.lastTick) / 1000;
    this.lastTick = now;

    let hungerMod = 1;
    let fatigueMod = 1;

    if (isActive) {
      hungerMod = this.config.activeHungerMultiplier;
      fatigueMod = 2;
    }
    if (state.trauma > 50) {
      hungerMod *= this.config.traumaHungerMultiplier;
      fatigueMod *= 2;
    }

    return {
      hunger: clampStat(state.hunger + seconds * this.config.hungerRate * hungerMod),
      fatigue: clampStat(state.fatigue + seconds * this.config.fatigueRate * fatigueMod),
      trauma: clampStat(state.trauma - seconds * this.config.traumaDecayRate),
    };
  }

  reset(): void {
    this.lastTick = Date.now();
  }
}
```

### 1.3 Interaction Effects

새 파일: `src/main/emotion/interaction-effects.ts`

**⚠️ 중요: shared/constants의 기존 interaction 상수와 통합**

기존 상수: `PET_AFFECTION_GAIN = 3`, `FEED_HUNGER_REDUCTION = 25`, `SLEEP_FATIGUE_REDUCTION = 40`, `PLAY_AFFECTION_GAIN = 2`, `PLAY_FATIGUE_COST = 10`

```typescript
import { STAT_MIN, STAT_MAX } from '../../shared/constants/index.js';
import {
  PET_AFFECTION_GAIN,
  FEED_HUNGER_REDUCTION,
  SLEEP_FATIGUE_REDUCTION,
  PLAY_AFFECTION_GAIN,
  PLAY_FATIGUE_COST,
} from '../../shared/constants/index.js';
import { clampStat } from '../../shared/utils/index.js';
import type { InteractionType, NoahState } from '../../shared/types/index.js';

export interface InteractionEffect {
  affection?: number;
  morality?: number;
  hunger?: number;
  fatigue?: number;
  trauma?: number;
}

/**
 * Effect table — all values are deltas (positive = increase).
 * Uses existing constants where available.
 */
export const INTERACTION_EFFECTS: Record<InteractionType, InteractionEffect> = {
  drag: { affection: 1, fatigue: 2 },              // gentle
  throw: { affection: -5, fatigue: 5 },             // rough
  pet: { affection: PET_AFFECTION_GAIN },           // +3
  click: { affection: -10, morality: -5, trauma: 5 }, // "mouse beating"
  feed: { affection: 10, hunger: -FEED_HUNGER_REDUCTION }, // -25
  clean: { affection: 5, morality: 3, trauma: -2 },
  sleep: {}, // handled by OnlineNeedsDecay
  play: { affection: PLAY_AFFECTION_GAIN, fatigue: PLAY_FATIGUE_COST }, // +2, +10
};

export function applyInteraction(
  state: NoahState,
  type: InteractionType,
  context: { velocity?: number; isGentle?: boolean }
): Partial<NoahState> {
  const effect = INTERACTION_EFFECTS[type];
  const result: Partial<NoahState> = {};

  // Velocity modifier for throw
  if (type === 'throw' && context.velocity !== undefined) {
    const isHard = context.velocity > 5;
    result.affection = clampStat(state.affection + (isHard ? -5 : 2));
    result.trauma = clampStat(state.trauma + (isHard ? 5 : 0));
    result.fatigue = clampStat(state.fatigue + (isHard ? 8 : 2));
    return result;
  }

  // Apply standard effects
  for (const [key, delta] of Object.entries(effect)) {
    if (delta !== undefined && delta !== 0) {
      const current = state[key as keyof NoahState] as number;
      result[key as keyof InteractionEffect] = clampStat(current + delta);
    }
  }

  return result;
}
```

### 1.4 Cooldown Manager

새 파일: `src/main/emotion/cooldowns.ts`

```typescript
import type { InteractionType } from '../../shared/types/index.js';

export interface CooldownConfig {
  drag: number;       // 0.5 seconds
  throw: number;      // 2 seconds
  pet: number;        // 3 seconds
  click: number;      // 1 second
  feed: number;       // 300 seconds (5 minutes)
  clean: number;      // 60 seconds (1 minute)
  sleep: number;      // 0 (handled by state)
  play: number;       // 600 seconds (10 minutes)
}

export const DEFAULT_COOLDOWNS: CooldownConfig = {
  drag: 0.5,
  throw: 2,
  pet: 3,
  click: 1,
  feed: 300,
  clean: 60,
  sleep: 0,
  play: 600,
};

export class CooldownManager {
  private cooldowns = new Map<InteractionType, number>();
  private config: CooldownConfig;

  constructor(config?: Partial<CooldownConfig>) {
    this.config = { ...DEFAULT_COOLDOWNS, ...config };
  }

  canExecute(type: InteractionType): boolean {
    const last = this.cooldowns.get(type);
    if (!last) return true;
    return Date.now() - last >= this.config[type] * 1000;
  }

  record(type: InteractionType): void {
    this.cooldowns.set(type, Date.now());
  }

  reset(): void {
    this.cooldowns.clear();
  }
}
```

---

## Phase 2: Thought Cycle

### 2.1 Thought Cycle Engine

새 파일: `src/main/emotion/thought-cycle.ts`

Noah가 주기적으로 "생각"하고 자율 행동을 결정하는 루프:

```typescript
import { resolveEmotion } from '../../shared/utils/index.js';
import type { Emotion, NoahState } from '../../shared/types/index.js';

export interface ThoughtCycleConfig {
  intervalMs: number;      // 기본 5000ms (5초)
  minIntervalMs: number;   // 최소 1000ms
  maxIntervalMs: number;   // 최대 30000ms
}

export interface Thought {
  emotion: Emotion;
  dominantNeed: string;
  text: string;
}

export interface AutonomousAction {
  type: 'dialog' | 'animation' | 'expression';
  payload: string;        // dialog text, animation trigger, or expression name
}

export class ThoughtCycle {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private config: ThoughtCycleConfig;

  constructor(config?: Partial<ThoughtCycleConfig>) {
    this.config = {
      intervalMs: 5000,
      minIntervalMs: 1000,
      maxIntervalMs: 30000,
      ...config,
    };
  }

  start(state: NoahState, callbacks: {
    onThink: (thought: Thought) => void;
    onAction: (action: AutonomousAction) => void;
  }): void {
    this.scheduleNext(state, callbacks);
  }

  private scheduleNext(state: NoahState, callbacks: {
    onThink: (thought: Thought) => void;
    onAction: (action: AutonomousAction) => void;
  }): void {
    const interval = this.calculateInterval(state);
    this.timer = setTimeout(() => {
      const thought = this.generateThought(state);
      callbacks.onThink(thought);

      const action = this.decideAction(state, thought);
      if (action) callbacks.onAction(action);

      this.scheduleNext(state, callbacks);
    }, interval);
  }

  private calculateInterval(state: NoahState): number {
    const fatigueFactor = 1 + (state.fatigue / 100);
    const traumaJitter = state.trauma > 50 ? Math.random() * 5000 : 0;

    return Math.min(
      this.config.maxIntervalMs,
      Math.max(this.config.minIntervalMs, this.config.intervalMs * fatigueFactor + traumaJitter)
    );
  }

  private generateThought(state: NoahState): Thought {
    return {
      emotion: resolveEmotion(state),
      dominantNeed: this.findDominantNeed(state),
      text: this.pickRandomThought(state),
    };
  }

  private findDominantNeed(state: NoahState): string {
    if (state.hunger > 70) return 'hunger';
    if (state.fatigue > 80) return 'fatigue';
    if (state.trauma > 50) return 'trauma';
    if (state.affection < 20) return 'affection';
    return 'content';
  }

  private pickRandomThought(state: NoahState): string {
    if (state.hunger > 70) return '...배고파';
    if (state.fatigue > 80) return '...졸려';
    if (state.trauma > 50) return '...무서워';
    if (state.affection > 80) return '함께 있어서 행복해!';
    if (state.affection < 20) return '...외로워';
    return '...';
  }

  private decideAction(state: NoahState, thought: Thought): AutonomousAction | null {
    if (state.hunger > 70 && Math.random() < 0.3) {
      return { type: 'dialog', payload: '...배고파' };
    }
    if (state.fatigue > 80 && Math.random() < 0.5) {
      return { type: 'animation', payload: 'sleep' };
    }
    if (state.trauma > 50 && Math.random() < 0.2) {
      return { type: 'expression', payload: 'scared' };
    }
    return null;
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
```

### 2.2 Emotion Engine (Public API)

새 파일: `src/main/emotion/index.ts`

```typescript
export { OnlineNeedsDecay } from './needs.js';
export { applyInteraction } from './interaction-effects.js';
export { CooldownManager, DEFAULT_COOLDOWNS } from './cooldowns.js';
export { ThoughtCycle } from './thought-cycle.js';
export type { Thought, AutonomousAction, ThoughtCycleConfig } from './thought-cycle.js';
export type { NeedsConfig } from './needs.js';
export type { InteractionEffect } from './interaction-effects.js';
export type { CooldownConfig } from './cooldowns.js';
```

---

## Phase 3: Renderer Integration

### 3.1 Emotion → Animation Bridge

`src/renderer/index.ts`에 Emotion 수신 및 AnimationSystem 연결:

```typescript
// 이미 구현된 API:
// animationSystem.setEmotion(emotion: Emotion, intensity?: number): void
// animationSystem.overrideExpression(emotion: Emotion, duration?: number): void

let lastEmotion: Emotion | null = null;

noah.onStateUpdate((state: NoahState) => {
  // Update animation based on emotion
  if (animationSystem && state.emotion) {
    animationSystem.setEmotion(state.emotion);
  }

  // Update dialog bubble if emotion changed significantly
  if (dialogBubble && state.emotion !== lastEmotion) {
    dialogBubble.showEmotion(state.emotion);
  }

  lastEmotion = state.emotion;
});
```

### 3.2 Interaction → Main Bridge

`src/renderer/index.ts` — 이미 구현된 `sendInteraction` IPC를 활용:

```typescript
// ⚠️ sendInteraction은 이미 preload.ts에 구현되어 있음
// ipcRenderer.send('action:interaction', action) 으로 main process에 전달

interaction.setEventCallbacks({
  onDragStart() {
    animationSystem.playInteraction('drag');
    noah.sendInteraction({ type: 'drag', timestamp: Date.now() });  // IPC 전달
  },
  onDragEnd(velocity) {
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    animationSystem.playTrigger(speed > 5 ? 'throw' : 'land');
    noah.sendInteraction({
      type: 'throw',
      velocity: { x: velocity.x, y: velocity.y },
      timestamp: Date.now(),
    });
  },
  onPetStart() {
    animationSystem.playTrigger('pet');
    noah.sendInteraction({ type: 'pet', timestamp: Date.now() });
  },
  onClick() {
    animationSystem.playInteraction('click');
    noah.sendInteraction({ type: 'click', timestamp: Date.now() });
  },
});
```

### 3.3 Dialog Bubble

새 파일: `src/renderer/dialog-bubble.ts`

**권장 접근법**: DOM overlay (한글 폰트 지원, 접근성 우수)

```typescript
import type { Emotion } from '../shared/types/index.js';

export interface DialogBubble {
  show(text: string, duration?: number): void;
  showEmotion(emotion: Emotion): void;
  hide(): void;
  update(delta: number): void;
  addToScene(): void;
  remove(): void;
}

export function createDialogBubble(): DialogBubble {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 12px 24px;
    border-radius: 16px;
    font-family: 'Noto Sans KR', sans-serif;
    font-size: 18px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 1000;
  `;
  document.body.appendChild(el);

  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    show(text: string, duration: number = 3000) {
      el.textContent = text;
      el.style.opacity = '1';
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        el.style.opacity = '0';
      }, duration);
    },

    showEmotion(emotion: Emotion) {
      const labels: Record<Emotion, string> = {
        happy: '😊 행복해!',
        sad: '😢 슬퍼...',
        angry: '😠 화났어!',
        scared: '😰 무서워...',
        playful: '😜 놀자!',
        tired: '😴 졸려...',
        hungry: '🍽️ 배고파...',
        sick: '🤒 아파...',
        traumatized: '😱 ...',
        submissive: '🥺 ...',
        excited: '🤩 신나!',
        bored: '😐 심심해...',
        lonely: '😔 외로워...',
        grateful: '🥹 고마워',
        jealous: '😒 ...',
        hostage: '😶 ...',
      };
      this.show(labels[emotion] ?? '...', 2000);
    },

    hide() {
      el.style.opacity = '0';
      if (hideTimer) clearTimeout(hideTimer);
    },

    update(_delta: number) {
      // No per-frame updates needed for DOM-based bubble
    },

    addToScene() {
      // DOM-based, no Three.js scene needed
    },

    remove() {
      el.remove();
    },
  };
}
```

---

## Phase 4: Dialog/Thought IPC 채널

**⚠️ 중요: sendInteraction / action:interaction은 이미 구현 완료**
Phase 4에서는 **dialog 표시**와 **자율행동 전달**을 위한 IPC 채널에 집중

### 4.1 Preload API 확장

`src/main/preload.ts`에 dialog/thought 채널 추가:

```typescript
export interface NoahPreloadAPI {
  // ... existing APIs (isDev, getState, onStateUpdate, sendInteraction, onSystemMetrics) ...

  // Dialog/Thought ← Main (NEW)
  onDialog: (callback: (text: string) => void) => void;
  onAutonomousAction: (callback: (action: { type: string; payload: string }) => void) => void;
}

// 추가할 contextBridge 노출:
onDialog: (callback: (text: string) => void) => {
  ipcRenderer.on('dialog:show', (_event, text) => callback(text));
},
onAutonomousAction: (callback: (action: { type: string; payload: string }) => void) => {
  ipcRenderer.on('action:autonomous', (_event, action) => callback(action));
},
```

### 4.2 IPC Handlers (Main → Renderer)

`src/main/ipc/`에 dialog 전송 함수 추가:

```typescript
// dialog.ts (신규)
import type { BrowserWindow } from 'electron';

export function sendDialog(win: BrowserWindow, text: string): void {
  win.webContents.send('dialog:show', text);
}

export function sendAutonomousAction(
  win: BrowserWindow,
  action: { type: string; payload: string }
): void {
  win.webContents.send('action:autonomous', action);
}
```

---

## Phase 5: 메인 프로세스 초기화

### 5.1 EmotionEngine 초기화

`src/main/index.ts`에 추가:

```typescript
import { OnlineNeedsDecay, CooldownManager, ThoughtCycle } from './emotion/index.js';

// 기존 services 객체에 추가
const onlineNeeds = new OnlineNeedsDecay();
const cooldowns = new CooldownManager();
const thoughtCycle = new ThoughtCycle();

// 시간 기반 needs decay 타이머 (1초마다 tick)
setInterval(() => {
  const state = stateManager.getState();
  const delta = onlineNeeds.tick(state, false); // isActive는 interaction에서 결정
  if (Object.keys(delta).length > 0) {
    stateManager.modify((draft) => ({
      ...draft,
      ...delta,
      emotion: resolveEmotion({ ...draft, ...delta }),
    }));
  }
}, 1000);

// Interaction handler (기존 onAction 콜백 활용)
deps.onAction = (event: InteractionEvent) => {
  if (!cooldowns.canExecute(event.type)) return;
  cooldowns.record(event.type);

  const state = stateManager.getState();
  const delta = applyInteraction(state, event.type, {
    velocity: event.velocity
      ? Math.sqrt(event.velocity.x ** 2 + event.velocity.y ** 2)
      : undefined,
  });

  stateManager.modify((draft) => ({
    ...draft,
    ...delta,
    emotion: resolveEmotion({ ...draft, ...delta }),
  }));
};

// Thought Cycle 시작
thoughtCycle.start(stateManager.getState(), {
  onThink: (thought) => {
    console.log('[Thought]', thought.text);
  },
  onAction: (action) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (action.type === 'dialog') {
        win.webContents.send('dialog:show', action.payload);
      }
    }
  },
});
```

---

## Phase 6: 테스트

### 6.1 단위 테스트

| 테스트 파일 | 내용 | 예상 수 |
|-----------|------|--------|
| `tests/main/emotion/resolver.test.ts` | Emotion resolver wrapper (shared 통과 검증) | 5+ |
| `tests/main/emotion/needs.test.ts` | Online needs decay 계산 | 10+ |
| `tests/main/emotion/interaction-effects.test.ts` | Interaction effect 적용 (기존 constants 일치 검증) | 12+ |
| `tests/main/emotion/cooldowns.test.ts` | Cooldown 관리 | 6+ |
| `tests/main/emotion/thought-cycle.test.ts` | Thought cycle 타이밍 및 상태 기반 결정 | 8+ |
| `tests/renderer/dialog-bubble.test.ts` | Dialog bubble 표시/숨김 | 6+ |

### 6.2 통합 테스트

- `npm run dev` 실행 → 아바타 로딩 → 상호작용 → 감정 변화 → 애니메이션/표정 변화 확인
- 1분 대기 → hunger 증가 → "배고파" 다이얼로그 확인
- 드래그 → throw → trauma 증가 → 표정 변화 확인
- 연속 클릭 → cooldown으로 무시 확인

---

## 예상 영향 범위

| 파일 | 변경 유형 | 예상 작업량 |
|------|----------|------------|
| `src/main/emotion/resolver.ts` | **신규** (shared wrapper) | ~10분 |
| `src/main/emotion/needs.ts` | **신규** | ~15분 |
| `src/main/emotion/interaction-effects.ts` | **신규** (기존 constants 통합) | ~15분 |
| `src/main/emotion/cooldowns.ts` | **신규** | ~10분 |
| `src/main/emotion/thought-cycle.ts` | **신규** | ~30분 |
| `src/main/emotion/index.ts` | **신규** (barrel export) | ~5분 |
| `src/main/ipc/dialog.ts` | **신규** | ~10분 |
| `src/main/preload.ts` | 확장 (onDialog, onAutonomousAction) | ~10분 |
| `src/main/index.ts` | EmotionEngine 초기화 + 타이머 + handler | ~20분 |
| `src/renderer/dialog-bubble.ts` | **신규** | ~30분 |
| `src/renderer/index.ts` | IPC bridge 연결, dialog bubble 추가 | ~20분 |
| `tests/main/emotion/*.test.ts` | **신규** 5개 | ~45분 |
| `tests/renderer/dialog-bubble.test.ts` | **신규** | ~15분 |

**총 예상 소요 시간**: ~3.5-4시간 (기존 중복 제거로 단축)

---

## 리스크 및 고려사항

### 1. Thought Cycle과 LLM의 경계
- Stage 6의 Thought Cycle은 **규칙 기반** (GDD의 수학/로직)
- 향후 LLM 통합 시 Thought Cycle이 LLM의 입력 소스가 됨
- 지금은 단순한 규칙 기반으로 구현, LLM 연동은 별도 스테이지

### 2. Emotion 타입 불일치
- `src/shared/types/index.ts`의 Emotion union (16개)과 계획 문서의 예시 (12개)가 다름
- **기존 Emotion 타입을 우선**으로 사용, 확장은 shared types에서만

### 3. 기존 resolveEmotion()과의 관계
- `src/shared/utils/index.ts`의 `resolveEmotion()`은 **shared pure 함수**
- `src/main/emotion/resolver.ts`는 이 위에 main-process 전용 로직을 더하는 wrapper
- 직접 호출 시 `src/main/index.ts`에서 이미 사용 중인 `resolveEmotion` import와 충돌 방지

### 4. 다이얼로그 버블 디자인
- CanvasTexture vs DOM overlay 두 가지 접근법
- **권장**: DOM overlay (한글 지원, 접근성)

### 5. 메모리 누수
- Thought Cycle의 setTimeout 체인 → 컴포넌트 dispose 시 정리 필수
- Dialog bubble DOM 요소 → 제거 시 remove() 호출
- OnlineNeedsDecay의 interval → 명시적 중단 가능하도록

### 6. Interaction 상수 통일
- 기존 `PET_AFFECTION_GAIN = 3` vs 계획의 `pet: { affection: 5 }` 불일치
- **기존 constants를 우선**으로 interaction-effects.ts에서 사용할 것

### 7. sendInteraction IPC 중복
- `sendInteraction` / `action:interaction` 채널은 **이미 구현 완료**
- Phase 4는 dialog/thought 전용 IPC만 신규 구현

---

## 체크리스트

> **✅ 스테이지 완료** (완료일: 2026-06-07, `npm test` 479 passed)

- [x] Phase 1.1: Emotion Resolver (shared wrapper) 구현 + 테스트 — [`src/main/emotion/resolver.ts`](../src/main/emotion/resolver.ts)
- [x] Phase 1.2: Online Needs Decay 구현 + 테스트 — [`src/main/emotion/needs.ts`](../src/main/emotion/needs.ts)
- [x] Phase 1.3: Interaction Effects 구현 (기존 constants 통합) + 테스트 — [`src/main/emotion/interaction-effects.ts`](../src/main/emotion/interaction-effects.ts)
- [x] Phase 1.4: Cooldown Manager 구현 + 테스트 — [`src/main/emotion/cooldowns.ts`](../src/main/emotion/cooldowns.ts)
- [x] Phase 2.1: Thought Cycle 구현 + 테스트 — [`src/main/emotion/thought-cycle.ts`](../src/main/emotion/thought-cycle.ts)
- [x] Phase 3.1: Emotion → Animation bridge 연결 (기존 setEmotion API 활용)
- [x] Phase 3.2: Interaction → Main bridge 연결 (기존 sendInteraction IPC 활용)
- [x] Phase 3.3: Dialog Bubble 구현 (DOM overlay) — [`src/renderer/dialog-bubble.ts`](../src/renderer/dialog-bubble.ts)
- [x] Phase 4.1: Preload API 확장 (onDialog, onAutonomousAction)
- [x] Phase 4.2: Dialog/Thought IPC handler 구현 — [`src/main/ipc/dialog.ts`](../src/main/ipc/dialog.ts)
- [x] Phase 5.1: main/index.ts EmotionEngine 초기화 (timer + handler + thought cycle)
- [x] Phase 6: 통합 테스트 (`npm run dev` + `npm test`)

**고급 기능 (Stage 06 후반 추가 완료)**
- [x] Affection 온라인 decay (AFFECTION_DECAY_RATE)
- [x] Hunger personality shift (4단계: normal/peckish/irritable/extremely_irritable) — [`src/main/emotion/hunger-personality.ts`](../src/main/emotion/hunger-personality.ts)
- [x] Fatigue → auto sleep trigger (fatigue > 80)
- [x] Discomfort (waste) mechanic (10분 간격, 최대 3개) — [`src/main/emotion/discomfort.ts`](../src/main/emotion/discomfort.ts)
- [x] Ignore detection engine (1분/5분/15분/1시간/4시간+) — [`src/main/emotion/ignore-detection.ts`](../src/main/emotion/ignore-detection.ts)
- [x] Trauma special rules (trauma >= 50 시 passive decay 중단)
- [x] Expression override (trauma mask / submission disguise) — [`src/main/emotion/expression-override.ts`](../src/main/emotion/expression-override.ts)
- [x] Absence return reaction (기상 시 dialog)

---

## 알려진 미완성 항목 → Stage 07로 이관

| 항목 | 이슈 | 내용 |
|------|------|------|
| 상호작용 메모리 유실 버그 | [ISSUE-020](../docs/issues/진행예정/ISSUE-020_상호작용_실행_시_기억_유실_버그.md) | `applyInteraction()` 미호출 → MemoryStore 로그 누락 |
| 클릭 어뷰즈 학대 이벤트 유실 버그 | [ISSUE-021](../docs/issues/진행예정/ISSUE-021_연속_타격_시_학대_이벤트_유실_버그.md) | clickAbuse 시 이벤트 뮤트 → `beating` IPC 미전송 |
| 오염물(Discomfort) 렌더러 미구현 | [ISSUE-023](../docs/issues/진행예정/ISSUE-023_디지털_글리치_오염_체체_가시화_및_클릭_청소.md) | discomfortCount가 화면에 표시 안 됨, 클린 상호작용 없음 |
| 사료 종류 시스템 미구현 | [Midterm Q2](../docs/guides/Midterm_Alignment_Check.md) | feed 고정값 → Kibble/Premium/Luxury 3종으로 분화 필요 |
| OS 활동 감지 시 자동 기상 미구현 | [ISSUE-022](../docs/issues/진행예정/ISSUE-022_사용자_OS_활동_재개_시_동적_기상_연동.md) | 수면 중 사용자 복귀 시 자동 깨어남 없음 |

---

## 다음 스테이지 (Stage 07)

→ [`plans/stage-07-interaction-completion.md`](stage-07-interaction-completion.md)

Stage 07은 Stage 06에서 메인 프로세스 로직 위주로 완성된 감정/상호작용 엔진을 **렌더러 시각화 완성 + 버그 수정 + API 고도화**로 마무리하는 스테이지입니다.

---

*감정은 보이지 않는다. 하지만 Noah의 표정, 몸짓, 말투에서 반드시 드러난다.*