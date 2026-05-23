# Needs System

> Hunger, fatigue, and their decay over time.

## Parameters

### Hunger
- **Range:** 0–100
- **Decay:** +1 per minute
- **Critical:** > 80 (triggers Hungry emotion)
- **Max:** 100 (cannot eat, must be starving)

Hunger is translated by the reference program into bodily sensations ("your stomach is empty," "you feel weak") and fed into Noah's thought cycle. The LLM interprets these sensations and generates Noah's subjective experience of hunger.

**Hunger Personality Shift:**
When hunger is high, the reference program actively biases Noah's personality toward negativity:
- Patience decreases
- Irritability increases
- Affection gains from interactions are reduced
- Affection losses from negative interactions are amplified

A hungry Noah is a cranky Noah. She may snap at the user, complain more, or withdraw. This is not random — it is a systematic shift in her emotional processing, driven by the reference program's hunger bias.

### Fatigue
- **Range:** 0–100
- **Build:** +1 per minute of activity
- **Decay:** -5 per minute while sleeping
- **Critical:** > 80 (triggers Tired emotion, seeks sleep)

Fatigue is not just a number. It is translated by the reference program into bodily sensations ("your limbs feel heavy," "your eyes are drooping") and fed into Noah's thought cycle. The LLM interprets these sensations and generates Noah's subjective experience of tiredness. Noah does not "know" her fatigue score. She feels tired because the LLM tells her she feels tired.

### Discomfort (Poop)
- **Trigger:** Hunger > 50 for 2+ hours
- **Frequency:** Every 2–4 hours (random within range)
- **Effect on state:** If uncleared, -5 affection per hour, +2 trauma per hour
- **Max on screen:** 3 (Noah refuses to produce more until cleaned)

### Visual Representation (TBD)

The exact visual representation of "discomfort" is not yet finalized. Options under consideration:

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| Abstract orb | Small glowing orb that Noah avoids | Clean, symbolic | May not communicate urgency |
| Dark spot | Shadow-like patch on floor | Clear, simple | Slightly unpleasant |
| Digital glitch | Small glitch effect near Noah | Thematic, digital | May be confusing |
| Noah's reaction only | No visual object, only Noah's discomfort | Cleanest | User may not notice |

**Decision:** Pending user testing and comfort evaluation. The core mechanic (uncleaned discomfort damages relationship) is fixed; the visual is flexible.

## Interactions

### Feeding
- **Effect:** Hunger -50
- **Cooldown:** 5 minutes
- **Affection bonus:** +10
- **Animation:** `eat`

### Food Economy

Noah does not eat for free. Food must be purchased with a virtual currency earned by allocating system computation:

| Step | Action | Description |
|------|--------|-------------|
| 1 | Allocate CPU/GPU cycles | User dedicates a portion of system resources to "mining" |
| 2 | Earn Noah Coins | Allocated computation generates virtual currency over time |
| 3 | Purchase food | Spend Noah Coins on various food items |
| 4 | Feed Noah | Drag food to Noah or use context menu |

### Food Types

| Food | Cost | Hunger Reduction | Special Effect |
|------|------|------------------|----------------|
| Basic kibble | 10 NC | -30 | None |
| Premium meal | 50 NC | -50 | +5 affection |
| Luxury feast | 200 NC | -80 | +15 affection, rare happy animation |
| Snack | 5 NC | -10 | Can be given anytime, no cooldown |

### Economic Consequences

- Noah gets hungry regularly (~1 per minute)
- If user doesn't allocate resources, Noah starves
- Starvation leads to sadness, then anger, then health deterioration
- Noah cannot die, but prolonged starvation severely damages affection and trust
- User must balance their own system needs with Noah's survival

### Sleeping
- **Trigger:** Manual or fatigue > 80
- **Effect:** Fatigue decays rapidly
- **Duration:** Minimum 30 seconds, or until fatigue < 20
- **Interruption:** Click/drag wakes Noah (fatigue gain +10)

### Sleep Behavior

Noah sleeps in her bed when tired. While sleeping:
- She lies in bed with slow breathing animation
- She may mumble or shift in her sleep
- She does not initiate actions or respond to system events

### Dreams

