import type { Emotion } from '../../shared/types/index.js';
import * as THREE from 'three';

export type AnimationTrigger =
  | 'idle' | 'drag' | 'throw' | 'land' | 'dizzy'
  | 'eat' | 'sleep' | 'happy' | 'sad' | 'angry';

export interface AnimationClipData {
  trigger: AnimationTrigger;
  clip: THREE.AnimationClip;
  loop: boolean;
  priority: number;
  blendIn: number;
  blendOut: number;
}

export interface AnimationRequest {
  trigger: AnimationTrigger;
  priority: number;
  blendIn: number;
  onComplete?: () => void;
}

export interface AnimationController {
  mixer: THREE.AnimationMixer | null;
  registerClip(data: AnimationClipData): void;
  play(request: AnimationRequest): boolean;
  stop(trigger: AnimationTrigger): void;
  stopAll(): void;
  update(delta: number): void;
  getCurrentTrigger(): AnimationTrigger | null;
  getQueuedCount(): number;
  dispose(): void;
}

export interface ExpressionState {
  current: Emotion;
  intensity: number;
  target: Emotion | null;
  transitionProgress: number;
}

export interface EmotionAnimationMap {
  expression: Emotion;
  expressionIntensity: number;
  bodyAnimation: AnimationTrigger;
  bodyIntensity: number;
  dialogCategory: string;
  ttsParams: {
    speed: number;
    pitch: number;
    tone: number;
  };
}

export interface OverrideState {
  fakeEmotion: Emotion;
  trueEmotion: Emotion;
  remaining: number;
  leakIntensity: number;
}

export interface AnimationManifestEntry {
  file: string;
  loop: boolean;
  priority: number;
  blendIn: number;
  blendOut?: number;
}

export interface AnimationManifest {
  [trigger: string]: AnimationManifestEntry;
}
