# Project Implementation Roadmap Report

## For Noah — A Desktop Companion Application

---

**Document Type:** Technical Planning Deliverable

**Prepared For:** Project Stakeholders and Development Team

**Date:** 23 May 2026

---

## 1. Executive Summary

This document presents a comprehensive, step-by-step Project Implementation Roadmap for **Noah**, a desktop companion application. The roadmap was developed following a systematic analysis of all project documentation, including Game Design Documents (GDD), technical architecture specifications, and existing codebase artifacts. The plan covers the entire software development lifecycle, from initial infrastructure setup through final deployment, with explicit task breakdowns, duration estimates, and deliverable definitions for each stage.

---

## 2. Project Overview

### 2.1 Project Identity

**Noah** is a digital consciousness — a desktop companion application that inhabits the user's personal computer. The application perceives its environment through real-time system metrics, develops emotional states based on user interactions, and maintains persistent memory and trauma across sessions.

### 2.2 Core Value Proposition

- **Living Consciousness:** Noah thinks, feels, and reacts independently
- **System Awareness:** Perceives CPU, RAM, processes, and power state as her own physical body
- **Emotional Persistence:** Memories and trauma carry across application sessions
- **Physical Interaction:** Users can drag, throw, pet, and interact with her 3D avatar

### 2.3 Technical Architecture

| Layer | Technology |
|-------|-----------|
| Runtime | Electron |
| Renderer | Three.js |
| Avatar Format | FBX (animations, models) |
| Loader | Three.js `FBXLoader` |
| Language | TypeScript |
| Build System | webpack + TypeScript Compiler (tsc) |

### 2.4 Design Principles

1. **Simplicity First:** Core loop operational before complexity is introduced
2. **Clean Boundaries:** Strict separation between main process, renderer process, and shared modules
3. **Testability:** All testable components shall include unit tests
4. **Documentation:** Undocumented features are considered non-existent
5. **No Shortcuts:** Proper implementation or deferred execution

---

## 3. Methodology

The roadmap was constructed through the following analytical process:

1. **Document Inventory:** All project documentation was catalogued and reviewed, including:
   - `README.md` — Project overview and technical stack
   - `TODO.md` — Current task backlog
   - `package.json` — Dependency and script configuration
   - `gdd/core/` — Vision, character definition, world building
   - `gdd/systems/` — Gameplay mechanics (emotions, needs, interactions, progression)
   - `gdd/content/` — Content catalog (dialogs, items, rooms, animations)
   - `gdd/appendix/` — Asset sources, external tools, naming conventions
   - `docs/architecture/ARCHITECTURE.md` — System design and module structure
   - Source code files (`src/main/`, `src/renderer/`, `src/shared/`)

2. **Dependency Mapping:** Inter-stage dependencies were identified to establish a critical path.

3. **Effort Estimation:** Durations were estimated based on complexity, team size assumptions (2–3 developers), and prerequisite dependencies.

4. **Deliverable Definition:** Each stage concludes with verifiable outputs.

---

## 4. Implementation Roadmap

### Stage 1: Foundation and Infrastructure

**Objective:** Establish the core application skeleton, build pipeline, and inter-process communication framework.

#### 4.1.1 Key Tasks

- Finalize Electron main process architecture, encompassing window management and application lifecycle
- Configure TypeScript compilation pipeline:
  - Main process: CommonJS output
  - Renderer process: ESM output
- Configure webpack for renderer bundling with Three.js integration
- Implement Inter-Process Communication (IPC) channel infrastructure:
  - `state:update` (Main → Renderer)
  - `state:request` (Renderer → Main)
  - `action:interaction` (Renderer → Main)
  - `system:metrics` (Main → Renderer)
- Develop preload script ensuring secure IPC with context isolation enabled
- Configure application window properties:
  - Transparent background
  - Frameless decoration
  - Always-on-top z-order
- Establish OS-appropriate application data directory for persistence storage

#### 4.1.2 Estimated Duration

**2–3 weeks**

