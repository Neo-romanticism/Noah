/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';
import { createPlaceholderAnimController } from '../../../src/renderer/animation/placeholder.js';
import type { PlaceholderParts } from '../../../src/renderer/animation/placeholder.js';
import type { AnimationRequest } from '../../../src/renderer/animation/types.js';

describe('PlaceholderAnimController', () => {
  function createTestParts(): { parts: PlaceholderParts; group: THREE.Group } {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.15, 0.4, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xffb6c1 }),
    );
    body.position.y = 0.35;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffe4c4 }),
    );
    head.position.y = 0.72;
    group.add(head);

    const leftEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x333333 }),
    );
    leftEye.position.set(-0.04, 0.74, 0.1);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x333333 }),
    );
    rightEye.position.set(0.04, 0.74, 0.1);
    group.add(rightEye);

    return { parts: { body, head, leftEye, rightEye }, group };
  }

  describe('initialization', () => {
    test('starts with idle animation', () => {
      const { parts, group } = createTestParts();
      const ctrl = createPlaceholderAnimController(parts, group);
      expect(ctrl.getCurrentTrigger()).toBe('idle');
      ctrl.dispose();
    });
  });

  describe('play', () => {
    test('accepts known animation trigger', () => {
      const { parts, group } = createTestParts();
      const ctrl = createPlaceholderAnimController(parts, group);

      const req: AnimationRequest = { trigger: 'happy', priority: 1, blendIn: 0.2 };
      const accepted = ctrl.play(req);
      expect(accepted).toBe(true);
      expect(ctrl.getCurrentTrigger()).toBe('happy');

      ctrl.dispose();
    });

    test('higher priority interrupts lower priority', () => {
      const { parts, group } = createTestParts();
      const ctrl = createPlaceholderAnimController(parts, group);

      const idleReq: AnimationRequest = { trigger: 'idle', priority: 0, blendIn: 0.3 };
      const highReq: AnimationRequest = { trigger: 'throw', priority: 3, blendIn: 0.1 };

      ctrl.play(idleReq);
      ctrl.play(highReq);

      expect(ctrl.getCurrentTrigger()).toBe('throw');

      ctrl.dispose();
    });

    test('lower priority is rejected', () => {
      const { parts, group } = createTestParts();
      const ctrl = createPlaceholderAnimController(parts, group);

      ctrl.play({ trigger: 'throw', priority: 3, blendIn: 0.1 });
      const accepted = ctrl.play({ trigger: 'idle', priority: 0, blendIn: 0.3 });

      expect(accepted).toBe(false);

      ctrl.dispose();
    });

    test('update drives motion on parts', () => {
      const { parts, group } = createTestParts();
      const ctrl = createPlaceholderAnimController(parts, group);

      const initialY = parts.body.position.y;
      ctrl.update(0.5);
      const updatedY = parts.body.position.y;

      expect(updatedY).not.toBe(initialY);

      ctrl.dispose();
    });

    test('throw animation rotates group', () => {
      const { parts, group } = createTestParts();
      const ctrl = createPlaceholderAnimController(parts, group);

      const initialRotY = group.rotation.y;
      ctrl.play({ trigger: 'throw', priority: 3, blendIn: 0.1 });
      ctrl.update(0.1);

      expect(group.rotation.y).not.toBe(initialRotY);

      ctrl.dispose();
    });
  });

  describe('stop and stopAll', () => {
    test('stopAll resets to idle', () => {
      const { parts, group } = createTestParts();
      const ctrl = createPlaceholderAnimController(parts, group);

      ctrl.play({ trigger: 'happy', priority: 1, blendIn: 0.2 });
      ctrl.stopAll();

      expect(ctrl.getCurrentTrigger()).toBe('idle');

      ctrl.dispose();
    });
  });

  describe('dispose', () => {
    test('dispose cleans up', () => {
      const { parts, group } = createTestParts();
      const ctrl = createPlaceholderAnimController(parts, group);

      expect(() => ctrl.dispose()).not.toThrow();
    });
  });
});
