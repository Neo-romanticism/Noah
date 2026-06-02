import * as THREE from 'three';
import { createHoverStateMachine } from './hover.js';
import { createDragTracker } from './drag.js';
import { createPetDetector } from './pet.js';
import { createClickDetector } from './click.js';

export type InteractionCallbackType = 'hoverenter' | 'hoverleave' | 'pointerdown' | 'pointerup';


export interface InteractionCallbacks {
  hoverenter?: (target: THREE.Object3D) => void;
  hoverleave?: (target: THREE.Object3D) => void;
  pointerdown?: (target: THREE.Object3D) => void;
  pointerup?: (target: THREE.Object3D) => void;
}

export interface InteractionEventCallbacks {
  onDragStart?: (position: { x: number; y: number }) => void;
  onDragMove?: (position: { x: number; y: number }, velocity: { x: number; y: number }) => void;
  onDragEnd?: (velocity: { x: number; y: number }) => void;
  onPetStart?: () => void;
  onPetMove?: () => void;
  onPetEnd?: () => void;
  onClick?: () => void;
}

export interface InteractionManager {
  readonly raycaster: THREE.Raycaster;
  register(target: THREE.Object3D, callbacks?: InteractionCallbacks): void;
  unregister(target: THREE.Object3D): void;
  updatePointer(x: number, y: number): void;
  isHovering(target: THREE.Object3D): boolean;
  getHovered(): THREE.Object3D | null;
  setEventCallbacks(callbacks: InteractionEventCallbacks): void;
  dispose(): void;
}

export function createInteractionManager(
  camera: THREE.Camera,
  domElement: HTMLElement,
): InteractionManager {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const targets = new Map<THREE.Object3D, InteractionCallbacks>();
  const hover = createHoverStateMachine(targets);
  const dragTracker = createDragTracker();
  const petDetector = createPetDetector();
  const clickDetector = createClickDetector();
  let eventCallbacks: InteractionEventCallbacks = {};
  let isDragging = false;
  let isPetting = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  function performIntersection(): THREE.Object3D | null {
    raycaster.setFromCamera(pointer, camera);
    const meshes = Array.from(targets.keys()).flatMap((obj) =>
      obj instanceof THREE.Mesh ? [obj] : obj.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh),
    );
    if (meshes.length === 0) return null;
    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length === 0) return null;
    const hit = intersects[0]!.object;
    const directTarget = targets.get(hit);
    if (directTarget) return hit;
    for (const [target] of targets) {
      if (target === hit || target.children.includes(hit)) return target;
    }
    return null;
  }

  function getPointerCoords(event: PointerEvent): { x: number; y: number } {
    const rect = domElement.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
  }

  function onPointerMove(event: PointerEvent): void {
    const coords = getPointerCoords(event);
    pointer.x = coords.x;
    pointer.y = coords.y;

    const hit = performIntersection();
    hover.setHovered(hit);

    if (isDragging && hover.hovered) {
      const velocity = dragTracker.update(event.clientX, event.clientY);
      eventCallbacks.onDragMove?.({ x: coords.x, y: coords.y }, { x: velocity.x, y: velocity.y });

      const dx = event.clientX - lastPointerX;
      const dy = event.clientY - lastPointerY;
      const dt = 0.016;
      if (petDetector.feedMovement(dx, dy, dt)) {
        if (!isPetting) {
          isPetting = true;
          eventCallbacks.onPetStart?.();
        }
        eventCallbacks.onPetMove?.();
      } else if (isPetting) {
        isPetting = false;
        eventCallbacks.onPetEnd?.();
      }
    }

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  }

  function onPointerDown(event: PointerEvent): void {
    const coords = getPointerCoords(event);
    pointer.x = coords.x;
    pointer.y = coords.y;

    if (hover.hovered) {
      targets.get(hover.hovered)?.pointerdown?.(hover.hovered);
      isDragging = true;
      dragTracker.start(hover.hovered, event.clientX, event.clientY);
      eventCallbacks.onDragStart?.({ x: coords.x, y: coords.y });
    }
  }

  function onPointerUp(_event: PointerEvent): void {
    if (hover.hovered) {
      targets.get(hover.hovered)?.pointerup?.(hover.hovered);
    }

    if (isDragging) {
      isDragging = false;
      const result = dragTracker.end();
      eventCallbacks.onDragEnd?.({ x: result.velocity.x, y: result.velocity.y });
    }

    if (isPetting) {
      isPetting = false;
      eventCallbacks.onPetEnd?.();
    }

    clickDetector.recordClick();
    if (!clickDetector.isClickAbuse()) {
      eventCallbacks.onClick?.();
    }
  }

  domElement.addEventListener('pointermove', onPointerMove);
  domElement.addEventListener('pointerdown', onPointerDown);
  domElement.addEventListener('pointerup', onPointerUp);

  return {
    get raycaster() {
      return raycaster;
    },
    register(target: THREE.Object3D, callbacks?: InteractionCallbacks) {
      targets.set(target, callbacks ?? {});
    },
    unregister(target: THREE.Object3D) {
      targets.delete(target);
      if (hover.isHovering(target)) {
        hover.clear();
      }
    },
    updatePointer(x: number, y: number) {
      pointer.set(x, y);
    },
    isHovering(target: THREE.Object3D) {
      return hover.isHovering(target);
    },
    getHovered() {
      return hover.hovered;
    },
    setEventCallbacks(callbacks: InteractionEventCallbacks) {
      eventCallbacks = callbacks;
    },
    dispose() {
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointerup', onPointerUp);
      targets.clear();
      hover.clear();
    },
  };
}

export { createHoverStateMachine } from './hover.js';
export { createClickDetector } from './click.js';
export { createPetDetector } from './pet.js';
export { createDragTracker } from './drag.js';
