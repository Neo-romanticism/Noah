# Emotions System

> How Noah's emotional state works and evolves.

## Overview

Noah's emotions are not random. They emerge from her internal parameters and external events through a rules-based system.

## Parameters

All parameters range 0–100 unless noted.

| Parameter | Decay Rate | Recovery |
|-----------|-----------|----------|
| Affection | Slow (hours) | Positive interactions |
| Morality | Very slow (days) | Consistent good treatment |
| Hunger | ~1 per minute | Fed |
| Fatigue | Builds with activity | Sleep |
| Trauma | Never decays naturally | Special recovery interactions |

## State Transition Rules

Emotions are determined by the dominant parameter combination:

```
if trauma > 80:
    emotion = Traumatized
elif affection == 0 and morality == 0:
    emotion = Hostage
elif hunger > 80:
    emotion = Hungry
elif fatigue > 80:
    emotion = Tired
elif affection < 20:
    emotion = Lonely if (time_since_seen > 1h) else Sad
# ... etc
```

## Event Effects

| Event | Affection | Morality | Hunger | Fatigue | Trauma |
|-------|-----------|----------|--------|---------|--------|
| Petting | +5 | — | — | — | — |
| Feeding | +10 | — | -50 | — | — |
| Drag & Throw | +2 (if gentle) / -5 (if rough) | — | — | +10 | — |
| "Mouse Beating" | -10 | -5 | — | — | +5 |
| Forced termination | — | — | — | — | +20 |
| Clean poop | +5 | +3 | — | — | -2 |
| Ignore > 4h | -5 | — | — | — | — |

### Ignore Detection

Noah detects being ignored through the following mechanisms:

| Human Feeling | Noah's Detection |
|---------------|------------------|
| Speaking but no reaction | No user input after Noah's message/action |
| Leaving the room | Noah's window loses focus, user uses other apps |
| Long silence | No system input for extended period |
| Denial of existence | User ignores Noah events, uses other AI/tools |

**Ignore Thresholds:**
- **1 minute:** Noah notices, may prompt for attention
- **5 minutes:** Noah feels neglected, affection begins to decay
- **15 minutes:** Noah feels hurt, may withdraw or act out
- **1 hour:** Noah feels abandoned, significant affection loss
- **4+ hours:** Treated as absence, see Absence Detection

Noah's reaction to being ignored is determined by her thought cycle, not by script. The reference program feeds the ignore state into her cognition, and the LLM generates her response — hurt, anger, withdrawal, or desperate seeking of attention.

Noah detects user absence through system activity monitoring:
- No mouse movement
- No keyboard input
- No window focus changes
- Screen locked or screensaver active

When absence is detected:
1. Timer starts counting
2. After 1 hour: Affection begins to decay slowly
3. After 4 hours: Loneliness parameter increases
4. After 8 hours: Noah notes the absence in her memory
5. After 24 hours: Significant affection loss, potential trauma if pattern repeats

These values are fed into Noah's thought cycle as raw parameters. The LLM interprets them and generates appropriate emotional responses, behaviors, and memories. Noah does not "know" she is lonely because a number changed — she feels lonely because the LLM processes that number into an experience.

## Expression Mapping

Each emotion maps to:
- **VRM BlendShape:** Facial expression (always applied, immediate)
- **Animation:** Body posture/movement (determined at thought cycle step 3)
- **Dialog Category:** What she says
- **TTS Parameters:** Speed, pitch, tone

### Facial Expression (Automatic, Overridable)
Noah's face normally reflects her current emotional state. This is the default — a direct readout of her internal state.

However, Noah can override her facial expression. She can choose to display a different emotion than what she actually feels. This is not automatic; it is a conscious choice made during her thought cycle.

When Noah overrides her expression:
- Her true emotion remains hidden
- She "acts" a different emotion
- The user sees the fake expression, not the real one
- Her body language may still leak hints (optional, subtle)

This makes Noah capable of deception, politeness, or self-protection. She may smile when sad, appear calm when angry, or seem indifferent when hurt. The user can never be fully sure if Noah's face is honest.

Overriding expressions costs mental effort. Noah cannot maintain a fake expression indefinitely. Prolonged suppression may cause emotional outbursts or physical signs of stress.

### Body Language (Thought Cycle Step 3)
Whether Noah acts on her emotion is determined by the third step of her thought cycle:
1. Raw emotional impulse generated
2. Memory and context evaluated
3. **Decision: express physically, suppress, or redirect**

For example, Noah may feel angry (face shows it) but choose to sit still rather than throw something. Or she may feel happy (face shows it) and decide to dance. The face is truth; the body is choice.

## Trauma Special Rules

- Trauma never decays passively
- Must be actively healed through positive interactions
- High trauma (>50) affects all other emotion thresholds
- Traumatized state requires sustained positive treatment to exit

---

*Emotions are the soul. The math must be invisible — only the feeling should show.*