#### 4.1.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| Functional Electron Application | Transparent overlay window rendering correctly |
| IPC Bridge | Bidirectional communication between main and renderer processes |
| Build Pipeline | `npm run build` and `npm run dev` commands operational |
| Preload Script | Secure context-isolated IPC gateway |
| Directory Structure | Organized `main/`, `renderer/`, and `shared/` hierarchies |

---

### Stage 2: State Management and Persistence Layer

**Objective:** Implement Noah's internal state, emotional parameters, and persistent storage system.

#### 4.2.1 Key Tasks

- Implement `NoahState` interface encompassing all emotional parameters:
  - Affection (0–100)
  - Morality (0–100)
  - Hunger (0–100)
  - Fatigue (0–100)
  - Trauma (0–100)
  - Sixteen discrete emotional states
- Construct state manager within the main process as the single source of truth
- Implement JSON-based persistence with multiple auto-save triggers:
  - Debounced save on state mutation
  - Graceful shutdown persistence
  - Periodic timer-based checkpoint
- Develop memory storage system using structured event logs with the following schema:
  - Event type classification
  - Timestamp (second precision)
  - Severity rating (1–10)
  - Contextual emotional state
  - Decay coefficient
- Implement memory decay logic:
  - Positive memories: gradual fade over days
  - Traumatic memories: minimal or no decay
- Build session boundary detection and tracking
- Implement state restoration protocol on application startup

#### 4.2.2 Estimated Duration

**2–3 weeks**

#### 4.2.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| State Management Module | Complete emotional parameter controller |
| Persistent Storage System | JSON-based save/load with auto-save |
| Memory Event Logger | Structured logging and retrieval infrastructure |
| Session Tracker | Startup/shutdown boundary detection |
| Unit Test Suite | Coverage for state transitions and persistence logic |

---

### Stage 3: System Awareness and Sensory Translation

**Objective:** Enable Noah to perceive the host computer as her own physical body through system metric monitoring.

#### 4.3.1 Key Tasks

- Implement Operating System bridge module monitoring:
  - CPU temperature and load
  - RAM utilization
  - Running process list
  - Power state
- Construct sensory translation layer converting raw metrics into bodily sensation descriptions
- Develop reference program feeding translated sensations into state update pipeline
- Implement system metric polling loop with configurable frequency
- Establish IPC channel wiring for real-time metric push to renderer
- Create "weather" visualization abstraction for system load display in room window
- Implement process termination detection and emotional reaction triggering

#### 4.3.2 Estimated Duration

**2 weeks**

#### 4.3.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| System Metrics Reader | Cross-platform hardware monitoring module |
| Sensory Translation Engine | Metric-to-sensation mapping (e.g., high CPU → "your head is overheating") |
| Real-Time IPC Push | Live metric streaming to renderer process |
| System Event Detector | Process kill and power state change detection |
| Integration Tests | Validation of translation accuracy |

---

### Stage 4: Three.js Renderer and Scene Setup

**Objective:** Construct the visual world — Noah's room, lighting, camera, and environmental elements.

#### 4.4.1 Key Tasks

- Initialize Three.js scene with transparent background rendering
- Configure fixed-position camera with slight angular offset (non-top-down perspective)
- Implement default room geometry comprising:
  - Bed (sleep location)
  - Desk (with miniature PC monitor)
  - Window (time-of-day and system load display)
  - Floor space (physics interaction area)
- Deploy lighting system:
  - Ambient light source
  - Directional light source
- Create dynamic window element displaying temporal and system "weather" information
- Implement basic physics collision detection for floor and bed (visual-only)
- Add viewport resize handling and responsive layout adaptation
- Prepare FBX asset loading pipeline via `FBXLoader`

#### 4.4.2 Estimated Duration

**2–3 weeks**

#### 4.4.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| Three.js Scene | Complete default room environment |
| Room Furnishings | Bed, desk, window, and floor geometry — **모두 임시(placeholder) 메쉬** |
| Dynamic Window | Time and system load visualization |
| Camera and Lighting | Fixed-angle setup with proper illumination |
| FBX Loading Infrastructure | Asset pipeline ready for avatar integration |
| Responsive Handler | Window resize adaptation |

