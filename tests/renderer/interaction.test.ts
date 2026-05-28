/**
 * @jest-environment jsdom
 */

import * as THREE from 'three';
import {
  createInteractionManager,
  createClickDetector,
  createPetDetector,
  createDragTracker,
  createHoverStateMachine,
} from '../../src/renderer/interaction/index.js';

describe('HoverStateMachine', () => {
  test('should dispatch hoverenter when target changes to non-null', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const onEnter = jest.fn();
    const onLeave = jest.fn();

    const targets = new Map<THREE.Object3D, ReturnType<typeof createHoverStateMachine> extends never ? never : import('../../src/renderer/interaction.js').InteractionCallbacks>();
    targets.set(mesh, { hoverenter: onEnter, hoverleave: onLeave });

    const state = createHoverStateMachine(targets);
    state.setHovered(mesh);

    expect(state.isHovering(mesh)).toBe(true);
    expect(state.hovered).toBe(mesh);
    expect(onEnter).toHaveBeenCalledWith(mesh);
    expect(onLeave).not.toHaveBeenCalled();
  });

  test('should dispatch hoverleave when target changes to null', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const onEnter = jest.fn();
    const onLeave = jest.fn();

    const targets = new Map<THREE.Object3D, import('../../src/renderer/interaction.js').InteractionCallbacks>();
    targets.set(mesh, { hoverenter: onEnter, hoverleave: onLeave });

    const state = createHoverStateMachine(targets);
    state.setHovered(mesh);
    state.setHovered(null);

    expect(state.hovered).toBeNull();
    expect(state.isHovering(mesh)).toBe(false);
    expect(onLeave).toHaveBeenCalledWith(mesh);
  });

  test('should dispatch leave then enter when switching targets', () => {
    const meshA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const meshB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const onEnterA = jest.fn();
    const onLeaveA = jest.fn();
    const onEnterB = jest.fn();
    const onLeaveB = jest.fn();

    const targets = new Map<THREE.Object3D, import('../../src/renderer/interaction.js').InteractionCallbacks>();
    targets.set(meshA, { hoverenter: onEnterA, hoverleave: onLeaveA });
    targets.set(meshB, { hoverenter: onEnterB, hoverleave: onLeaveB });

    const state = createHoverStateMachine(targets);
    state.setHovered(meshA);
    state.setHovered(meshB);

    expect(onLeaveA).toHaveBeenCalledWith(meshA);
    expect(onEnterB).toHaveBeenCalledWith(meshB);
    expect(onLeaveB).not.toHaveBeenCalled();
    expect(onEnterA).toHaveBeenCalledTimes(1);
  });

  test('should not dispatch when setting same target', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const onEnter = jest.fn();

    const targets = new Map<THREE.Object3D, import('../../src/renderer/interaction.js').InteractionCallbacks>();
    targets.set(mesh, { hoverenter: onEnter });

    const state = createHoverStateMachine(targets);
    state.setHovered(mesh);
    state.setHovered(mesh);

    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  test('should not dispatch when setting null to null', () => {
    const targets = new Map<THREE.Object3D, import('../../src/renderer/interaction.js').InteractionCallbacks>();
    const state = createHoverStateMachine(targets);

    expect(() => state.setHovered(null)).not.toThrow();
  });

  test('clear() should reset hovered state without callbacks', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const onLeave = jest.fn();

    const targets = new Map<THREE.Object3D, import('../../src/renderer/interaction.js').InteractionCallbacks>();
    targets.set(mesh, { hoverleave: onLeave });

    const state = createHoverStateMachine(targets);
    state.setHovered(mesh);
    state.clear();

    expect(state.hovered).toBeNull();
    expect(onLeave).not.toHaveBeenCalled();
  });

  test('should start with no hovered target', () => {
    const targets = new Map<THREE.Object3D, import('../../src/renderer/interaction.js').InteractionCallbacks>();
    const state = createHoverStateMachine(targets);

    expect(state.hovered).toBeNull();
  });

  test('should handle callbacks missing gracefully', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const targets = new Map<THREE.Object3D, import('../../src/renderer/interaction.js').InteractionCallbacks>();
    targets.set(mesh, {});

    const state = createHoverStateMachine(targets);

    expect(() => state.setHovered(mesh)).not.toThrow();
    expect(() => state.setHovered(null)).not.toThrow();
  });
});

