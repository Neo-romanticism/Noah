# Guides

> How-to documents for development and operations.

## Setup

### Development Environment

1. Clone repo
2. `npm install`
3. `npm run dev` — starts watch mode + Electron

### Adding a New Animation

1. Place `.fbx` in `assets/animations/`
2. Run `npm run build:animations` to convert to `.glb`
3. Add animation metadata to `src/shared/constants/animations.ts`
4. Implement trigger logic in appropriate system

### Adding a New Emotion

1. Add emotion to `Emotion` enum in `src/shared/types/emotions.ts`
2. Define transition rules in `src/main/emotions/transitions.ts`
3. Add rendering expression in `src/renderer/avatar/expressions.ts`
4. Add dialog lines in `src/shared/constants/dialogs.ts`

## Workflow

### Branch Strategy

- `main` — always deployable
- `feature/*` — new features
- `fix/*` — bug fixes

### Commit Convention

```
feat: add drag physics
fix: correct poop timer calculation
docs: update architecture diagram
refactor: split emotion engine into modules
test: add interaction handler tests
```

## Operations

### Releasing

```bash
npm run build:prod
npm run package
```

### Debugging

- Main process: `--inspect` flag or DevTools (Ctrl+Shift+I)
- Renderer: Standard Chrome DevTools (F12)

---

*Add more guides as patterns emerge.*
