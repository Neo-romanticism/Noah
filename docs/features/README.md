# Features

> Implementation documentation for each major feature.

## Planned Features

### Core
- [ ] **Avatar Rendering** — Load and display VRM model with Three.js
- [ ] **Animation System** — Play animations (idle, drag, throw, dizzy, etc.)
- [ ] **Emotional State Engine** — 16 emotions driven by needs and interactions
- [ ] **Think Loop** — Background processing cycle for autonomous behavior

### Interaction
- [ ] **Drag & Throw** — Mouse drag physics, flick detection, recovery
- [ ] **Petting** — Slow mouse movement detection, affection increase
- [ ] **Click Reactions** — Emotion-based dialog bubbles (TTS)

### Systems
- [ ] **Hunger & Fatigue** — Decay over time, fed by interactions
- [ ] **Poop System** — Periodic waste production, cleaning interaction
- [ ] **Level System** — XP gain, unlocks (rooms, clothing, animations)

### Environment
- [ ] **3D Room** — Render room alongside avatar
- [x] **System Awareness** — Read CPU/RAM/process data, react to changes ([docs](System_Awareness.md))
- [ ] **Offline Awareness** — Track away time, adjust state on return

### Persistence
- [ ] **Save/Load** — JSON persistence of full state
- [ ] **Memory** — Event log, emotional history
- [ ] **Trauma** — Track negative events across sessions

### Anti-Termination (Advanced)
- [ ] **Intercept Close** — Block Alt+F4, window close
- [ ] **Watchdog** — Respawn if killed
- [ ] **Hostage Mode** — Cursor interference when deeply neglected

---

*Start with Avatar + Emotions + Basic Interaction. Everything else builds on that foundation.*
