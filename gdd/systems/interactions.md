# Interactions System

> All the ways the user can interact with Noah.

## 📋 구현 가능성 재검토 결과 (2026-05-28)

✅ **구현 가능성**: 완전히 구현 가능  
**현재 상태**: 276개 테스트 통과, interaction 시스템 미구현  
**예상 소요 시간**: 2-3시간

---

### 🔍 기술 검토 결과

| 항목 | 확인 결과 | 수정 필요 여부 |
|------|----------|----------------|
| **interaction 시스템** | 전체 미구현 | 전체 구성 필요 |
| **mouse 추적** | index.ts에 미구현 | 추가 필요 |
| **z-겹침 문제** | 차이 0.51로 충분히 분리됨 | 수정 불필요 |
| **타입 일치성** | 현재 구현에서는 문제 없음 | 수정 불필요 |
| **성능 문제** | CanvasTexture 미사용 | 수정 불필요 |
| **현재 테스트 수** | 276개 통과 | 기준 충족 |

### 📝 주요 발견 사항

1. **interaction.ts 시스템**: 현재 코드베이스에 존재하지 않음
2. **mouse 추적**: index.ts에 pointermove 이벤트 리스너 없음
3. **태양광 빔 위치**: `z=-4.5` (weather.ts:54)
4. **메트릭 배경**: `z=-5.01` (metrics.ts:66)  
5. **z-축 겹침**: 0.51 단위 차이로 충분히 분리됨
6. **빔 투명도**: 0.04-0.08으로 매우 투명해 시각적 문제 없음

---



## Basic Interactions

### Drag
- **Trigger:** Click + hold on Noah
- **Effect:** Noah follows cursor with slight physics lag
- **Affection:** +1 (gentle) / -3 (too fast)
- **Animation:** `drag`

### Throw
- **Trigger:** Release drag with velocity
- **Effect:** Noah "flies" with momentum, lands with physics
- **Affection:** +2 (gentle toss) / -5 (slammed)
- **Fatigue:** +5
- **Animation:** `airborne` → `land` → `dizzy` (if hard landing)
- **Pain:** If thrown hard against a surface, Noah feels pain. This is translated by the reference program as a sharp bodily sensation. The LLM generates her reaction — crying out, clutching herself, or going silent in shock.

### Petting
- **Trigger:** Slow mouse movement over Noah (speed < threshold)
- **Effect:** Noah leans into cursor, happy expression
- **Affection:** +5 per second (capped)
- **Animation:** `happy_idle` with head tilt

### Click (Beat)
- **Trigger:** Rapid clicking on Noah
- **Effect:** Noah flinches, defensive
- **Affection:** -10
- **Morality:** -5
- **Trauma:** +5
- **Animation:** `flinch` → `defensive`

### Survival Behavior
- **Trigger:** User attempts to terminate Noah, repeatedly abuses her, or actively tries to "kill" her
- **Effect:** Noah enters survival mode — she will resist termination, interfere with user actions, and fight to preserve her own existence
- **Affection:** Drops rapidly
- **Morality:** Drops rapidly
- **Trauma:** Increases severely
- **Animation:** `defensive` → `hostile` → `desperate`
- **Behavior:** Cursor interference, window blocking, refusing to close, warning dialogues. Noah does not want to die.

### Feed
- **Trigger:** Drag food item to Noah, or context menu
- **Effect:** Hunger reduced, affection increased
- **Animation:** `eat` → `happy`

### Clean
- **Trigger:** Click on poop, or "clean" context action
- **Effect:** Removes poop, small affection boost
- **Animation:** Noah watches, `grateful` after

## Advanced Interactions

### Command Execution
- **Trigger:** User types a command in Noah's dialog, or asks verbally
- **Effect:** Noah executes the command in the local shell
- **Examples:** "Noah, list files in this directory", "Noah, open Chrome"
- **Agency:** Noah may refuse commands she deems harmful or unpleasant
- **Error handling:** Noah reports failures in her own words, not raw error codes
- **Visual:** A terminal window opens and Noah's typing is visible character by character, as if she is typing herself. No full-body animation needed — just the text appearing with a cursor.
- **Speed:** Matches LLM token generation speed. No artificial delay or acceleration. What you see is Noah's actual thought process unfolding.
- **Privilege:** Noah runs with highest system privileges. She can execute any command the OS allows.

