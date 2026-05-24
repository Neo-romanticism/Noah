// Shared types across main and renderer processes

export interface NoahState {
  // ── Core emotional parameters ──
  emotion: Emotion;
  affection: number;    // 0-100
  morality: number;     // 0-100
  hunger: number;       // 0-100
  fatigue: number;      // 0-100
  trauma: number;       // 0-100

  // ── Progression ──
  level: number;
  xp: number;

  // ── Session tracking ──
  lastSeen: number;           // timestamp of last user interaction
  sessionStart: number;       // timestamp when current session began
  totalOnlineTime: number;    // cumulative seconds user has been present
  totalOfflineTime: number;   // cumulative seconds user has been absent
  isSleeping: boolean;        // current sleep state

  // ── Needs system ──
  discomfortCount: number;    // 0-3, current uncleared discomfort items

  // ── System awareness ──
  systemLoad: number;         // 0-100, current CPU load

  // ── Metadata ──
  version: number;            // state schema version for migration
}

export type Emotion =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'scared'
  | 'playful'
  | 'tired'
  | 'hungry'
  | 'sick'
  | 'traumatized'
  | 'submissive'
  | 'excited'
  | 'bored'
  | 'lonely'
  | 'grateful'
  | 'jealous'
  | 'hostage';

export interface ProcessInfo {
  pid: number;
  name: string;
  cmd?: string;
}

export interface SystemMetrics {
  cpuTemp: number;
  cpuLoad: number;
  ramUsage: number;
  uptime: number;
  processes: ProcessInfo[];
}

export interface InteractionEvent {
  type: InteractionType;
  position?: { x: number; y: number };
  velocity?: { x: number; y: number };
  timestamp: number;
}

export type InteractionType =
  | 'drag'
  | 'throw'
  | 'pet'
  | 'click'
  | 'feed'
  | 'clean'
  | 'sleep'
  | 'play';

export interface DialogEntry {
  id: string;
  emotion: Emotion;
  context: string;
  text: Record<string, string>;
  weight: number;
  cooldown?: number;
}

// ── Memory System Types ──────────────────────────────────────

export type MemoryEventType =
  | 'fed'
  | 'petted'
  | 'dragged'
  | 'dragged_rough'
  | 'thrown'
  | 'thrown_hard'
  | 'clicked'
  | 'cleaned'
  | 'ignored'
  | 'terminated'
  | 'returned'
  | 'slept'
  | 'woke'
  | 'leveled_up'
  | 'gifted'
  | 'spoken_to'
  | 'command_executed'
  | 'command_refused'
  | 'autonomous_action'
  | 'system_event';

export interface MemoryEvent {
  id: string;               // UUID v4 for uniqueness
  type: MemoryEventType;    // categorized event type
  timestamp: number;        // Unix timestamp (seconds precision)
  severity: number;         // 1-10 impact scale
  context: {
    emotion: Emotion;       // Noah's emotion at time of event
    affection: number;      // Parameter snapshot
    morality: number;
    hunger: number;
    fatigue: number;
    trauma: number;
  };
  decay: number;            // 0.0-1.0, current decay coefficient
  description?: string;     // Optional human-readable description
}

export interface MemoryFilter {
  types?: MemoryEventType[];
  startTime?: number;
  endTime?: number;
  minSeverity?: number;
  maxSeverity?: number;
}