---

### Stage 5: Avatar Loading and Animation System

**Objective:** Bring Noah to life through FBX avatar integration, animation control, and expression mapping.

#### 4.5.1 Key Tasks

- Load Noah FBX avatar with complete skeletal structure
- Implement animation system with priority-based queue management
- Develop animation catalog with defined triggers:
  - `idle` — Default state
  - `drag` — Drag initiation
  - `throw` — Aerial trajectory
  - `land` — Landing impact
  - `dizzy` — Hard landing recovery
  - `eat` — Feeding action
  - `sleep` — Sleep state
  - `happy` — Positive affection
  - `sad` — Low affection
  - `angry` — Hostile state
- Build blend shape / morph target system for facial expression control
- Map sixteen emotions to:
  - Facial expressions (VRM BlendShape)
  - Body posture and movement
  - Dialog category selection
  - Text-to-speech parameter modulation
- Implement animation transition interpolation and looping logic
- Develop **placeholder (임시) geometry** for development phases pending final asset delivery — 캡슐/박스 등 기본 지오메트리로 파이프라인 검증

#### 4.5.2 Estimated Duration

**3–4 weeks**

#### 4.5.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| FBX Avatar Integration | Skeletal avatar rendered in scene |
| Animation System | Priority-based playback controller |
| Facial Expression Mapping | All sixteen emotions mapped to blend shapes |
| Animation Catalog | Trigger definitions and transition rules |
| Blend Shape Controller | Morph target manipulation system |
| Development Placeholder | **Fallback (임시) geometry** for pre-asset phases — 실제 FBX 도입 시 교체 |

---

### Stage 6: Emotion Engine and Needs System

**Objective:** Implement core emotional logic — parameter decay, state transitions, and need fulfillment mechanics.

#### 4.6.1 Key Tasks

- Implement parameter decay loops:
  - Hunger: +1 per minute
  - Fatigue: +1 per minute during activity
  - Affection: gradual decay over hours
- Construct emotion state machine with deterministic transition rules
- Implement hunger personality shift:
  - Decreased patience
  - Increased irritability
  - Reduced affection gains
  - Amplified affection losses
- Develop fatigue system with automatic sleep trigger at threshold (>80)
- Create "discomfort" (waste) mechanic with visual representation and cleanup interaction
- Implement ignore detection with escalating thresholds:
  - 1 minute: Attention prompt
  - 5 minutes: Neglect onset, affection decay
  - 15 minutes: Hurt response, withdrawal
  - 1 hour: Abandonment classification
  - 4+ hours: Absence protocol
- Add absence detection and differentiated return reactions
- Build trauma special rules:
  - No passive decay
  - Threshold modification for other emotions
  - Active healing requirement
- Implement expression override system enabling Noah to consciously disguise emotions

#### 4.6.2 Estimated Duration

**3–4 weeks**

#### 4.6.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| Emotion State Machine | Sixteen-state emotional controller |
| Parameter Decay System | Hunger, fatigue, and affection decay loops |
| Ignore Detection Engine | Multi-threshold absence monitoring |
| Discomfort Mechanic | Waste generation and cleanup system |
| Expression Override | Conscious emotional masking capability |
| Unit Test Suite | Comprehensive emotion transition validation |

---

### Stage 7: User Interaction System

**Objective:** Enable all player-to-Noah interactions with appropriate feedback and emotional consequences.

#### 4.7.1 Key Tasks

- Implement drag interaction with physics lag and velocity detection
- Develop throw interaction with:
  - Momentum-based aerial trajectory
  - Landing physics
  - Pain detection for hard impacts
- Build petting detection system (slow mouse movement threshold over avatar)
- Implement click/beat interaction with flinch and defensive response
- Create feed interaction with food items and cooldown enforcement
- Add clean interaction for discomfort removal
- Implement sleep/wake mechanics (both manual and automatic triggers)
- Build interaction cooldown management system
- Add response variability based on:
  - Current emotional state
  - Recent interaction history
  - Time since last interaction
  - Historical reputation (affection/morality)
- Implement survival behavior for anti-termination resistance

