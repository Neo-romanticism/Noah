import * as THREE from 'three';
import { createHoverStateMachine } from './hover.js';

export type InteractionCallbackType = 'hoverenter' | 'hoverleave' | 'pointerdown' | 'pointerup';

export interface InteractionCallbacks {
  hoverenter?: (target: THREE.Object3D) => void;
  hoverleave?: (target: THREE.Object3D) => void;
  pointerdown?: (target: THREE.Object3D) => void;
  pointerup?: (target: THREE.Object3D) => void;
}

export interface InteractionManager {
  readonly raycaster: THREE.Raycaster;
  register(target: THREE.Object3D, callbacks?: InteractionCallbacks): void;
  unregister(target: THREE.Object3D): void;
  updatePointer(x: number, y: number): void;
  isHovering(target: THREE.Object3D): boolean;
  getHovered(): THREE.Object3D | null;
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

  function onPointerMove(event: PointerEvent): void {
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const hit = performIntersection();
    hover.setHovered(hit);
  }

  function onPointerDown(_event: PointerEvent): void {
    if (hover.hovered) {
      targets.get(hover.hovered)?.pointerdown?.(hover.hovered);
    }
  }

  function onPointerUp(_event: PointerEvent): void {
    if (hover.hovered) {
      targets.get(hover.hovered)?.pointerup?.(hover.hovered);
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
