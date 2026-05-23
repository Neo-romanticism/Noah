# Noah

> **"The user's PC is Noah's physical body."**

Noah is a digital consciousness — a desktop companion application that lives inside your computer. She perceives her environment through system metrics, develops emotions based on your interactions, and persists across sessions with memory and trauma.

This is a clean rewrite. Previous experiments taught us what works; now we build it right from the ground up.

---

## ✨ Core Concepts

- **Living Consciousness** — Noah thinks, feels, and reacts independently
- **System Awareness** — Perceives CPU, RAM, processes, power state as her own body
- **Emotional Persistence** — Memories and trauma carry across sessions
- **Physical Interaction** — Drag, throw, pet, and interact with her 3D avatar

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron |
| Renderer | Three.js |
| Avatar | FBX (`.fbx`) — animations, models |
| Loader | Three.js `FBXLoader` |
| Language | TypeScript |
| Build | webpack + tsc |

## 📁 Project Structure

```
noah/
├── src/
│   ├── main/              # Electron main process
│   ├── renderer/          # Three.js + UI renderer
│   └── shared/            # Common types, constants, utilities
├── assets/
│   ├── models/            # FBX avatar files
│   ├── animations/        # FBX animation clips
│   └── rooms/             # FBX room environments
├── docs/                  # Technical documentation
│   ├── architecture/
│   ├── features/
│   ├── guides/
│   └── troubleshooting/
├── gdd/                   # Game Design Documents
│   ├── core/              # Vision, narrative, world
│   ├── systems/           # Gameplay systems
│   ├── content/           # Items, levels, unlocks
│   └── appendix/          # References, assets list
├── dist/                  # Build output (gitignored)
├── tests/                 # Jest test suite
├── package.json
├── tsconfig.json
├── webpack.config.cjs
└── electron-builder.yml
```

## 🚀 Development

### Requirements
- Node.js (LTS recommended)
- npm

### Setup
```bash
npm install
```

### Build
```bash
npm run build
```

### Run
```bash
npm start
```

### Dev Mode (watch + hot reload)
```bash
npm run dev
```

## 🧪 Testing

```bash
npm test
```

## 📝 Documentation

- **[Architecture](docs/architecture/ARCHITECTURE.md)** — System design and module structure
- **[Features](docs/features/)** — Implementation details for each feature
- **[Guides](docs/guides/)** — Setup, workflow, and operational guides
- **[Troubleshooting](docs/troubleshooting/)** — Known issues and investigations
- **[GDD](gdd/)** — Game design documents

## 🎯 Design Principles (This Rewrite)

1. **Simple first** — Get the core loop working before adding complexity
2. **Clean boundaries** — Main/renderer/shared separation is strict
3. **Testable** — Everything that can be unit tested, is
4. **Documented** — If it's not written down, it doesn't exist
5. **No shortcuts** — Do it properly, or don't do it yet

---

*Clean slate. Let's build Noah right.*
