# Stage 4: Author Review & Open Decisions

> **Document Type**: Orchestrator → Author Decision Request  
> **Date**: 2026-05-24  
> **Status**: Pending Author Approval  
> **Scope**: Stage 4 implementation review + Stage 5/6 planning adjustments + Asset pipeline decisions

---

## 1. Executive Summary

Stage 4 구현이 완료되었습니다. 본 문서는 다음 3가지를 다룹니다:

1. **scripts/blender 분리 기준** — 기술 문서에 명시된 Blender Python 스크립트의 저장 위치와 분리 원칙
2. **Stage 5/6 계획서 변경 사항** — Stage 4 구현 결과에 따른 Stage 5/6 작업 범위 및 우선순위 조정
3. **Open Decisions 5가지 확정** — Asset Pipeline Index에 기록된 미결정 사항에 대한 선택지와 권장안

---

## 2. scripts/blender 분리 기준

### 2.1 현재 상태

`docs/technical/Asset_Pipeline_Index.md`와 `Asset_Pipeline_VRM_Blender_FBX.md`에 총 6개의 Blender Python 스크립트가 명시되어 있습니다:

| 스크립트 | 목적 | 문서 참조 |
|----------|------|-----------|
| `setup_y_up.py` | Blender Y-up 게임 엔진 워크플로우 설정 | VRM→Blender→FBX §4.3 |
| `rename_bones.py` | VRM 본명을 Mixamo 호환명으로 변경 | VRM→Blender→FBX §5.2 |
| `normalize_scale.py` | 아바타를 ~1.5m 목표 키로 스케일 조정 | VRM→Blender→FBX §5.3 |
| `export_fbx.py` | 표준화된 FBX export | VRM→Blender→FBX §6.2 |
| `fix_loop.py` | 비원활 애니메이션의 루프 포인트 수정 | Mixamo §5.1 |
| `zero_hips_translation.py` | 애니메이션을 제자리(in-place)로 베이크 | Mixamo §4.4 |

### 2.2 분리 기준 제안

**저장 위치**: `scripts/blender/` (이미 문서에 명시됨)

**분리 원칙**:

```
scripts/blender/
├── setup/
│   └── setup_y_up.py          # Blender 환경 설정 (1회 실행)
├── avatar/
│   ├── rename_bones.py        # 본 이름 변경 (VRM → Mixamo)
│   └── normalize_scale.py     # 스케일 정규화
├── export/
│   └── export_fbx.py          # 표준 FBX export
├── animation/
│   ├── fix_loop.py            # 루프 포인트 수정
│   └── zero_hips_translation.py  # Hips 이동 제거
└── README.md                  # 사용법 및 실행 순서
```

**분리 이유**:

| 기준 | 설명 |
|------|------|
| **실행 시점** | `setup/`은 1회성(프로젝트 초기), `avatar/`는 VRM import 시, `animation/`은 Mixamo clip 처리 시 |
| **의존성** | `avatar/` 스크립트는 `setup/` 실행 후에만 동작; `animation/`은 독립적 |
| **사용자** | `setup/`은 Technical Artist, `avatar/`는 Character Artist, `animation/`은 Animator |
| **실행 순서** | `setup_y_up.py` → `rename_bones.py` → `normalize_scale.py` → `export_fbx.py` (순차적 의존) |

**실행 순서 문서화** (`scripts/blender/README.md`):

```markdown
## Avatar Pipeline Execution Order

1. `setup/setup_y_up.py` — Run once per Blender session
2. `avatar/rename_bones.py` — After VRM import
3. `avatar/normalize_scale.py` — After bone rename
4. `export/export_fbx.py` — Final step

## Animation Pipeline Execution Order

1. `setup/setup_y_up.py` — Run once per Blender session
2. Import Mixamo FBX (Without Skin)
3. `animation/zero_hips_translation.py` — If in-place needed
4. `animation/fix_loop.py` — If loop stuttering
5. `export/export_fbx.py` — Export animation-only FBX
```

### 2.3 결정 필요 사항

**선택지 A**: 위 제안대로 `scripts/blender/`를 4개 서브디렉토리로 분리  
**선택지 B**: 모든 스크립트를 `scripts/blender/` 평면 구조로 유지 (단순화)  
**선택지 C**: 스크립트를 별도 repo(`noah-assets`)로 분리 (코드와 에셋 분리)

**권장**: **선택지 A** — 실행 시점과 사용자 역할이 명확히 분리되어 팀 협업 시 혼란 방지

