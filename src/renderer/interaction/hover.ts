import * as THREE from 'three';
import type { InteractionCallbacks } from './index.js';

export function createHoverStateMachine(
  targets: Map<THREE.Object3D, InteractionCallbacks>,
) {
  let hoveredTarget: THREE.Object3D | null = null;

  return {
    get hovered() {
      return hoveredTarget;
    },
    setHovered(newTarget: THREE.Object3D | null) {
      if (newTarget === hoveredTarget) return;

      if (hoveredTarget) {
        targets.get(hoveredTarget)?.hoverleave?.(hoveredTarget);
      }
      hoveredTarget = newTarget;
      if (hoveredTarget) {
        targets.get(hoveredTarget)?.hoverenter?.(hoveredTarget);
      }
    },
    clear() {
      hoveredTarget = null;
    },
    isHovering(target: THREE.Object3D): boolean {
      return hoveredTarget === target;
    },
  };
}