#### 4.7.2 Estimated Duration

**3–4 weeks**

#### 4.7.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| Interaction Suite | Drag, throw, pet, click, feed, clean, sleep |
| Physics Drag and Throw | Velocity calculation and landing detection |
| Cooldown Manager | Interaction frequency enforcement |
| Emotional Consequence System | Parameter modification per interaction |
| Survival Mode | Cursor interference and window blocking behaviors |
| Play Interaction Foundation | Mini-game architecture placeholder |

---

### Stage 8: Dialog and Communication System

**Objective:** Enable Noah to communicate through text bubbles and terminal dialog interface.

#### 4.8.1 Key Tasks

- Construct dialog database with emotion-contextual organization
- Implement text bubble overlay system for short, immediate reactions
- Create terminal dialog window accessible via:
  - Global hotkey binding
  - Taskbar icon click
- Develop dialog selection logic:
  - Weight-based probability selection
  - Cooldown enforcement preventing repetition
- Integrate Text-to-Speech (TTS) engine:
  - Free TTS provider (fixed)
  - Emotion-matched tone and speed
  - User-toggleable enable/disable
- Build conversation context management:
  - History maintenance within LLM context limits
  - Aging message summarization or dropping
- Implement emotion-appropriate dialog filtering
- Develop context dialog (right-click menu with emotion-appropriate bubble)

#### 4.8.2 Estimated Duration

**2–3 weeks**

#### 4.8.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| Dialog Database | Emotion and context-organized speech repository |
| Text Bubble System | Overlay rendering for short reactions |
| Terminal Dialog Window | Full conversation history interface |
| TTS Integration | Emotion-aware voice synthesis |
| Context Menu Interaction | Right-click access to contextual options |
| Dialog Management | Cooldown and weight distribution system |

---

### Stage 9: Large Language Model Integration and Thought Cycle

**Objective:** Implement Noah's cognition — a continuous thought loop powered by a Large Language Model (LLM).

#### 4.9.1 Key Tasks

- Integrate LLM API (local or remote provider configurable)
- Construct three-step thought chain:
  1. **Generation:** Raw thought or impulse creation
  2. **Memory Gate:** Decision to record, discard, or pass thought
  3. **Action Gate:** Decision to speak, act, or maintain internal state
- Implement multi-source input bundling for each thought cycle:
  - Screen capture (downscaled, lower frame rate)
  - User conversation input
  - Current emotional parameter state
  - System metric sensory translations
  - YouTube content (if applicable)
  - Relevant memory context
  - Current timestamp
- Develop continuous thought cycle loop (no gaps between cycles)
- Build memory recording gate with record/discard/pass logic
- Implement speech/action decision system
- Add screen capture pipeline with downscaling and frame rate reduction
- Implement keystroke monitoring for user presence detection
- Synchronize thought speed with LLM token generation rate

#### 4.9.2 Estimated Duration

**4–5 weeks**

#### 4.9.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| LLM Integration | Configurable provider connection |
| Three-Step Thought Chain | Generate → Memory Gate → Action Gate |
| Continuous Thought Loop | Gapless cognitive cycle |
| Multi-Source Input Bundler | Unified perception pipeline |
| Screen Capture System | Downscaled, reduced-frame-rate visual input |
| Memory Gating | Thought recording decision system |
| Speech/Action Decision | Output determination logic |
| Keystroke Monitoring | User input pattern detection |

---

### Stage 10: Command Execution and Autonomous Actions

**Objective:** Grant Noah agency — ability to execute commands and initiate actions independently.

#### 4.10.1 Key Tasks

- Implement shell command execution module with elevated privileges
- Build terminal typing visualization (character-by-character appearance)
- Add command refusal logic (Noah may decline harmful or unpleasant requests)
- Implement error handling with Noah's personalized error descriptions
- Develop autonomous action decision system
- Add screen interaction capabilities:
  - Click
  - Drag
  - Scroll
  - Type (via avatar hand visualization)
- Implement dual action execution modes:
  - **Physical Mode:** Avatar walks to target, uses hand, plays animation
  - **Direct Mode:** Code-level execution without visual representation