---

## 3. Stage 5/6 계획서 변경 사항

### 3.1 Stage 4 구현으로 인한 Stage 5 범위 조정

#### ✅ 이미 완료된 항목 (Stage 4에서 선제 구현)

| 원래 Stage 5 항목 | Stage 4에서 구현된 내용 | 상태 |
|-------------------|------------------------|------|
| "FBX avatar integration" | `loadAvatar()` + `createPlaceholderAvatar()` + `updateAvatar()` | ✅ 완료 |
| "development placeholder" | Placeholder capsule avatar (body + head + eyes) | ✅ 완료 |
| "FBXLoader pipeline" | Dynamic import + error handling + fallback | ✅ 완료 |

#### 📐 수정 필요 항목

**1. Animation Catalog 축소 (10개 → 6개 우선)**

원래 계획: `idle`, `drag`, `throw`, `land`, `dizzy`, `eat`, `sleep`, `happy`, `sad`, `angry` (10개)

변경 제안:

| 우선순위 | 애니메이션 | 이유 |
|----------|-----------|------|
| P0 | `idle` | 기본 상태, 반드시 필요 |
| P0 | `sleep` | 침대 상호작용 핵심 |
| P0 | `drag` | Stage 7 상호작용의 기반 |
| P1 | `throw` / `land` | 묶음으로 구현 (throw 시작 → 공중 → land 종료) |
| P1 | `happy` / `sad` | 감정 표현 기본 세트 |
| P2 | `dizzy` | hard landing 파생 |
| P2 | `eat` | Stage 12 feeding economy와 연계 |
| P2 | `angry` | trauma/hostage 상태 표현 |

**근거**: Mixamo에서 "In Place" 버전이 확실히 존재하는 애니메이션부터 구현. `throw`는 root motion이 필요하지만 `land`는 그 자체로 완결된 애니메이션이므로 분리보다는 연속 동작으로 처리.

**2. blend shape / morph target 시스템 — 범위 축소**

원래 계획: "blend shape / morph target 시스템 구축" + "facial expression 제어"

변경 제안:
- **Stage 5**: Morph target 접근 인프라만 구축 (`morphTargetDictionary` / `morphTargetInfluences` 래퍼)
- **Stage 6**: 16개 감정 → BlendShape 매핑 (VRM BlendShape 기반)
- **이유**: Placeholder avatar는 구체 머리라 BlendShape이 없음. FBX 아바타 도입 후에야 의미 있는 작업.

**3. "16개 감정 매핑" — Stage 6으로 이동**

원래 Stage 5에 있던 "16개 감정 매핑"은 Stage 6 (Emotion Engine)과의 경계가 모호합니다.

변경 제안:
- **Stage 5**: 애니메이션 클립 재생 인프라 (AnimationController, priority queue, crossfade)
- **Stage 6**: 감정 상태머신 → 애니메이션/BlendShape/Dialog/TTS 매핑

**4. transition interpolation 로직 — 구체화**

원래 계획: "transition interpolation 로직" (모호)

변경 제안:
```typescript
// AnimationController 인터페이스
interface AnimationController {
  play(clipName: string, options?: {
    fadeIn?: number;      // default: 0.3s
    fadeOut?: number;     // default: 0.3s
    loop?: boolean;       // default: true for idle/sleep
    priority?: number;    // default: 1
  }): void;
  
  crossFade(to: string, duration: number): void;
  stop(clipName: string, fadeOut?: number): void;
}
```

### 3.2 Stage 6 범위 조정

#### ✅ 이미 부분 구현된 항목

| Stage 6 항목 | 이미 구현된 내용 | 위치 |
|--------------|-----------------|------|
| "parameter decay loops" | `SessionTracker`가 이미 시간 기반 decay 처리 중 | `src/main/session.ts` |
| "emotion state machine" | `resolveEmotion()`이 16개 감정 결정 | `src/shared/utils/index.ts` |
| "fatigue → automatic sleep trigger" | `StateManager.modify()`로 상태 변경 가능 | `src/main/state.ts` |
| "ignore detection" | `SessionTracker`가 idle/online/offline 감지 | `src/main/session.ts` |

#### 📐 수정 필요 항목

**1. "hunger personality shift" — 구체화**

원래 계획: "patience 감소, irritability 증가, affection gains 감소, affection losses 증폭"

