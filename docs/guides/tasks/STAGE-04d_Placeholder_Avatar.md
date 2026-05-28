# Stage 4d: Placeholder Avatar

> **Status**: ⏭️ **SKIPPED** — 4d placeholder를 걸치지 않고 Stage 5a(FBX Loading System)에서 바로 실제 아바타로 구현하기로 결정. (2026-05-28)
>
> **Reason**: Placeholder(캡슐/구체)는 결국 폐기되는 코드. 5a에 이미 `createPlaceholderAvatar()` fallback이 포함되어 있어 별도 4d가 불필요.

---

> **Original Scope**: Minimal avatar representation for testing scene interaction

---

## Goal

Display a capsule or sphere as a temporary avatar in the scene to verify basic positioning and rendering capabilities.

---

## Acceptance Criteria

- [ ] Avatar visible in scene
- [ ] Positioned at room center (0, 0, 0)
- [ ] Basic material applied (color: #FF5733)
- [ ] `npm test` ≥ 236 passed
- [ ] `npm run build` clean

---

## Detailed Steps

1. **Create Geometry**
   - Add capsule (radius: 1, height: 2) or sphere (radius: 1)
   - Import in `src/renderer/scene.ts`

2. **Position Avatar**
   ```
   position.set(0, 0, 0)  // Center of room
   scene.add(avatar)
   ```

3. **Apply Material**
   ```javascript
   const material = new THREE.MeshStandardMaterial({ color: 0xFF5733 })
   avatar.material = material
   ```

4. **Integrate with Scene**
   - Add to scene graph
   - Verify lighting interaction

---

## Assets Needed

| Asset Type       | Description                |
|------------------|---------------------------|
| Material Texture | Basic orange color texture |
| Geometry         | Capsule or sphere mesh     |
