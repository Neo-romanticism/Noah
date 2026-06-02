/**
 * @jest-environment jsdom
 */

import { EMOTION_ANIMATION_MAP, EmotionMapper } from '../../../src/renderer/animation/emotion-mapper.js';
import type { Emotion } from '../../../src/shared/types/index.js';

const ALL_EMOTIONS: Emotion[] = [
  'happy', 'sad', 'angry', 'scared', 'playful', 'tired', 'hungry', 'sick',
  'traumatized', 'submissive', 'excited', 'bored', 'lonely', 'grateful', 'jealous', 'hostage',
];

describe('EmotionMapper', () => {
  describe('EMOTION_ANIMATION_MAP', () => {
    test('contains all 16 emotions', () => {
      for (const emotion of ALL_EMOTIONS) {
        expect(EMOTION_ANIMATION_MAP[emotion]).toBeDefined();
      }
    });

    test('each entry has required fields', () => {
      for (const emotion of ALL_EMOTIONS) {
        const entry = EMOTION_ANIMATION_MAP[emotion];
        expect(entry.expression).toBeDefined();
        expect(typeof entry.expressionIntensity).toBe('number');
        expect(entry.bodyAnimation).toBeDefined();
        expect(typeof entry.bodyIntensity).toBe('number');
        expect(typeof entry.dialogCategory).toBe('string');
        expect(entry.ttsParams).toBeDefined();
        expect(typeof entry.ttsParams.speed).toBe('number');
        expect(typeof entry.ttsParams.pitch).toBe('number');
        expect(typeof entry.ttsParams.tone).toBe('number');
      }
    });
  });

  describe('EmotionMapper class', () => {
    const mapper = new EmotionMapper();

    test('map returns valid mapping for all emotions', () => {
      for (const emotion of ALL_EMOTIONS) {
        const result = mapper.map(emotion);
        expect(result).toBeDefined();
        expect(result.bodyAnimation).toBeDefined();
      }
    });

    test('getExpressionIntensity clamps to [0, 1]', () => {
      const intensity = mapper.getExpressionIntensity('happy');
      expect(intensity).toBeGreaterThanOrEqual(0);
      expect(intensity).toBeLessThanOrEqual(1);
    });

    test('getBodyIntensity clamps to [0, 1]', () => {
      const intensity = mapper.getBodyIntensity('happy');
      expect(intensity).toBeGreaterThanOrEqual(0);
      expect(intensity).toBeLessThanOrEqual(1);
    });

    test('getBodyAnimation returns valid trigger', () => {
      const trigger = mapper.getBodyAnimation('happy');
      expect(['idle', 'drag', 'throw', 'land', 'dizzy', 'eat', 'sleep', 'happy', 'sad', 'angry']).toContain(trigger);
    });

    test('getTtsParams returns valid params', () => {
      const params = mapper.getTtsParams('happy');
      expect(params.speed).toBeGreaterThan(0);
      expect(params.pitch).toBeGreaterThan(0);
      expect(params.tone).toBeGreaterThanOrEqual(0);
    });

    test('getDialogCategory returns a string', () => {
      const cat = mapper.getDialogCategory('happy');
      expect(typeof cat).toBe('string');
    });

    test('unknown emotion returns default fallback', () => {
      const result = mapper.map('unknown' as Emotion);
      expect(result).toBeDefined();
      expect(result.bodyAnimation).toBe('idle');
    });
  });
});
