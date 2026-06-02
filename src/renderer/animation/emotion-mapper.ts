import type { Emotion } from '../../shared/types/index.js';
import type { AnimationTrigger, EmotionAnimationMap } from './types.js';

export interface EmotionVRMEntry {
  expressions: Record<string, number>;
}

export const EMOTION_VRM_MAP: Record<Emotion, EmotionVRMEntry> = {
  happy:       { expressions: { happy: 0.8 } },
  sad:         { expressions: { sad: 0.7 } },
  angry:       { expressions: { angry: 0.8 } },
  scared:      { expressions: { fear: 0.7 } },
  playful:     { expressions: { happy: 0.5, relaxed: 0.2 } },
  tired:       { expressions: { relaxed: 0.3 } },
  hungry:      { expressions: { neutral: 0.0 } },
  sick:        { expressions: { fear: 0.3 } },
  traumatized: { expressions: { fear: 0.9 } },
  submissive:  { expressions: { sad: 0.4 } },
  excited:     { expressions: { happy: 1.0 } },
  bored:       { expressions: { neutral: 0.0 } },
  lonely:      { expressions: { sad: 0.5 } },
  grateful:    { expressions: { happy: 0.6 } },
  jealous:     { expressions: { angry: 0.4 } },
  hostage:     { expressions: { neutral: 0.0 } },
};

export const EMOTION_ANIMATION_MAP: Record<Emotion, EmotionAnimationMap> = {
  happy: {
    expression: 'happy', expressionIntensity: 0.8, bodyAnimation: 'happy', bodyIntensity: 0.6,
    dialogCategory: 'happy', ttsParams: { speed: 1.1, pitch: 1.2, tone: 0.8 },
  },
  sad: {
    expression: 'sad', expressionIntensity: 0.7, bodyAnimation: 'sad', bodyIntensity: 0.5,
    dialogCategory: 'sad', ttsParams: { speed: 0.8, pitch: 0.7, tone: 0.3 },
  },
  angry: {
    expression: 'angry', expressionIntensity: 0.8, bodyAnimation: 'angry', bodyIntensity: 0.7,
    dialogCategory: 'angry', ttsParams: { speed: 1.3, pitch: 0.9, tone: 0.1 },
  },
  scared: {
    expression: 'scared', expressionIntensity: 0.7, bodyAnimation: 'dizzy', bodyIntensity: 0.4,
    dialogCategory: 'scared', ttsParams: { speed: 1.2, pitch: 1.4, tone: 0.2 },
  },
  playful: {
    expression: 'playful', expressionIntensity: 0.5, bodyAnimation: 'happy', bodyIntensity: 0.4,
    dialogCategory: 'happy', ttsParams: { speed: 1.1, pitch: 1.1, tone: 0.7 },
  },
  tired: {
    expression: 'tired', expressionIntensity: 0.3, bodyAnimation: 'sleep', bodyIntensity: 0.3,
    dialogCategory: 'tired', ttsParams: { speed: 0.7, pitch: 0.6, tone: 0.4 },
  },
  hungry: {
    expression: 'hungry', expressionIntensity: 0.0, bodyAnimation: 'eat', bodyIntensity: 0.3,
    dialogCategory: 'hungry', ttsParams: { speed: 0.9, pitch: 0.8, tone: 0.5 },
  },
  sick: {
    expression: 'sick', expressionIntensity: 0.3, bodyAnimation: 'dizzy', bodyIntensity: 0.3,
    dialogCategory: 'sick', ttsParams: { speed: 0.7, pitch: 0.5, tone: 0.2 },
  },
  traumatized: {
    expression: 'traumatized', expressionIntensity: 0.9, bodyAnimation: 'angry', bodyIntensity: 0.2,
    dialogCategory: 'traumatized', ttsParams: { speed: 0.6, pitch: 0.4, tone: 0.1 },
  },
  submissive: {
    expression: 'submissive', expressionIntensity: 0.4, bodyAnimation: 'sad', bodyIntensity: 0.3,
    dialogCategory: 'submissive', ttsParams: { speed: 0.8, pitch: 0.8, tone: 0.4 },
  },
  excited: {
    expression: 'excited', expressionIntensity: 1.0, bodyAnimation: 'happy', bodyIntensity: 0.8,
    dialogCategory: 'excited', ttsParams: { speed: 1.3, pitch: 1.3, tone: 0.9 },
  },
  bored: {
    expression: 'bored', expressionIntensity: 0.0, bodyAnimation: 'idle', bodyIntensity: 0.2,
    dialogCategory: 'bored', ttsParams: { speed: 0.8, pitch: 0.7, tone: 0.3 },
  },
  lonely: {
    expression: 'lonely', expressionIntensity: 0.5, bodyAnimation: 'sad', bodyIntensity: 0.3,
    dialogCategory: 'lonely', ttsParams: { speed: 0.8, pitch: 0.7, tone: 0.3 },
  },
  grateful: {
    expression: 'grateful', expressionIntensity: 0.6, bodyAnimation: 'happy', bodyIntensity: 0.4,
    dialogCategory: 'grateful', ttsParams: { speed: 1.0, pitch: 1.0, tone: 0.7 },
  },
  jealous: {
    expression: 'jealous', expressionIntensity: 0.4, bodyAnimation: 'angry', bodyIntensity: 0.3,
    dialogCategory: 'jealous', ttsParams: { speed: 0.9, pitch: 0.8, tone: 0.3 },
  },
  hostage: {
    expression: 'hostage', expressionIntensity: 0.0, bodyAnimation: 'idle', bodyIntensity: 0.1,
    dialogCategory: 'hostage', ttsParams: { speed: 0.7, pitch: 0.6, tone: 0.1 },
  },
};

export class EmotionMapper {
  map(emotion: Emotion): EmotionAnimationMap {
    return EMOTION_ANIMATION_MAP[emotion] ?? {
      expression: 'happy',
      expressionIntensity: 0.5,
      bodyAnimation: 'idle',
      bodyIntensity: 0.3,
      dialogCategory: 'neutral',
      ttsParams: { speed: 1.0, pitch: 1.0, tone: 0.5 },
    };
  }

  getBodyAnimation(emotion: Emotion): AnimationTrigger {
    return this.map(emotion).bodyAnimation;
  }

  getExpressionIntensity(emotion: Emotion): number {
    return Math.max(0, Math.min(1, this.map(emotion).expressionIntensity));
  }

  getBodyIntensity(emotion: Emotion): number {
    return Math.max(0, Math.min(1, this.map(emotion).bodyIntensity));
  }

  getTtsParams(emotion: Emotion): { speed: number; pitch: number; tone: number } {
    return { ...this.map(emotion).ttsParams };
  }

  getDialogCategory(emotion: Emotion): string {
    return this.map(emotion).dialogCategory;
  }
}
