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
│   ├── preload.ts         # Preload script for security
│   ├── system/            # OS bridge (CPU, RAM, processes)
│   ├── persistence/       # Save/load state, memory, trauma
│   ├── session/           # Session management
│   ├── state/             # State management
│   └── ipc/               # IPC handlers
├── renderer/
│   ├── index.html         # HTML entry point
│   ├── index.ts           # Renderer entry
│   ├── debug-labels.ts    # Debug labels for 3D objects
│   ├── interaction.ts     # Input handling (mouse, keyboard)
│   ├── lighting.ts        # Lighting system
│   ├── metrics.ts         # CPU/RAM/Temp/Weather visualisation
│   ├── room.ts            # Room model (procedural via IRoom interface)
│   ├── scene.ts           # Scene, camera, renderer setup
│   ├── weather.ts         # Weather visualization
│   └── window.ts          # Window management
└── shared/
    ├── constants/         # Game constants (timings, thresholds)
    │   └── index.ts
    ├── types/             # Shared TypeScript interfaces
    │   └── index.ts
    └── utils/             # Pure helper functions
        └── index.ts
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

## Room Module — Extensibility Design

The [`room.ts`](src/renderer/room.ts) module is designed to support two modes:

| Mode | Source | When |
|------|--------|------|
| **Procedural** | Three.js primitives (PlaneGeometry) — **임시 메쉬** | Now (Stage 4a) |
| **File‑loaded** | FBX / GLTF model | Future (Stage 5a+) |

> ⚠️ 현재 방(Floor, Walls)은 모두 **임시(placeholder) 메쉬**입니다. Three.js 기본 지오메트리(PlaneGeometry)로 공간 배치와 조명/그림자 파이프라인을 검증하며, Stage 5+ 에서 실제 FBX/GLTF 룸 모델로 교체 예정입니다.

This is achieved through the [`IRoom`](src/renderer/room.ts:42) interface:

```typescript
export interface IRoom {
  readonly group: THREE.Group;
  getFloor(): THREE.Mesh | null;   // null when FBX can't isolate floor
  getWalls(): THREE.Mesh[];        // empty when FBX can't isolate walls
  dispose(): void;                  // GPU resource cleanup
}
```

**Swapping strategy** — only the singleton export line changes:
```typescript
// Current (procedural):
export const room: IRoom = createProceduralRoom();

// Future (file-loaded):
// export const room: IRoom = await loadRoomFromFile('models/room.glb');
```

Consumers use `room.group` (not `room` directly), so the swap is transparent.
See [`plans/stage-04a-room-floor-walls.md`](plans/stage-04a-room-floor-walls.md) for full rationale.

## Anti-Termination (Future)

- Intercept `beforeunload`, `Alt+F4`, `SIGINT`
- Watchdog process (platform-specific)
- Persist "forced termination" as trauma

---

*Keep it simple. Expand only when the core is solid.*