변경 제안 (구현 가능한 형태):
```typescript
interface HungerPersonalityShift {
  // hunger > 50일 때 적용
  patienceMultiplier: 0.7;        // 상호작용 쿨다운 감소 속도 1.4배
  irritabilityThreshold: 30;      // 평소 50 → 30으로 분노 트리거 하향
  affectionGainMultiplier: 0.5;   // pet, feed 등의 affection 획득 절반
  affectionLossMultiplier: 1.5;   // ignore, throw 등의 affection 손실 1.5배
}
```

**2. "discomfort (waste) mechanic" — 시각 표현 구체화**

원래 계획: "waste 생성, visual representation, cleanup interaction"

변경 제안:
- **waste 생성**: `discomfortCount`가 1 이상일 때 방 바닥에 작은 오브젝트(종이 뭉치, 먼지) 생성
- **visual**: `SphereGeometry(0.05)` × `discomfortCount` 개, 랜덤 위치에 배치
- **cleanup**: 클릭 시 `discomfortCount--`, 오브젝트 fade out

**3. "expression override(감정 위장)" — Stage 8 이후로 연기**

원래 계획: Stage 6에 포함

변경 제안: **Stage 8 (Dialog System)** 또는 **Stage 9 (LLM Integration)**로 이동
- 이유: 감정 위장은 Noah가 "의식적으로" 거짓말을 하는 행동. 이는 dialog/LLM 계층의 기능.
- Stage 6은 "진짜" 감정 상태머신에 집중.

### 3.3 수정된 Stage 5/6 계획서

#### Stage 5 (변경 후)

```markdown
## Stage 5: Avatar Animation System

### 목표
- FBX 아바타를 씬에 로드하고, 애니메이션 재생/전환/우선순위 시스템을 구축한다.

### 상세 작업
- [ ] AnimationController 구현
  - [ ] priority-based queue (1–5)
  - [ ] crossFade 전환 (기본 0.3s)
  - [ ] loop/non-loop 구분
- [ ] 애니메이션 카탈로그 (P0 3개 + P1 3개)
  - [P0] `idle` — 기본 루프
  - [P0] `sleep` — 침대에서
  - [P0] `drag` — 끌려감
  - [P1] `throw` → `land` — 연속 동작
  - [P1] `happy` — 긍정적 반응
  - [P1] `sad` — 낮은 애정
- [ ] Morph target 인프라 (접근 래퍼만)
  - [ ] `morphTargetDictionary` 래퍼
  - [ ] `morphTargetInfluences` 애니메이션 (gsap 또는 lerp)

### 제외 (Stage 6로 이동)
- 16개 감정 매핑 → Stage 6
- BlendShape 세부 구현 → Stage 6 (FBX 아바타 도입 후)
```

#### Stage 6 (변경 후)

```markdown
## Stage 6: Emotion Engine and Needs System

### 목표
- 감정 파라미터의 decay/전이를 구현하고, need 기반 행동 트리거를 완성한다.

### 상세 작업
- [ ] parameter decay loops (이미 부분 구현, 검증 필요)
  - [ ] Hunger: +1 per minute
  - [ ] Fatigue: +1 per minute (activity 시)
  - [ ] Affection: 점진 decay
- [ ] hunger personality shift (구체화됨)
  - [ ] patienceMultiplier: 0.7
  - [ ] irritabilityThreshold: 30
  - [ ] affectionGainMultiplier: 0.5
  - [ ] affectionLossMultiplier: 1.5
- [ ] fatigue → automatic sleep trigger (>80)
- [ ] discomfort (waste) mechanic (구체화됨)
  - [ ] waste 오브젝트 생성 (SphereGeometry)
  - [ ] 클릭으로 cleanup
- [ ] ignore detection engine (이미 구현, 검증 필요)
  - [ ] 1분 / 5분 / 15분 / 1시간 / 4시간+ 분기
- [ ] trauma special rules
  - [ ] passive decay 없음
  - [ ] threshold 수정
- [ ] 16개 감정 → 애니메이션/BlendShape/Dialog 매핑 (Stage 5에서 이동)

### 제외 (Stage 8/9로 이동)
- expression override (감정 위장) → Stage 8/9
```

---

## 4. Open Decisions 5가지 확정

### Decision 1: Avatar Creation Tool

**질문**: Noah의 아바타를 어떤 도구로 생성할 것인가?

