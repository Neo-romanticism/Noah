/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';
import { createAnimationController } from '../../../src/renderer/animation/controller.js';
import type { AnimationRequest } from '../../../src/renderer/animation/types.js';

describe('AnimationController', () => {
  function createTestScene(): { root: THREE.Group; clips: THREE.AnimationClip[] } {
    const root = new THREE.Group();
    const track = new THREE.VectorKeyframeTrack(
      '.position[y]',
      [0, 1],
      [0, 1],
    );
    const idleClip = new THREE.AnimationClip('idle', 1, [track]);
    const happyClip = new THREE.AnimationClip('happy', 1, [track]);
    const sadClip = new THREE.AnimationClip('sad', 1, [track]);
    return { root, clips: [idleClip, happyClip, sadClip] };
  }

  describe('initialization', () => {
    test('creates controller and starts idle animation', () => {
      const { root, clips } = createTestScene();
      const ctrl = createAnimationController(root, clips);
      expect(ctrl.getCurrentTrigger()).toBe('idle');
      ctrl.dispose();
    });

    test('getQueuedCount returns 0 initially', () => {
      const { root, clips } = createTestScene();
      const ctrl = createAnimationController(root, clips);
      expect(ctrl.getQueuedCount()).toBe(0);
      ctrl.dispose();
    });
  });

  describe('priority queue', () => {
    test('higher priority interrupts lower priority', () => {
      const { root, clips } = createTestScene();
      const ctrl = createAnimationController(root, clips);

      const idleReq: AnimationRequest = { trigger: 'idle', priority: 0, blendIn: 0.3 };
      const highReq: AnimationRequest = { trigger: 'happy', priority: 3, blendIn: 0.1 };

      ctrl.play(idleReq);
      expect(ctrl.getCurrentTrigger()).toBe('idle');

      const accepted = ctrl.play(highReq);
      expect(accepted).toBe(true);
      expect(ctrl.getCurrentTrigger()).toBe('happy');

      ctrl.dispose();
    });

    test('lower priority is rejected', () => {
      const { root, clips } = createTestScene();
      const ctrl = createAnimationController(root, clips);

      const highReq: AnimationRequest = { trigger: 'happy', priority: 3, blendIn: 0.1 };
      ctrl.play(highReq);

      const lowReq: AnimationRequest = { trigger: 'sad', priority: 1, blendIn: 0.2 };
      const accepted = ctrl.play(lowReq);
      expect(accepted).toBe(false);

      ctrl.dispose();
    });

    test('equal priority requests queue FIFO', () => {
      const { root, clips } = createTestScene();
      const ctrl = createAnimationController(root, clips);

      const req1: AnimationRequest = { trigger: 'happy', priority: 1, blendIn: 0.1 };
      const req2: AnimationRequest = { trigger: 'sad', priority: 1, blendIn: 0.1 };

      ctrl.play(req1);
      ctrl.play(req2);

      expect(ctrl.getCurrentTrigger()).toBe('happy');
      expect(ctrl.getQueuedCount()).toBe(1);

      ctrl.dispose();
    });
  });

  describe('stop and stopAll', () => {
    test('stopAll resets to idle', () => {
      const { root, clips } = createTestScene();
      const ctrl = createAnimationController(root, clips);

      ctrl.play({ trigger: 'happy', priority: 3, blendIn: 0.1 });
      ctrl.stopAll();

      expect(ctrl.getCurrentTrigger()).toBe('idle');

      ctrl.dispose();
    });

    test('stop specific trigger removes from queue', () => {
      const { root, clips } = createTestScene();
      const ctrl = createAnimationController(root, clips);

      ctrl.play({ trigger: 'happy', priority: 1, blendIn: 0.1 });
      ctrl.play({ trigger: 'sad', priority: 1, blendIn: 0.1 });
      ctrl.stop('sad');

      expect(ctrl.getQueuedCount()).toBe(0);

      ctrl.dispose();
    });
  });

  describe('update', () => {
    test('update does not throw', () => {
      const { root, clips } = createTestScene();
      const ctrl = createAnimationController(root, clips);

      expect(() => ctrl.update(0.016)).not.toThrow();

      ctrl.dispose();
    });
  });

  describe('dispose', () => {
    test('dispose cleans up', () => {
      const { root, clips } = createTestScene();
      const ctrl = createAnimationController(root, clips);

      expect(() => ctrl.dispose()).not.toThrow();
    });
  });
});
