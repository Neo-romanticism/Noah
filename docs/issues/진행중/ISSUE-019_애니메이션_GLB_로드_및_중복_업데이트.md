---
issue_id: ISSUE-019
type: 버그
priority: 높음
status: 진행중
labels: [bug, animation, vrm, mixer, update-loop]
related: [STAGE-05, STAGE-06]
last_updated: 2026-06-05
---

## 제목

애니메이션 GLB 로드 및 Avatar/AnimationSystem 중복 업데이트로 인한 VRM 애니메이션 미표시

---

## 환경 정보

| 항목 | 값 |
|------|-----|
| OS | Linux 7.0 (KDE Plasma, X11) |
| Electron | `^34.5.8` |
| Three.js | `^0.184.0` |
| @pixiv/three-vrm | `^3.5.3` |

---

## 버그 설명

아바타가 정적으로만 보이고 감정/상호작용에 따른 애니메이션이 전혀 재생되지 않음.
- 콘솔에 애니메이션 관련 에러는 출력되지 않음
- manifest.json에서 GLB 애니메이션 파일 로드는 정상
- `AnimationSystem.playTrigger()` 호출 시 로그 없이 무시됨 또는 mixer 업데이트가 VRM에 의해 덮어씌워짐

---

## 근본 원인 분석

### 원인 1 (CRITICAL): `vrm.update()`가 mixer 업데이트 직후 호출되어 뼈 변환 리셋

**관련 코드:** [`src/renderer/index.ts:159-161`](../../src/renderer/index.ts)

```typescript
function update(_weather: SystemWeather, delta: number): void {
  weatherFx.update(_weather, delta);
  if (avatar) avatar.update(delta);           // (A) vrm.update() + mixer.update()
  if (animationSystem) animationSystem.update(delta);  // (B) mixer.update() + vrm.update() ← 덮어씀!
}
```

**흐름:**
1. `avatar.update()` → `vrm.update()` (VRM 기본 포즈 설정) → `mixer.update()` (애니메이션 적용 ✅)
2. `animationSystem.update()` → `mixer.update()` (애니메이션 2중 적용, 2배속) → `vrm.update()` (VRM 기본 포즈로 **모든 뼈 변환 리셋** ❌)

`@pixiv/three-vrm`의 `vrm.update()`는 매 프레임마다 VRM humanoid 뼈의 트랜스폼을 리셋/재계산한다.
따라서 `AnimationMixer`가 아무리 애니메이션을 적용해도 `vrm.update()`가 직후에 덮어쓰므로 아바타는 항상 기본 포즈로 보인다.

### 원인 2 (HIGH): `mixer.update()`가 프레임당 2회 호출됨

`avatar.update()`와 `animationSystem.update()`가 각각 `this.mixer.update(delta)`를 호출한다.
결과적으로 애니메이션 재생 속도가 2배가 되며, cross-fade 타이밍도 2배 빨라진다.

### 원인 3 (MEDIUM): animation controller의 `currentPriority` 초기값 -1로 인한 idle playback 누락 시나리오

**관련 코드:** [`src/renderer/animation/controller.ts:22-24`](../../src/renderer/animation/controller.ts)

```typescript
let currentTrigger: AnimationTrigger | null = null;
let currentPriority = -1;
```

`createAnimationController` 생성자에서 `playIdle()`이 호출되어 `currentPriority = 0`이 설정되지만,
`processQueue()` → `playIdle()` 경로에서 `currentAction`이 설정되기 전에 `doPlay()`에서 이전 액션과 cross-fade 로직이 실행될 수 있다.

### 원인 4 (LOW): animation GLB 파일에 `Root` 노드가 포함되어 있음

**확인:** 모든 animation GLB 파일(`happy.glb`, `angry.glb` 등)은 `Root` 노드부터 시작하는 full-skeleton 애니메이션 채널(453개)을 포함한다.
VRM 모델의 scene 구조에도 `Root` → `J_Bip_C_Hips` → ... 로 동일한 계층 구조를 가진다.

Three.js `AnimationMixer.clipAction()`은 트랙 이름과 scene 내 Bone 노드 이름을 매칭하여 애니메이션을 적용한다.
트랙 이름 포맷: `.bones[Root].rotation`, `.bones[Root].translation` 등 (GLTFLoader가 변환)

클립이 정상적으로 mixer에 등록되면 Bone 이름 매칭은 문제없어야 하지만, 원인 1에 의해 mixer의 결과가 즉시 무효화된다.

---

## 수정 계획

### 수정 1: `avatar.update()`에서 mixer.update() 제거 (AnimationSystem이 담당)

**파일:** [`src/renderer/avatar.ts:693`](../../src/renderer/avatar.ts)