describe('InteractionManager', () => {
  describe('createInteractionManager()', () => {
    test('should return an InteractionManager with raycaster', () => {
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      const domElement = document.createElement('div');
      const manager = createInteractionManager(camera, domElement);

      expect(manager.raycaster).toBeInstanceOf(THREE.Raycaster);

      manager.dispose();
    });

    test('should start with no hovered target', () => {
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      const domElement = document.createElement('div');
      const manager = createInteractionManager(camera, domElement);

      expect(manager.getHovered()).toBeNull();

      manager.dispose();
    });
  });

  describe('register / unregister', () => {
    test('should register and unregister targets', () => {
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      const domElement = document.createElement('div');
      const manager = createInteractionManager(camera, domElement);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

      manager.register(mesh);
      manager.unregister(mesh);

      expect(manager.getHovered()).toBeNull();

      manager.dispose();
    });

    test('registering without callbacks should not throw', () => {
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      const domElement = document.createElement('div');
      const manager = createInteractionManager(camera, domElement);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

      expect(() => manager.register(mesh)).not.toThrow();

      manager.dispose();
    });

    test('unregister should clear hovered state if that target was hovered', () => {
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      const domElement = document.createElement('div');
      const manager = createInteractionManager(camera, domElement);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

      manager.register(mesh, {
        hoverenter: jest.fn(),
        hoverleave: jest.fn(),
      });

      manager.unregister(mesh);

      expect(manager.isHovering(mesh)).toBe(false);

      manager.dispose();
    });
  });

  describe('updatePointer()', () => {
    test('should store pointer coordinates without errors', () => {
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      const domElement = document.createElement('div');
      const manager = createInteractionManager(camera, domElement);

      expect(() => manager.updatePointer(0.5, -0.5)).not.toThrow();

      manager.dispose();
    });
  });

  describe('isHovering()', () => {
    test('should return false for unregistered target', () => {
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      const domElement = document.createElement('div');
      const manager = createInteractionManager(camera, domElement);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

      expect(manager.isHovering(mesh)).toBe(false);

      manager.dispose();
    });
  });

  describe('dispose()', () => {
    test('should clear all state without errors', () => {
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      const domElement = document.createElement('div');
      const manager = createInteractionManager(camera, domElement);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

      manager.register(mesh);
      expect(() => manager.dispose()).not.toThrow();
      expect(manager.getHovered()).toBeNull();
    });
  });

  describe('event listeners', () => {
    test('should add event listeners to domElement on creation', () => {
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      const domElement = document.createElement('div');
      const addSpy = jest.spyOn(domElement, 'addEventListener');

      createInteractionManager(camera, domElement);

      expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));

      addSpy.mockRestore();
    });

    test('should remove event listeners on dispose', () => {
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      const domElement = document.createElement('div');
      const removeSpy = jest.spyOn(domElement, 'removeEventListener');
      const manager = createInteractionManager(camera, domElement);

      manager.dispose();

      expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));

      removeSpy.mockRestore();
    });
  });
});

describe('ClickDetector', () => {
  describe('createClickDetector()', () => {
    test('should not detect abuse with single click', () => {
      const detector = createClickDetector();
      detector.recordClick();

      expect(detector.isClickAbuse()).toBe(false);
    });

    test('should detect abuse after threshold clicks', () => {
      const detector = createClickDetector(3, 500);
      detector.recordClick();
      detector.recordClick();
      detector.recordClick();

      expect(detector.isClickAbuse()).toBe(true);
    });

    test('should reset after time window expires', () => {
      const detector = createClickDetector(2, 100);

      detector.recordClick();
      detector.recordClick();
      expect(detector.isClickAbuse()).toBe(true);

      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 200);
      expect(detector.isClickAbuse()).toBe(false);
      (Date.now as jest.Mock).mockRestore();
    });

    test('reset() should clear all timestamps', () => {
      const detector = createClickDetector(2, 500);
      detector.recordClick();
      detector.recordClick();
      detector.reset();

      expect(detector.isClickAbuse()).toBe(false);
    });
  });
});

describe('PetDetector', () => {
  describe('createPetDetector()', () => {
    test('should detect slow movement as petting', () => {
      const detector = createPetDetector(0.5);

      const result = detector.feedMovement(0.1, 0.05, 1.0);

      expect(result).toBe(true);
    });

    test('should reject fast movement as not petting', () => {
      const detector = createPetDetector(0.5);

      const result = detector.feedMovement(5, 3, 0.1);

      expect(result).toBe(false);
    });

    test('should return false when dt is zero', () => {
      const detector = createPetDetector(0.5);

      expect(detector.feedMovement(1, 1, 0)).toBe(false);
    });

    test('should return false for negative dt', () => {
      const detector = createPetDetector(0.5);

      expect(detector.feedMovement(1, 1, -1)).toBe(false);
    });
  });
});

describe('DragTracker', () => {
  describe('createDragTracker()', () => {
    test('should track velocity during drag', () => {
      const tracker = createDragTracker();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

      tracker.start(mesh, 0, 0);
      const vel = tracker.update(10, 0);

      expect(vel.x).not.toBe(0);
    });

    test('should return zero velocity before start', () => {
      const tracker = createDragTracker();

      const vel = tracker.update(10, 10);

      expect(vel.x).toBe(0);
      expect(vel.y).toBe(0);
    });

    test('end() should return final velocity and reset', () => {
      const tracker = createDragTracker();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

      tracker.start(mesh, 0, 0);
      tracker.update(100, 50);
      const result = tracker.end();

      expect(result.velocity.x).not.toBe(0);
      expect(result.velocity.y).not.toBe(0);
    });

    test('should compute velocity correctly over multiple frames', () => {
      const tracker = createDragTracker();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

      tracker.start(mesh, 0, 0);
      tracker.update(10, 0);
      tracker.update(30, 0);
      const result = tracker.end();

      expect(result.velocity.x).toBeGreaterThan(0);
    });
  });
});
