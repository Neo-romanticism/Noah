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
├── tsconfig.main.json
└── tsconfig.renderer.json
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

**테스트 상태**: 276개 테스트 통과 (2026-05-28 기준)

## 📋 구현 현황

| 시스템 | 구현 상태 | 테스트 수 | 주요 메모 |
|--------|----------|----------|----------|
| **Core System** | ✅ 완료 | 276개 | 모든 기본 시스템 구현 완료 |
| **Interaction** | ✅ 완료 | - | 핵심 상호작용 로직 구현 완료 (입력 감지, 제스처 처리) |
| **3D Rendering** | ✅ 완료 | - | Three.js 기반 렌더링 구현 |
| **Metrics** | ✅ 완료 | - | CPU, RAM, 시스템 메트릭 연동 |
| **Weather** | ✅ 완료 | - | 시스템 상태에 따른 날씨 효과 |
| **Memory/Persistence** | ✅ 완료 | - | 세간 및 상태 저장/로드 |

**구현 가능성**: ✅ 모든 주요 시스템 구현 가능  
**예상 추가 소요 시간**: 2-3시간 (interaction 시스템 구현 시)

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