```typescript
// Before (avatar.ts:690-693):
update(delta) {
  if (vrm && typeof vrm.update === 'function') vrm.update(delta);
  if (mixer) mixer.update(delta);          // ← 이 줄을 제거
  animationController.update(delta);
}

// After:
update(delta) {
  if (vrm && typeof vrm.update === 'function') vrm.update(delta);
  // mixer.update()는 AnimationSystem에서만 호출
  animationController.update(delta);
}
```

### 수정 2: `AnimationSystem.update()`에서 vrm.update() 제거 (avatar.update()가 담당)

**파일:** [`src/renderer/animation/index.ts:157-163`](../../src/renderer/animation/index.ts)

```typescript
// Before (index.ts:157-163):
update(delta: number): void {
  this.controller.update(delta);
  this.expressionCtrl?.update(delta);
  if (this.vrm && typeof this.vrm.update === 'function') {
    this.vrm.update(delta);  // ← 이 줄을 제거 (avatar.update()에서 이미 호출)
  }
  ...
}

// After:
update(delta: number): void {
  this.controller.update(delta);
  this.expressionCtrl?.update(delta);
  // vrm.update()는 avatar.update()에서만 호출
  ...
}
```

### 수정 3: renderer index.ts 업데이트 순서 변경

**파일:** [`src/renderer/index.ts:159-161`](../../src/renderer/index.ts)

```typescript
// Before:
function update(_weather: SystemWeather, delta: number): void {
  weatherFx.update(_weather, delta);
  if (avatar) avatar.update(delta);
  if (animationSystem) animationSystem.update(delta);
}

// After:
function update(_weather: SystemWeather, delta: number): void {
  weatherFx.update(_weather, delta);
  // vrm.update()는 avatar에서, mixer.update()는 animationSystem에서 각각 한 번씩만 호출
  if (avatar) avatar.update(delta);
  if (animationSystem) animationSystem.update(delta);
}
```

변경 후 호출 순서:
1. `avatar.update()` → `vrm.update()` (VRM 기본 포즈) → `animationController.update()`
2. `animationSystem.update()` → `controller.update()` (이미 avatar.update()에서 호출됨 → 중복!) → `expressionCtrl.update()`

**추가 중복 제거 필요:** `animationController.update()`가 avatar.update()와 animationSystem.update() 모두에서 호출되므로 한 곳으로 통일해야 함.

---

## 수정된 파일 요약 (예상)

| 파일 | 변경 내용 |
|------|-----------|
| [`src/renderer/avatar.ts`](../../src/renderer/avatar.ts) | `IAvatar.update()`에서 `mixer.update(delta)` 제거 (AnimationSystem이 담당) |
| [`src/renderer/animation/index.ts`](../../src/renderer/animation/index.ts) | `AnimationSystem.update()`에서 `vrm.update(delta)` 제거 (avatar가 담당) |
| [`src/renderer/index.ts`](../../src/renderer/index.ts) | 업데이트 순서 주석 정리 (실제 로직 변경 없음) |

---

## 검증 방법

1. `npm run build && npm start` 실행
2. 아바타가 정적으로 서 있는 상태에서 상호작용(드래그, 클릭, 쓰다듬기) 시 애니메이션 재생 확인
3. 감정 변화(`noah.onStateUpdate`) 시 해당 애니메이션(angry, happy, sad 등) 재생 확인
4. `mixer.update()` 호출 횟수 프레임당 1회인지 로그로 확인

---

## 참고 / 관련 코드

- [`src/renderer/avatar.ts:690-693`](../../src/renderer/avatar.ts) — `IAvatar.update()` (vrm + mixer 동시 호출)
- [`src/renderer/animation/index.ts:157-163`](../../src/renderer/animation/index.ts) — `AnimationSystem.update()` (controller + vrm 동시 호출)
- [`src/renderer/index.ts:157-161`](../../src/renderer/index.ts) — render loop의 update() 호출
- [`src/renderer/animation/controller.ts:70-78`](../../src/renderer/animation/controller.ts) — `getOrCreateAction()` (mixer.clipAction 바인딩)
- [`src/renderer/animation/loader.ts:50-80`](../../src/renderer/animation/loader.ts) — `loadAnimationClips()` (GLB → AnimationClip 로드)

---

## 재현 방법

```bash
npm run build
npm start 2>&1 | grep -E "animation|Animation|mixer|vrm"
```

**예상되는 증상:**
- `[animation-loader] Loaded angry.glb` 등 manifest 파일 로드 로그는 정상 출력
- `[Avatar] VRM loaded successfully` 출력
- `noah.onStateUpdate`에서 emotion 변화 로그는 출력되나 아바타 모션 변화 없음
- 상호작용(onDragStart, onPetStart, onClick) 시 animationSystem.playInteraction() 호출 로그 없음