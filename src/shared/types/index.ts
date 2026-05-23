// Shared types across main and renderer processes

export interface NoahState {
  emotion: Emotion;
  affection: number;    // 0-100
  morality: number;     // 0-100
  hunger: number;       // 0-100
  fatigue: number;      // 0-100
  trauma: number;       // 0-100
  level: number;
  xp: number;
  lastSeen: number;     // timestamp
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

export interface SystemMetrics {
  cpuTemp: number;
  cpuLoad: number;
  ramUsage: number;
  uptime: number;
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