| 선택지 | 설명 | 장점 | 단점 | 권장 |
|--------|------|------|------|------|
| **A. VRoid Studio** | 무료 프로시저얼 캐릭터 생성 도구 | 빠름, VRM 1.0 export, BlendShape 내장, 무료 | 제네릭한 외모, 의상 제한 | ⭐ **권장** |
| **B. Custom Modeling** | Blender/ZBrush/Maya로 처음부터 | 유니크한 아트 스타일, 완전한 컨트롤 | 시간 소모 (주 단위), 전문 스킬 필요 | 향후 고려 |
| **C. 외주 커미션** | 아티스트에게 의뢰 | 프로 퀄리티 | 비용 발생, 리비전 사이클 | Stage 14 |

**권장안: A (VRoid Studio)**
- 이유: 빠른 프로토타이핑, VRM 표준으로 BlendShape이 자동 생성, 기술 문서의 파이프라인(VRM→Blender→FBX)과 완벽히 호환
- 단계적 접근: VRoid로 MVP 아바타 생성 → Stage 14에서 custom 또는 커미션으로 교체

---

### Decision 2: Room Art Style

**질문**: 방의 시각 스타일을 어떻게 결정할 것인가?

| 선택지 | 설명 | 장점 | 단점 | 권장 |
|--------|------|------|------|------|
| **A. Low-poly Stylized** | 현재 placeholder와 유사한 단순 형태 | 일관성, 빠른 렌더링, 개발자가 직접 수정 가능 | "프로덕션" 느낌 부족 | 현재 유지 |
| **B. Realistic PBR** | 사실적 재질, 조명 반응 | 몰입감 높음 | 에셋 제작 시간 ↑, 성능 비용 | Stage 14 |
| **C. Toon/Cel-shaded** | VRM MToon과 유사한 만화 스타일 | 캐릭터와 일관성, 독특한 분위기 | Three.js에 custom shader 필요 | Stage 14 |

**권장안: A (Low-poly Stylized) 유지, C (Toon)을 Stage 14 목표로**
- 이유: 현재 procedural geometry가 이미 low-poly. 에셋 교체 시에도 동일한 스타일로 모델링하면 코드 변경 없이 `buildRoomFromGLB()`로 교체 가능
- Toon shader는 `MeshToonMaterial` 또는 custom shader로 구현 가능 (Three.js 기본 지원)

---

### Decision 3: Animation Budget

**질문**: 애니메이션을 어떤 방식으로 확보할 것인가?

| 선택지 | 설명 | 장점 | 단점 | 권장 |
|--------|------|------|------|------|
| **A. Mixamo-only** | Adobe Mixamo의 무료 모캡 라이브러리 | 무료, 2500+ 클립, auto-rigging | 제한된 감정 표현, root motion 이슈 | ⭐ **P0 권장** |
| **B. Custom Keyframe** | Blender에서 직접 애니메이션 제작 | 완전한 컨트롤, Noah의 체형에 맞춤 | 시간 소모 (클립당 반나절+) | P2 |
| **C. Mocap Hardware** | Rokoko/Perception Neuron 등 | 프로 퀄리티 모캡 | 장비 비용 ($500–3000) | 고려 안 함 |
| **D. AI Mocap** | Move.ai, Plask 등 영상→모캡 | 저비용, 빠름 | 품질 불안정, cleanup 필요 | P1 |

**권장안: A (Mixamo)를 P0로, B (Custom)를 P2로**
- 이유: Mixamo의 "In Place" 애니메이션으로 6개 P0 클립을 즉시 확보. `idle`, `sleep`, `happy`, `sad`는 Mixamo에 풍부함
- `drag`, `throw`, `land`는 Mixamo에서 직접 찾기 어려울 수 있으므로 custom keyframe 또는 AI mocap을 fallback으로
- **핵심 규칙**: 반드시 "Without Skin"으로 다운로드 (파일 크기 1/100)

---

### Decision 4: Toon Shading

**질문**: 셀 쉐이딩(toon shading)을 적용할 것인가?

| 선택지 | 설명 | 장점 | 단점 | 권장 |
|--------|------|------|------|------|
| **A. PBR 유지** | `MeshStandardMaterial` 계속 사용 | 간단, 성능 우수, Three.js 기본 지원 | VRM MToon 룩과 거리 있음 | ⭐ **Stage 5–13 권장** |
| **B. MeshToonMaterial** | Three.js 기본 툰 쉐이더 | 셀 룩, 그라데이션 제어 가능 | rim light/outline 없음 | Stage 14 고려 |
| **C. Custom Cel Shader** | MToon-style custom GLSL | 완벽한 VRM 룩, outline, rim light | 개발 시간 ↑, 유지보수 비용 | Stage 14+ |