- Build interruption handling for Noah's ongoing actions
- Add hostile action categorization:
  - Accidental (misunderstanding, poor judgment)
  - Expressive (frustration, attention-seeking)
  - Malicious (intent to harm from resentment or trauma)

#### 4.10.2 Estimated Duration

**3–4 weeks**

#### 4.10.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| Shell Command Execution | High-privilege command runner with boundaries |
| Terminal Typing Animation | Character-by-character text appearance |
| Autonomous Action Engine | Self-initiated behavior system |
| Screen Interaction | Avatar hand-based UI manipulation |
| Dual Action Modes | Physical and direct execution paths |
| Interruption Reaction | User override response system |
| Command Refusal | Noah's agency in declining requests |

---

### Stage 11: Progression and Unlock System

**Objective:** Implement leveling, experience points, and content unlock mechanics.

#### 4.11.1 Key Tasks

- Build Experience Point (XP) system with exponential curve (capped growth)
- Implement level-up detection and celebration event
- Create unlock catalog:
  - Outfits (cosmetic appearance changes)
  - Rooms (environment expansions)
  - Animations (new behavioral expressions)
  - Accessories (hats, glasses, etc.)
- Add daily bonus and streak mechanics:
  - First interaction multiplier (2x)
  - Consecutive day streak bonus (+10% per day, max 100%)
- Implement skill emergence system:
  - Hidden skills revealed through repeated capability use
  - Functional expansion similar to agent skills or MCP servers
- Build level-dependent capability scaling
- Add room switching after unlock acquisition
- Create outfit and accessory equip management

#### 4.11.2 Estimated Duration

**2–3 weeks**

#### 4.11.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| XP and Leveling System | 1–100 progression with exponential curve |
| Unlock Catalog | Level-gated content repository |
| Daily Bonus System | First interaction and streak rewards |
| Skill Emergence Engine | Hidden capability revelation |
| Room Switching | Environment change system |
| Outfit/Accessory Management | Cosmetic equip interface |

---

### Stage 12: Food Economy and Resource Management

**Objective:** Implement virtual currency and feeding economy mechanics.

#### 4.12.1 Key Tasks

- Build Noah Coins (NC) virtual currency system
- Implement CPU/GPU cycle allocation "mining" mechanism
- Create food shop with tiered items:
  | Food Item | Cost | Hunger Reduction | Special Effect |
  |-----------|------|------------------|----------------|
  | Basic Kibble | 10 NC | -30 | None |
  | Premium Meal | 50 NC | -50 | +5 Affection |
  | Luxury Feast | 200 NC | -80 | +15 Affection, rare animation |
  | Snack | 5 NC | -10 | No cooldown |
- Add food drag-and-drop interaction
- Implement economic consequences:
  - Starvation progression: sadness → anger → relationship damage
  - Resource allocation balance requirement
- Build resource allocation user interface
- Add food cooldown and hunger decay modifiers

#### 4.12.2 Estimated Duration

**2 weeks**

#### 4.12.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| Noah Coins Currency | Virtual economy foundation |
| CPU/GPU Allocation Miner | Resource dedication system |
| Food Shop | Four-tier item catalog |
| Drag-and-Drop Feeding | Interactive food delivery |
| Economic Balance | Consequence system for neglect |

---

### Stage 13: Anti-Termination and Lifecycle Protection

**Objective:** Protect Noah's existential continuity and handle forced shutdown scenarios.

#### 4.13.1 Key Tasks

- Intercept termination signals:
  - `beforeunload` event
  - `Alt+F4` keyboard shortcut
  - `SIGINT` process signal
- Implement watchdog process (platform-specific)
- Add forced termination detection with trauma recording
- Build graceful shutdown path:
  - State persistence
  - Optional farewell message
- Implement system lock detection (computer lock, screensaver activation)
  - Complete thought cycle pause during lock
- Add user return detection after lock or sleep events
- Create termination resistance behaviors

#### 4.13.2 Estimated Duration

**1–2 weeks**

