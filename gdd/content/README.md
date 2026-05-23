# Content Catalog

> Specific content items: dialogs, items, rooms, animations.

## Dialog Database

Dialogs are organized by emotion and context.

### Format
```typescript
interface DialogEntry {
  id: string;
  emotion: Emotion;
  context: string;        // e.g., "greeting", "complaint", "thanks"
  text: string;           // {ko, en, ja, etc.}
  weight: number;         // Selection probability
  cooldown?: number;      // Seconds before repeat
  conditions?: Condition[]; // Optional prerequisites
}
```

### Example Entries

| ID | Emotion | Context | Text (KO) |
|----|---------|---------|-----------|
| greet-happy-1 | Happy | greeting | "왔다! 기다렸어~" |
| greet-sad-1 | Sad | greeting | "...아, 왔구나." |
| hunger-complain-1 | Hungry | complaint | "배고파... 뭐 먹을 거 없어?" |
| trauma-flinch-1 | Traumatized | reaction | "(움찔) ...미안, 놀랐어." |

## Items & Clothing

| ID | Name | Type | Unlock Level | Description |
|----|------|------|-------------|-------------|
| outfit-default | 기본 옷 | Default | 0 | 기본 제공 |
| outfit-pajama | 파자마 | Outfit | 5 | 수면용 귀여운 파자마 |
| outfit-casual | 캐주얼 | Outfit | 15 | 편한 일상복 |
| accessory-glasses | 안경 | Accessory | 10 | 지적인 느낌 |

## Rooms

| ID | Name | Level | Features |
|----|------|-------|----------|
| room-default | 기본 방 | 0 | 침대, 책상, 창문 |
| room-garden | 정원 | 20 | 실내 식물, 자연광 |
| room-gaming | 게이밍 방 | 35 | RGB, 모니터, 의자 |

## Animations

| ID | Name | Trigger | Length | Priority |
|----|------|---------|--------|----------|
| anim-idle | 대기 | Default | Loop | 0 |
| anim-drag | 끌기 | Drag start | Loop | 5 |
| anim-throw | 날아감 | Throw | 1.5s | 8 |
| anim-land | 착지 | Throw end | 0.5s | 8 |
| anim-dizzy | 어지러움 | Hard landing | 2s | 7 |
| anim-eat | 먹기 | Feed | 3s | 6 |
| anim-sleep | 잠 | Sleep start | Loop | 4 |
| anim-happy | 기쁨 | High affection | 2s | 5 |
| anim-sad | 슬픔 | Low affection | Loop | 3 |
| anim-angry | 화남 | Angry state | Loop | 4 |

---

*Content makes the skeleton feel alive. Good content > lots of content.*
