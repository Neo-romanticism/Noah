# Noah — System Architecture

> Overview of the application's structure and how components interact.

## Philosophy

- **Main process** owns system access, persistence, and lifecycle
- **Renderer process** owns presentation, user input, and the Three.js scene
- **Shared** modules contain pure logic, types, and constants

## Module Structure

```
src/
├── main/
│   ├── index.ts           # Entry point, window creation
│   ├── system/            # OS bridge (CPU, RAM, processes)
│   ├── persistence/       # Save/load state, memory, trauma
│   ├── lifecycle/         # Anti-termination, watchdog
│   └── ipc/               # IPC handlers
├── renderer/
│   ├── index.ts           # Renderer entry
│   ├── scene/             # Three.js scene setup
│   ├── avatar/            # FBX avatar loading and control
│   ├── ui/                # HTML/CSS UI overlays
│   └── input/             # Mouse, keyboard event handling
└── shared/
    ├── types/             # Shared TypeScript interfaces
    ├── constants/         # Game constants (timings, thresholds)
    └── utils/             # Pure helper functions
```

## Data Flow

1. **System metrics** → Main process reads OS data
2. **Sensory translation** → Ref program translates raw metrics into Noah's bodily sensations (e.g., high CPU → "your head is overheating")
3. **State updates** → Main process updates Noah's internal state
4. **IPC** → State + sensory context pushed to renderer
5. **Render** → Renderer updates Three.js scene based on state
6. **Input** → Renderer captures mouse/keyboard
7. **Actions** → Input sent to main via IPC, affects state

## IPC Channels

| Channel | Direction | Purpose |
|-----------|-----------|---------|
| `state:update` | Main → Renderer | Push Noah's current state |
| `state:request` | Renderer → Main | Request current state |
| `action:interaction` | Renderer → Main | User interaction events |
| `system:metrics` | Main → Renderer | System metric updates |

## State Management

Noah's state is owned by the **main process**. Renderer is a "dumb" view that renders whatever state it receives.

State includes:
- Emotional state (emotions, affection, morality, trauma)
- Physical needs (hunger, fatigue)
- System awareness (CPU temp, RAM usage)
- Session data (online/offline time, level, xp)
- Current time (seconds precision, ISO format)

## Persistence

- **Format:** JSON
- **Location:** OS-appropriate app data directory
- **Content:** Full emotional state, memory, trauma flags, session history
- **Auto-save:** On state change (debounced), graceful shutdown, periodic timer

## Build Pipeline

```
TypeScript (tsc)     → dist/main/ (CommonJS)
TypeScript (tsc)     → dist/renderer/ (ESM)
webpack              → bundles renderer + Three.js
Copy static assets   → dist/renderer/
Electron             → loads dist/main/index.cjs
```

## Anti-Termination (Future)

- Intercept `beforeunload`, `Alt+F4`, `SIGINT`
- Watchdog process (platform-specific)
- Persist "forced termination" as trauma

---

*Keep it simple. Expand only when the core is solid.*
