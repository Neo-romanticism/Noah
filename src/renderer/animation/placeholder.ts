import * as THREE from 'three';
import type { AnimationTrigger, AnimationRequest, AnimationController } from './types.js';

export interface PlaceholderParts {
  body: THREE.Mesh;
  head: THREE.Mesh;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
}

interface ProceduralAnimation {
  update(parts: PlaceholderParts, group: THREE.Group, delta: number, elapsed: number): void;
  duration: number;
  loop: boolean;
  priority: number;
  blendIn: number;
}

function getBodyMat(parts: PlaceholderParts): THREE.MeshStandardMaterial {
  const mat = parts.body.material;
  return (Array.isArray(mat) ? mat[0] : mat) as THREE.MeshStandardMaterial;
}

const PROCEDURAL_ANIMATIONS: Record<AnimationTrigger, ProceduralAnimation> = {
  idle: {
    duration: Infinity,
    loop: true,
    priority: 0,
    blendIn: 0.3,
    update(parts, group, _delta, elapsed) {
      parts.body.position.y = 0.35 + Math.sin(elapsed * 2) * 0.005;
      parts.head.rotation.z = Math.sin(elapsed * 1.5) * 0.02;
      group.rotation.x = 0;
      group.rotation.y = 0;
      parts.head.position.y = 0.72;
      parts.head.scale.setScalar(1);
      parts.body.scale.setScalar(1);
      getBodyMat(parts).color.setHex(0xffb6c1);
    },
  },
  drag: {
    duration: Infinity,
    loop: true,
    priority: 2,
    blendIn: 0.15,
    update(parts, group, _delta, _elapsed) {
      const targetAngle = 0.3;
      group.rotation.y += (targetAngle - group.rotation.y) * 0.1;
      parts.body.position.y = 0.35;
      parts.head.rotation.z = 0;
      parts.head.position.y = 0.72;
    },
  },
  throw: {
    duration: 0.5,
    loop: false,
    priority: 3,
    blendIn: 0.1,
    update(parts, group, delta, elapsed) {
      const progress = Math.min(elapsed / 0.5, 1);
      group.rotation.y += delta * 12;
      parts.body.position.y = 0.35 + progress * 0.5;
    },
  },
  land: {
    duration: 0.3,
    loop: false,
    priority: 2,
    blendIn: 0.1,
    update(parts, _group, _delta, elapsed) {
      const progress = Math.min(elapsed / 0.3, 1);
      const squish = 0.8 + Math.sin(progress * Math.PI) * 0.2;
      parts.body.scale.y = squish;
      parts.body.position.y = 0.35;
    },
  },
  dizzy: {
    duration: Infinity,
    loop: true,
    priority: 1,
    blendIn: 0.2,
    update(parts, _group, _delta, elapsed) {
      parts.head.rotation.z = Math.sin(elapsed * 20) * 0.3;
      parts.body.position.x = Math.sin(elapsed * 15) * 0.01;
    },
  },
  eat: {
    duration: Infinity,
    loop: true,
    priority: 1,
    blendIn: 0.2,
    update(parts, _group, _delta, elapsed) {
      const bob = 1 + Math.sin(elapsed * 10) * 0.1;
      parts.head.scale.set(bob, bob, 1);
      parts.head.position.y = 0.72 + Math.sin(elapsed * 8) * 0.005;
    },
  },
  sleep: {
    duration: Infinity,
    loop: true,
    priority: 1,
    blendIn: 0.5,
    update(parts, group, _delta, _elapsed) {
      const targetX = Math.PI / 2;
      group.rotation.x += (targetX - group.rotation.x) * 0.02;
      getBodyMat(parts).color.setHex(0x887788);
    },
  },
  happy: {
    duration: Infinity,
    loop: true,
    priority: 1,
    blendIn: 0.2,
    update(parts, group, _delta, elapsed) {
      group.position.y = Math.abs(Math.sin(elapsed * 6)) * 0.02;
      parts.head.rotation.z = Math.sin(elapsed * 4) * 0.1;
    },
  },
  sad: {
    duration: Infinity,
    loop: true,
    priority: 1,
    blendIn: 0.3,
    update(parts, _group, _delta, elapsed) {
      parts.head.position.y = 0.70 + Math.sin(elapsed * 1.5) * 0.003;
      parts.head.rotation.x = 0.15;
    },
  },
  angry: {
    duration: Infinity,
    loop: true,
    priority: 2,
    blendIn: 0.15,
    update(parts, group, _delta, elapsed) {
      group.position.x = Math.sin(elapsed * 30) * 0.005;
      parts.head.rotation.z = Math.sin(elapsed * 25) * 0.05;
    },
  },
};

export function createPlaceholderAnimController(
  parts: PlaceholderParts,
  group: THREE.Group,
): AnimationController {
  let currentTrigger: AnimationTrigger = 'idle';
  let currentAnim: ProceduralAnimation = PROCEDURAL_ANIMATIONS.idle;
  let elapsed = 0;
  let intensity = 1;
  const queue: AnimationRequest[] = [];

  const mixer = null;

  function startAnimation(request: AnimationRequest): void {
    const anim = PROCEDURAL_ANIMATIONS[request.trigger];
    if (!anim) return;

    currentTrigger = request.trigger;
    currentAnim = anim;
    elapsed = 0;
    intensity = 0;
  }

  function returnToIdle(): void {
    currentTrigger = 'idle';
    currentAnim = PROCEDURAL_ANIMATIONS.idle;
    elapsed = 0;
    intensity = 0;
  }

  function blendOutPrevious(delta: number): void {
    intensity = Math.min(1, intensity + delta / currentAnim.blendIn);
  }

  function update(delta: number): void {
    elapsed += delta;
    blendOutPrevious(delta);

    currentAnim.update(parts, group, delta, elapsed);

    if (!currentAnim.loop && elapsed >= currentAnim.duration) {
      if (queue.length > 0) {
        const next = queue.shift()!;
        startAnimation(next);
      } else {
        returnToIdle();
      }
    }
  }

  function play(request: AnimationRequest): boolean {
    const anim = PROCEDURAL_ANIMATIONS[request.trigger];
    if (!anim) return false;

    const actualPriority = request.priority ?? anim.priority;
    const cPrio = currentAnim?.priority ?? 0;

    if (actualPriority > cPrio) {
      startAnimation(request);
      return true;
    }

    if (actualPriority === cPrio) {
      queue.push(request);
      return true;
    }

    return false;
  }

  function stop(trigger: AnimationTrigger): void {
    const idx = queue.findIndex(r => r.trigger === trigger);
    if (idx >= 0) queue.splice(idx, 1);
    if (currentTrigger === trigger) {
      returnToIdle();
    }
  }

  function stopAll(): void {
    queue.length = 0;
    returnToIdle();
  }

  function getCurrentTrigger(): AnimationTrigger | null {
    return currentTrigger;
  }

  function getQueuedCount(): number {
    return queue.length;
  }

  function dispose(): void {
    queue.length = 0;
    currentTrigger = 'idle';
    currentAnim = PROCEDURAL_ANIMATIONS.idle;
    elapsed = 0;
    intensity = 1;
  }

  return {
    mixer,
    registerClip() {},
    play,
    stop,
    stopAll,
    update,
    getCurrentTrigger,
    getQueuedCount,
    dispose,
  };
}