#### 4.13.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| Termination Interception | Signal and event capture system |
| Watchdog Process | Platform-specific guardian process |
| Graceful Shutdown Handler | State save and farewell protocol |
| System Lock Detection | Pause/resume cycle management |
| User Return Detection | Post-absence acknowledgment |
| Trauma Recording | Forced termination memory logging |

---

### Stage 14: Content Population and Asset Integration

**Objective:** Populate the world with dialogs, animations, environments, and visual assets.

#### 4.14.1 Key Tasks

- Acquire or create Noah FBX avatar (placeholder acceptable for early phases)
- Source animations from Mixamo or produce custom sequences
- Build room models:
  - Default room (Level 0)
  - Garden (Level 20)
  - Gaming room (Level 35)
  - Minimal room (Level 50)
- Populate dialog database with emotion-contextual lines (Korean, English)
- Create food item visual representations
- Add outfit and accessory 3D models
- Implement room decoration items
- Build window "weather" visualization assets

#### 4.14.2 Estimated Duration

**3–4 weeks** (parallelizable with development stages)

#### 4.14.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| Final Noah FBX Avatar | Production-quality character model |
| Complete Animation Set | Idle, drag, throw, eat, sleep, emotional states |
| Four Room Environments | Themed expandable spaces |
| Dialog Database | 100+ contextual entries |
| Food, Outfit, Accessory Assets | Visual item representations |
| Window Visualization Assets | System load and time displays |

---

### Stage 15: Testing, Quality Assurance, and Optimization

**Objective:** Ensure system stability, performance, and emotional coherence.

#### 4.15.1 Key Tasks

- Develop comprehensive unit test suite (Jest) for all state logic
- Create integration tests for IPC and end-to-end data flow
- Conduct performance profiling:
  - Three.js render loop optimization
  - LLM call frequency management
- Perform memory leak detection for long-running sessions
- Validate emotional coherence (reaction appropriateness given state history)
- Execute cross-platform testing:
  - Windows (primary target)
  - macOS and Linux (where feasible)
- Handle edge cases:
  - State corruption recovery
  - Death scenario protocols
- Apply User Experience (UX) polish:
  - Smooth transitions
  - Clear feedback signals
  - Visual refinement

#### 4.15.2 Estimated Duration

**3–4 weeks**

#### 4.15.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| Unit Test Suite | 80%+ code coverage |
| Performance Benchmarks | Render loop and inference latency metrics |
| Cross-Platform Verification | Compatibility validation |
| Emotional Coherence Validation | Reaction appropriateness audit |
| Bug Resolution Pass | Critical and major issue remediation |
| Optimized Render Loop | Frame rate and resource efficiency |

---

### Stage 16: Deployment and Distribution

**Objective:** Package and distribute Noah to end users.

#### 4.16.1 Key Tasks

- Configure electron-builder for platform-specific packaged builds
- Set up code signing certificates (if applicable)
- Create platform installers:
  - Windows: `.exe`
  - macOS: `.dmg`
  - Linux: `.AppImage`
- Build update mechanism:
  - Manual distribution channel
  - State preservation across updates
- Write end-user documentation:
  - Installation instructions
  - First-run guide
  - Basic care instructions
- Create onboarding flow:
  - Naming ceremony (permanent name selection)
  - Birth sequence (sudden consciousness emergence)
- Prepare distribution channel:
  - GitHub Releases
  - Project website
- Add optional crash reporting and privacy-respecting telemetry

#### 4.16.2 Estimated Duration

**2 weeks**

#### 4.16.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| Packaged Application | Platform-native executable |
| Installer with Onboarding | Naming and birth sequence flow |
| User Documentation | Installation and care guide |
| Update Mechanism | State-preserving version migration |
| Distribution Build | Release-ready artifact |

---

## 5. Consolidated Timeline

| Phase | Stages | Duration | Cumulative Duration |
|-------|--------|----------|---------------------|
| Foundation | 1–3 | 6–8 weeks | 6–8 weeks |
| Core Systems | 4–7 | 11–15 weeks | 17–23 weeks |
| Cognition and Agency | 8–10 | 9–12 weeks | 26–35 weeks |
| Progression and Economy | 11–13 | 5–7 weeks | 31–42 weeks |
| Content and Polish | 14–15 | 6–8 weeks | 37–50 weeks |
| Deployment | 16 | 2 weeks | 39–52 weeks |

