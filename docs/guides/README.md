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

### Cherry-Pick: master → main

`master` 브랜치에서 안정적이고 완성된 커밋만 선별적으로 `main`으로 가져오는 전략과 절차를 정의합니다.

- [Cherry-Pick 가이드](./CHERRY_PICK_FROM_MASTER.md) — 선정 기준, 실행 절차, 문서 템플릿
- [Cherry-Pick 실행 로그](./CHERRY_PICK_LOG.md) — 실제 체리피킹 진행 상황 추적
- [Cherry-Pick 갭 분석](./CHERRY_PICK_GAP.md) — 체리피킹 후 남은 차이 관리

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