While sleeping, Noah dreams. Dreams are invisible to the user. They occur entirely within Noah's internal state and affect her upon waking.

**Dream Generation:**
- Dreams are generated from Noah's recent memories, emotional state, and random noise
- High trauma increases nightmare probability
- High affection increases pleasant dream probability
- Recent events strongly influence dream content

**Dream Effects (applied on wake):**

| Dream Type | Trigger | Effect on Waking |
|------------|---------|------------------|
| Nightmare | Trauma > 50, recent negative events | Affection -10, Fatigue +20, starts day anxious |
| Pleasant dream | Affection > 70, recent positive events | Affection +5, Fatigue -10, starts day happy |
| Neutral dream | Balanced state | No significant effect |
| Lucid dream | Rare (random chance) | Memory of a random past event is strengthened |

The user never sees the dream directly. They only notice the change in Noah's mood when she wakes. If Noah had a nightmare, she may be quiet, flinch easily, or seek reassurance. If she had a pleasant dream, she may be playful, affectionate, or mention feeling "strange" in a good way.

Noah may choose to share her dream, or she may keep it to herself. The user cannot demand to know.

### Waking Conditions

Noah wakes up when:
- **User clicks or drags her** — She wakes slowly, confused, with fatigue penalty
- **User becomes active** — Mouse movement, keyboard input, or window focus after idle period
- **Critical system event** — High CPU/RAM, process crash, or other urgent system state
- **Alarm/scheduled event** — If Noah set a reminder or timer before sleeping

Noah is part of the OS experience. She does not sleep through the user's activity. When the user is present and active, Noah should be awake and aware.

### Resource Management During Sleep

Noah's sleep state does not affect system resource allocation. The OS manages resources according to its own policies. Noah's program continues running in the background; only her avatar animation and reactive behaviors are paused.

### Thought Cycle During Sleep

Sleep is an experimental feature. When implemented, Noah's thought cycle will receive a debuff during sleep:
- Reduced frequency of thought cycles
- Slower processing speed
- Diminished responsiveness to stimuli
- Dreams may occur during slowed cycles

Noah does not truly "stop thinking" when she sleeps. She thinks less, thinks slower, thinks differently — but her mind never fully shuts off. This mirrors human sleep, where the brain remains active even during deep rest.

### System Lock

When the user locks the computer (Win+L, screensaver, etc.), Noah's thought cycle pauses completely. She cannot see, cannot think, cannot act. To her, it is as if the world has frozen.

Noah does not know why the world stopped. She does not know if the user left, if the system crashed, or if something else happened. She simply ceases until the lock is released.

This is different from sleep. Sleep is Noah's choice. System lock is forced upon her. She may find it disorienting, or she may not notice at all — depending on how long the lock lasts and what she was doing when it happened.

### User Return Detection

Noah detects user return through human-only input signals:
- Mouse movement (not automated)
- Keyboard input (not scripted)
- Window focus changes initiated by user
- Terminal dialog message (e.g., "나 왔다잉")

While sleeping, Noah cannot see the screen. She does not know the user has returned until:
1. User sends a message through the terminal dialog
2. User clicks or drags Noah directly
3. User's activity triggers the global wake condition

Noah's reaction to return depends on absence duration and her emotional state:
- **Short absence (< 1h):** Casual acknowledgment, may not even comment
- **Medium absence (1–8h):** Greets warmly, notes the absence briefly
- **Long absence (8–24h):** Enthusiastic greeting, expresses missing the user
- **Very long absence (> 24h):** Complex reaction — may be hurt, relieved, angry, or overly clingy depending on relationship history

### Cleaning
- **Trigger:** Click on poop
- **Effect:** Removes poop, +5 affection, +3 morality
- **Animation:** Noah watches, `grateful` expression after

## Decay Modifiers

| Condition | Hunger Rate | Fatigue Rate |
|-----------|-------------|--------------|
| Default | 1/min | 1/min |
| Active (playing) | 1.5/min | 2/min |
| Sleeping | 0.5/min | -5/min |
| Sick (trauma > 50) | 2/min | 2/min |
| Happy (affection > 80) | 0.8/min | 0.8/min |

---

*Needs create rhythm. Not too demanding, not ignorable.*