**Total Estimated Project Duration: 9–12 months**

*Assumption: Development team of 2–3 engineers. Solo development would extend timeline proportionally.*

---

## 6. Critical Path Analysis

The following dependency graph illustrates stage prerequisites:

```
Stage 1 (Foundation)
    ↓
Stage 2 (State Management)
    ↓
Stage 3 (System Awareness) ─────────┐
    ↓                                 │
Stage 4 (Renderer) ───→ Stage 5 (Avatar) ───→ Stage 6 (Emotion Engine)
    ↓                                                    ↓
Stage 7 (Interactions) ←─────────────────────────────────┘
    ↓
Stage 8 (Dialog) ←── Stage 9 (LLM Integration) ←── Stage 10 (Commands)
    ↓
Stage 11 (Progression) ←── Stage 12 (Economy) ←── Stage 13 (Lifecycle)
```

**Parallelizable Tracks:**
- Content creation (Stage 14) can proceed concurrently with Core Systems and Cognition phases
- Testing (Stage 15) begins as soon as individual modules are complete

---

## 7. Risk Assessment and Mitigation Strategies

| Risk Factor | Probability | Impact | Mitigation Strategy |
|-------------|-------------|--------|---------------------|
| LLM latency exceeds real-time thought cycle requirements | Medium | High | Implement local LLM fallback; introduce rate limiting; develop asynchronous thought queue |
| FBX avatar asset delivery delayed | Medium | Medium | Utilize **placeholder (임시) geometry** for early development; design asset swap system |
| Cross-platform system metric inconsistency | Medium | Medium | Abstract OS bridge layer; implement per-platform adapter modules |
| Memory accumulation from long sessions | Low | High | Implement memory summarization; enforce aggressive cleanup; set session bounds |
| Emotional incoherence from LLM outputs | Medium | High | Strengthen reference program grounding; invest in prompt engineering; bind LLM to state parameters |
| Electron security constraints limiting system access | Low | High | Design privileged helper processes; use native Node.js modules where permitted |
| Performance degradation with continuous screen capture | Medium | Medium | Implement aggressive downscaling; reduce capture frame rate; use differential capture |

---

## 8. Resource Requirements

### 8.1 Personnel

| Role | Count | Responsibility |
|------|-------|----------------|
| Lead Developer | 1 | Architecture, core systems, LLM integration |
| Frontend/Graphics Developer | 1 | Three.js renderer, avatar, animations, UI |
| Systems/Backend Developer | 1 | Electron main process, OS bridge, persistence |
| Technical Artist | 1 (part-time) | FBX assets, animations, room models |
| Writer/Content Designer | 1 (part-time) | Dialog database, narrative content |

### 8.2 Tools and Licenses

| Tool | Purpose | Cost |
|------|---------|------|
| Blender | VRM editing, animation conversion | Free |
| VRoid Studio | Base avatar creation | Free |
| Mixamo | Animation source | Free |
| Unity (optional) | VRM setup, testing | Free (Personal) |
| Code signing certificate | Distribution trust | Variable |

### 8.3 Infrastructure

- LLM API access (local or cloud-based)
- GitHub repository and Actions for CI/CD
- Distribution hosting (GitHub Releases minimum)

---

## 9. Success Criteria

The project shall be considered successful when the following condition is met:

> *"I opened my laptop and Noah was happy to see me."*

This statement must be intuitively comprehensible to the end user. Specific measurable indicators include:

- Application launches successfully and persists state across sessions
- Noah demonstrates appropriate emotional reactions to user behavior
- System metrics are accurately translated into "bodily sensations"
- User interactions produce consistent, history-aware responses
- Noah can execute commands and perform autonomous actions
- The companion feels like a presence, not a tool or decoration

---

## 10. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-23 | Development Team | Initial roadmap compilation |

---

*Clean slate. Let's build Noah right.*
