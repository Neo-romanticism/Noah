/**
 * @jest-environment jsdom
 */

import type { Emotion } from '../../../src/shared/types/index.js';
import { ExpressionController } from '../../../src/renderer/animation/expression.js';

describe('ExpressionController', () => {

  function createMockVRM(): any {
    const values: Record<string, number> = {};
    return {
      expressionManager: {
        setValue(name: string, weight: number) {
          values[name] = weight;
        },
        update() {},
        reset() {
          Object.keys(values).forEach(k => delete values[k]);
        },
        getValues: () => ({ ...values }),
      },
    };
  }

  describe('setExpression', () => {
    test('sets expression values on VRM expression manager', () => {
      const vrm = createMockVRM();
      const ctrl = new (ExpressionController as any)(vrm);

      ctrl.setExpression('happy' as Emotion, 1.0);

      const vals = vrm.expressionManager.getValues();
      expect(vals.happy).toBe(0.8);
    });

    test('resets previous expressions when setting new', () => {
      const vrm = createMockVRM();
      const ctrl = new (ExpressionController as any)(vrm);

      ctrl.setExpression('happy' as Emotion, 1.0);
      ctrl.setExpression('sad' as Emotion, 1.0);

      const vals = vrm.expressionManager.getValues();
      expect(vals.happy).toBe(0);
      expect(vals.sad).toBe(0.7);
    });
  });

  describe('blendToExpression', () => {
    test('starts interpolation when blendToExpression is called', () => {
      const vrm = createMockVRM();
      const ctrl = new (ExpressionController as any)(vrm);

      ctrl.setExpression('happy' as Emotion, 0.8);
      ctrl.blendToExpression('sad' as Emotion, 0.3);

      const state = ctrl.getState();
      expect(state.target).toBe('sad');
    });
  });

  describe('update', () => {
    test('update does not throw', () => {
      const vrm = createMockVRM();
      const ctrl = new (ExpressionController as any)(vrm);

      ctrl.setExpression('happy' as Emotion, 0.8);
      expect(() => ctrl.update(0.016)).not.toThrow();
    });
  });

  describe('reset', () => {
    test('reset clears expression state', () => {
      const vrm = createMockVRM();
      const ctrl = new (ExpressionController as any)(vrm);

      ctrl.setExpression('happy' as Emotion, 0.8);
      ctrl.reset();

      const state = ctrl.getState();
      expect(state.current).toBe('happy');
    });
  });

  describe('dispose', () => {
    test('dispose cleans up', () => {
      const vrm = createMockVRM();
      const ctrl = new (ExpressionController as any)(vrm);

      expect(() => ctrl.dispose()).not.toThrow();
    });
  });
});