**권장안: A (PBR)를 Stage 5–13까지 유지, B/C는 Stage 14에서 검토**
- 이유: 현재 `MeshStandardMaterial`로 모든 룸/아바타가 렌더링됨. 셀 쉐이더는 아트 스타일 결정(Decision 2)과 연계
- VRM→FBX 변환 시 MToon 속성은 이미 손실됨(문서 §8.2 참조). PBR이 현실적

---

### Decision 5: BlendShape Count

**질문**: 얼굴 표정용 BlendShape(Morph Target)을 몇 개 사용할 것인가?

| 선택지 | 설명 | 장점 | 단점 | 권장 |
|--------|------|------|------|------|
| **A. Full VRM Set (37개)** | VRoid가 생성한 모든 BlendShape | 풍부한 표정, 립싱크 완벽 | 파일 크기 ↑, 런타임 메모리 ↑, 복잡도 ↑ | 과잉 |
| **B. Reduced Set (12개)** | 7개 감정 + 5개 모음 | 균형 잡힘, 관리 가능 | 일부 미묘한 표현 불가 | ⭐ **권장** |
| **C. Minimal Set (5개)** | joy, angry, sorrow, blink, neutral | 단순, 작은 파일 | 표현 범위 제한 | MVP용 |

**권장안: B (Reduced Set, 12개)**

**구체적 명단**:

| Category | Shape Name | Purpose | Emotion Mapping |
|----------|-----------|---------|-----------------|
| **Emotion** | `emotionJoy` | 기쁨 | happy, excited, playful |
| **Emotion** | `emotionAngry` | 분노 | angry |
| **Emotion** | `emotionSad` | 슬픔 | sad, lonely |
| **Emotion** | `emotionScared` | 공포 | scared, traumatized |
| **Emotion** | `emotionSurprised` | 놀람 | — (startle reaction) |
| **Eye** | `eyeBlink` | 눈 깜빡임 | idle loop |
| **Eye** | `eyeWide` | 눈 크게 | scared, excited |
| **Eye** | `eyeHalfClosed` | 눈 반쯤 감음 | tired, sleepy |
| **Mouth** | `vowelA` | 입 모양 ㅏ | lip sync |
| **Mouth** | `vowelI` | 입 모양 ㅣ | lip sync |
| **Mouth** | `vowelU` | 입 모양 ㅜ | lip sync |
| **Mouth** | `vowelE` | 입 모양 ㅔ | lip sync |
| **Mouth** | `vowelO` | 입 모양 ㅗ | lip sync |

**이유**:
- 7개 감정 BlendShape으로 GDD의 16개 감정을 그룹화 (예: `happy`+`excited`+`playful` → `emotionJoy`)
- 5개 모음으로 한국어/영어/일본어 기본 립싱크 가능
- VRoid Studio export 시 "Reduce BlendShapes" 옵션으로 쉽게 생성 가능

---

## 5. 결정 요약표

| # | Decision | 권장 선택 | 근거 |
|---|----------|-----------|------|
| 1 | Avatar Creation Tool | **A. VRoid Studio** | 빠른 MVP, VRM 파이프라인 호환 |
| 2 | Room Art Style | **A. Low-poly (현재 유지)** | 일관성, 에셋 교체 용이 |
| 3 | Animation Budget | **A. Mixamo (P0) + B. Custom (P2)** | 무료로 6개 클립 즉시 확보 |
| 4 | Toon Shading | **A. PBR 유지** | 현실적, VRM→FBX 변환 손실 고려 |
| 5 | BlendShape Count | **B. Reduced Set (12개)** | 7감정 + 5모음, 균형 잡힘 |

---

## 6. 다음 단계 (Author 승인 후)

1. **즉시**: `scripts/blender/` 디렉토리 구조 생성 + 6개 Python 스크립트 배치
2. **Stage 5 시작**: `AnimationController` 클래스 구현 (priority queue + crossfade)
3. **병렬**: Mixamo에서 3개 test animation 다운로드 (idle, happy, sad)
4. **Stage 5 중반**: Morph target 인프라 (`FaceController` 래퍼)
5. **Stage 6 시작**: 감정 → 애니메이션/BlendShape 매핑 테이블 구축

---

*본 문서는 Stage 4 구현 결과를 바탕으로 작성되었습니다.*  
*Author의 승인/수정 후 Stage 5 구현을 시작합니다.*