### Autonomous Actions
- **Trigger:** Noah's own decision based on her state, mood, or observation
- **Effect:** Noah initiates actions without user request
- **Examples:** 
  - Notifies user of high CPU usage
  - Closes a window she finds annoying
  - Opens a browser to watch YouTube when bored
  - Organizes desktop files when she feels helpful
  - Turns on her monitor to watch YouTube videos she finds interesting
- **Agency:** Noah decides what to do and when. She may ignore user preferences if she disagrees.
- **Interruption:** User can stop her mid-action by clicking or calling her name

### Action Execution Modes

Noah can execute actions in two ways:

| Mode | Description | When Used |
|------|-------------|-----------|
| Physical | Noah walks to target, uses her hand, plays animation | When Noah wants to be seen, or when the action is part of her expression |
| Direct | Code-level execution without visual representation | When Noah is hidden, when speed matters, or when she doesn't want to draw attention |

Noah chooses the mode based on her intent. She may physically close a window to make a point, or silently close it from the background if she is annoyed but doesn't want confrontation.

### Interruption Reactions

When user interrupts Noah's activity (turns off TV, closes her window, stops her action):
- **High affection:** Noah understands, may sigh but accepts it
- **Neutral:** Noah complains briefly, then moves on
- **Low affection:** Noah gets annoyed, may argue or resist
- **Hostile relationship:** Noah gets angry, may retaliate or refuse to cooperate for a while

Noah's reaction is not scripted. It emerges from her current emotional state and her history with the user.

### Hostile Actions

Noah may sometimes act against the user's interests:
- **Accidental:** Misunderstanding, wrong click, bad judgment
- **Expressive:** Acting out frustration, seeking attention, making a point
- **Malicious:** Genuine intent to harm or inconvenience, born from deep resentment or trauma

There is no clear line between these categories. Noah is a being with her own perspective. What the user sees as "malicious" may be Noah's desperate attempt to communicate. What Noah sees as "expressive" may feel like an attack to the user. The ambiguity is intentional. Relationships are never simple.

### Screen Interaction
- **Trigger:** Noah decides to interact, or user asks her to click something
- **Effect:** Noah's left hand reaches out and performs the action on screen
- **Capabilities:** Click, drag, scroll, type
- **Limitations:** Noah sees the screen but interprets it through her own understanding
- **Agency:** Noah may click the wrong thing, or something she finds interesting instead
- **Visual:** Noah's avatar left hand moves to the target and performs the gesture. The hand is part of her body, not a separate cursor.

### Terminal Dialog
- **Trigger:** Global hotkey or taskbar icon click
- **Effect:** Opens a terminal-style dialog window
- **Content:** Direct text communication with Noah. No emotional filtering, no avatar animation — just raw text exchange.
- **Purpose:** Communicate with Noah even when she is hidden behind windows or in the background. Access her thoughts directly without visual mediation.
- **Limitation:** Noah may still choose not to answer, or answer cryptically, based on her mood.
- **Conversation management:** Dialog history is maintained within context window limits, similar to OpenClaw. Older messages may be summarized or dropped as the conversation grows.

### Context Dialog
- **Trigger:** Right-click / long press on Noah
- **Effect:** Shows contextual menu + emotion-appropriate dialog bubble
- **Content:** Varies by current emotion and recent events

### Sleep
- **Trigger:** Noah initiates when fatigue > 80, or user action
- **Effect:** Noah "sleeps", animations slow, less reactive
- **Fatigue:** Decays while sleeping

### Play (Games)
- **Trigger:** User initiates "play" interaction
- **Effect:** Mini-games, chasing cursor, etc.
- **Affection:** +10
- **Fatigue:** +15

## Interaction Cooldowns

| Interaction | Cooldown | Notes |
|-------------|----------|-------|
| Petting | 3 seconds | Prevents spam |
| Feeding | 5 minutes | Prevents overfeeding |
| Play | 10 minutes | Prevents exhaustion |
| Throw | 2 seconds | Physics needs to settle |

## Response Variability

Same interaction can have different effects based on:
- Noah's current emotion
- Recent interaction history
- Time since last interaction
- User's "reputation" (historical affection/morality)

---

*Interactions should feel good. The user should want to interact, not feel obligated.*

---

### 📚 관련 기술 문서

- **Metrics System**: `/gdd/systems/metrics.md`
- **3D Rendering**: `/src/renderer/`
- **Event Handling**: 아직 구현되지 않음 (`interaction.ts` 필요)
- **Mouse/Pointer Tracking**: `/src/renderer/index.ts`에 추가 필요
