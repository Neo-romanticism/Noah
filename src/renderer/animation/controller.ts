import * as THREE from 'three';
import type { AnimationTrigger, AnimationClipData, AnimationRequest, AnimationController } from './types.js';

const IDLE_PRIORITY = 0;

function createIdleClipData(): AnimationClipData {
  const track = new THREE.VectorKeyframeTrack(
    '.position[y]',
    [0, 1],
    [0, 0],
    THREE.InterpolateSmooth,
  );
  const clip = new THREE.AnimationClip('idle', 1, [track]);
  return { trigger: 'idle', clip, loop: true, priority: IDLE_PRIORITY, blendIn: 0.3, blendOut: 0.3 };
}

export function createAnimationController(
  root: THREE.Object3D,
  animations: THREE.AnimationClip[],
): AnimationController {
  const mixer = new THREE.AnimationMixer(root);
  let currentAction: THREE.AnimationAction | null = null;
  let currentTrigger: AnimationTrigger | null = null;
  let currentPriority = -1;
  const queue: AnimationRequest[] = [];
  const clips = new Map<AnimationTrigger, AnimationClipData>();

  const idleClipData = createIdleClipData();
  clips.set('idle', idleClipData);

  const ALL_TRIGGERS: AnimationTrigger[] = [
    'idle', 'drag', 'throw', 'land', 'dizzy',
    'eat', 'sleep', 'happy', 'sad', 'angry',
  ];

  if (animations.length > 0) {
    const idleClip = animations.find(c => c.name.toLowerCase().includes('idle')) ?? animations[0]!;
    const idleData: AnimationClipData = {
      trigger: 'idle',
      clip: idleClip,
      loop: true,
      priority: IDLE_PRIORITY,
      blendIn: 0.3,
      blendOut: 0.3,
    };
    clips.set('idle', idleData);
  }

  for (const clip of animations) {
    const name = clip.name.toLowerCase();
    if (name === 'idle') continue;
    for (const trigger of ALL_TRIGGERS) {
      if (trigger === 'idle') continue;
      if (name.includes(trigger) || trigger.includes(name)) {
        if (!clips.has(trigger) || clips.get(trigger)!.clip === idleClipData.clip) {
          clips.set(trigger, {
            trigger,
            clip,
            loop: true,
            priority: 1,
            blendIn: 0.2,
            blendOut: 0.2,
          });
        }
        break;
      }
    }
  }

  function getOrCreateAction(data: AnimationClipData): THREE.AnimationAction {
    let action = mixer.clipAction(data.clip);
    if (!action) {
      action = mixer.clipAction(data.clip);
    }
    action.loop = data.loop ? THREE.LoopRepeat : THREE.LoopOnce;
    action.clampWhenFinished = !data.loop;
    return action;
  }

  function processQueue(): void {
    if (queue.length === 0) {
      playIdle();
      return;
    }
    const next = queue.shift()!;
    doPlay(next);
  }

  function playIdle(): void {
    const idleData = clips.get('idle');
    if (!idleData) return;
    const action = getOrCreateAction(idleData);
    action.reset();
    action.loop = THREE.LoopRepeat;
    action.clampWhenFinished = false;

    if (currentAction && currentAction !== action) {
      action.crossFadeFrom(currentAction, idleData.blendIn, true);
    }
    action.play();
    currentAction = action;
    currentTrigger = 'idle';
    currentPriority = IDLE_PRIORITY;
  }

  function doPlay(request: AnimationRequest): void {
    const data = clips.get(request.trigger);
    if (!data) return;

    const action = getOrCreateAction(data);
    action.reset();
    action.loop = data.loop ? THREE.LoopRepeat : THREE.LoopOnce;
    action.clampWhenFinished = !data.loop;

    if (currentAction && currentAction !== action) {
      action.crossFadeFrom(currentAction, request.blendIn, true);
    }

    if (!data.loop) {
      mixer.addEventListener('finished', function onFinished(e) {
        if (e.action === action) {
          mixer.removeEventListener('finished', onFinished);
          request.onComplete?.();
          processQueue();
        }
      });
    }

    action.play();
    currentAction = action;
    currentTrigger = request.trigger;
    currentPriority = request.priority;
  }

  function play(request: AnimationRequest): boolean {
    const data = clips.get(request.trigger);
    if (!data) return false;

    const actualPriority = request.priority;

    if (actualPriority > currentPriority) {
      doPlay(request);
      return true;
    }

    if (actualPriority === currentPriority) {
      queue.push(request);
      return true;
    }

    return false;
  }

  function stop(trigger: AnimationTrigger): void {
    const idx = queue.findIndex(r => r.trigger === trigger);
    if (idx >= 0) queue.splice(idx, 1);
    if (currentTrigger === trigger) {
      stopAll();
    }
  }

  function stopAll(): void {
    queue.length = 0;
    if (currentAction) {
      currentAction.stop();
      currentAction = null;
    }
    currentTrigger = null;
    currentPriority = -1;
    playIdle();
  }

  function update(delta: number): void {
    mixer.update(delta);
  }

  function getCurrentTrigger(): AnimationTrigger | null {
    return currentTrigger;
  }

  function getQueuedCount(): number {
    return queue.length;
  }

  function dispose(): void {
    queue.length = 0;
    if (currentAction) {
      currentAction.stop();
      currentAction = null;
    }
    mixer.stopAllAction();
    mixer.uncacheRoot(root);
    currentTrigger = null;
    currentPriority = -1;
  }

  playIdle();

  return {
    mixer,
    registerClip(data: AnimationClipData) {
      clips.set(data.trigger, data);
    },
    play,
    stop,
    stopAll,
    update,
    getCurrentTrigger,
    getQueuedCount,
    dispose,
  };
}
