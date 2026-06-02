import * as THREE from 'three';
import type { Emotion } from '../../shared/types/index.js';
import type { InteractionType } from '../../shared/types/index.js';
import type { AnimationTrigger, AnimationController, OverrideState } from './types.js';
import { createAnimationController } from './controller.js';
import { createPlaceholderAnimController, type PlaceholderParts } from './placeholder.js';
import { loadAnimationManifest, loadAnimationClips } from './loader.js';
import { ExpressionController } from './expression.js';
import { EmotionMapper } from './emotion-mapper.js';
import type { IAvatar } from '../avatar.js';

const INTERACTION_TO_TRIGGER: Record<InteractionType, AnimationTrigger> = {
  drag: 'drag',
  throw: 'throw',
  pet: 'happy',
  click: 'happy',
  feed: 'eat',
  clean: 'idle',
  sleep: 'sleep',
  play: 'happy',
};

const TRIGGER_PRIORITY: Record<AnimationTrigger, number> = {
  idle: 0,
  drag: 2,
  throw: 3,
  land: 2,
  dizzy: 1,
  eat: 1,
  sleep: 1,
  happy: 1,
  sad: 1,
  angry: 2,
};

const TRIGGER_BLEND_IN: Record<AnimationTrigger, number> = {
  idle: 0.3,
  drag: 0.15,
  throw: 0.1,
  land: 0.1,
  dizzy: 0.2,
  eat: 0.2,
  sleep: 0.5,
  happy: 0.2,
  sad: 0.3,
  angry: 0.15,
};

export class AnimationSystem {
  private controller: AnimationController;
  private expressionCtrl: ExpressionController | null;
  private mapper: EmotionMapper;
  private vrm: any;
  private currentEmotion: Emotion = 'happy';
  private overrideState: OverrideState | null = null;
  constructor(
    avatar: IAvatar,
    private manifestPath: string,
  ) {
    const animations = avatar.animations ?? [];
    const hasVRM = !!avatar.vrm;

    if (hasVRM) {
      this.controller = createAnimationController(avatar.group, animations);
      this.expressionCtrl = new ExpressionController(avatar.vrm);
      this.vrm = avatar.vrm;
    } else {
      const parts = this.extractPlaceholderParts(avatar);
      this.controller = createPlaceholderAnimController(parts, avatar.group);
      this.expressionCtrl = null;
      this.vrm = null;
    }

    this.mapper = new EmotionMapper();
  }

  private extractPlaceholderParts(avatar: IAvatar): PlaceholderParts {
    const meshes = avatar.group.children.filter((c): c is THREE.Mesh => (c as THREE.Mesh).isMesh);
    const body = meshes[0] ?? new THREE.Mesh();
    const head = meshes[1] ?? new THREE.Mesh();
    const leftEye = meshes[2] ?? new THREE.Mesh();
    const rightEye = meshes[3] ?? new THREE.Mesh();
    return { body, head, leftEye, rightEye };
  }

  async initialize(): Promise<void> {
    try {
      const manifest = await loadAnimationManifest(this.manifestPath);
      const manifestDir = this.manifestPath.substring(0, this.manifestPath.lastIndexOf('/'));
      const clips = await loadAnimationClips(manifest, manifestDir);

      for (const clipData of clips) {
        this.controller.registerClip(clipData);
      }
    } catch (err) {
      console.warn('[AnimationSystem] Failed to load animation manifest, using procedural fallback:', err);
    }

  }

  playInteraction(interaction: InteractionType): void {
    const trigger = INTERACTION_TO_TRIGGER[interaction] ?? 'idle';
    this.playTrigger(trigger);
  }

  playTrigger(trigger: AnimationTrigger): void {
    const priority = TRIGGER_PRIORITY[trigger];
    const blendIn = TRIGGER_BLEND_IN[trigger];
    this.controller.play({ trigger, priority, blendIn });
  }

  setEmotion(emotion: Emotion, intensity?: number): void {
    this.currentEmotion = emotion;

    if (this.overrideState) {
      const fakeEmotion = this.overrideState.fakeEmotion;
      const map = this.mapper.map(fakeEmotion);
      this.expressionCtrl?.setExpression(fakeEmotion, intensity ?? map.expressionIntensity);

      const leakIntensity = this.overrideState.leakIntensity;
      if (leakIntensity > 0) {
        const trueMap = this.mapper.map(emotion);
        const trueTrigger = trueMap.bodyAnimation;
        const leakPriority = 0;
        this.controller.play({ trigger: trueTrigger, priority: leakPriority, blendIn: 0.3 });
      }
    } else {
      const map = this.mapper.map(emotion);
      this.expressionCtrl?.setExpression(map.expression, intensity ?? map.expressionIntensity);
      const bodyAnim = map.bodyAnimation;
      const priority = TRIGGER_PRIORITY[bodyAnim];
      const blendIn = TRIGGER_BLEND_IN[bodyAnim];
      this.controller.play({ trigger: bodyAnim, priority, blendIn });
    }
  }

  overrideExpression(emotion: Emotion, duration: number = -1): void {
    this.overrideState = {
      fakeEmotion: emotion,
      trueEmotion: this.currentEmotion,
      remaining: duration,
      leakIntensity: 0.15,
    };

    const map = this.mapper.map(emotion);
    this.expressionCtrl?.setExpression(map.expression, map.expressionIntensity);
  }

  clearOverride(): void {
    if (!this.overrideState) return;

    this.overrideState = null;
    const map = this.mapper.map(this.currentEmotion);
    this.expressionCtrl?.setExpression(map.expression, map.expressionIntensity);
  }

  update(delta: number): void {
    this.controller.update(delta);
    this.expressionCtrl?.update(delta);

    if (this.vrm && typeof this.vrm.update === 'function') {
      this.vrm.update(delta);
    }

    if (this.overrideState && this.overrideState.remaining > 0) {
      this.overrideState.remaining -= delta;
      if (this.overrideState.remaining <= 0) {
        this.clearOverride();
      }
    }
  }

  dispose(): void {
    this.controller.dispose();
    this.expressionCtrl?.dispose();
    this.overrideState = null;
  }
}
