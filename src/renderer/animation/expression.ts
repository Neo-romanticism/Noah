import type { Emotion } from '../../shared/types/index.js';
import type { ExpressionState } from './types.js';
import { EMOTION_VRM_MAP } from './emotion-mapper.js';

export class ExpressionController {
  private vrm: any;
  private currentExpressions: Map<string, number> = new Map();
  private state: ExpressionState;
  private targetExpressions: Map<string, number> = new Map();
  private blendTimer: number = 0;
  private blendDuration: number = 0;
  private isBlending: boolean = false;

  private blinkTimer: number = 0;
  private blinkInterval: number = 3000;
  private blinkDuration: number = 0.15;
  private isBlinking: boolean = false;
  private blinkPhaseTimer: number = 0;

  constructor(vrm: any) {
    this.vrm = vrm;
    this.state = {
      current: 'happy',
      intensity: 1,
      target: null,
      transitionProgress: 0,
    };
  }

  setExpression(emotion: Emotion, intensity: number = 1): void {
    this.state.current = emotion;
    this.state.intensity = intensity;
    this.state.target = null;
    this.state.transitionProgress = 0;
    this.isBlending = false;

    this.applyExpression(emotion, intensity);
  }

  private applyExpression(emotion: Emotion, intensity: number): void {
    const entry = EMOTION_VRM_MAP[emotion];
    if (!entry) return;

    const expressionManager = this.vrm?.expressionManager;
    if (!expressionManager) return;

    for (const [prevName] of this.currentExpressions) {
      expressionManager.setValue(prevName, 0);
    }
    this.currentExpressions.clear();

    for (const [exprName, weight] of Object.entries(entry.expressions)) {
      const w = weight * intensity;
      expressionManager.setValue(exprName, w);
      this.currentExpressions.set(exprName, w);
    }

    if (typeof expressionManager.update === 'function') {
      expressionManager.update();
    }
  }

  blendToExpression(emotion: Emotion, duration: number): void {
    const entry = EMOTION_VRM_MAP[emotion];
    if (!entry) return;

    this.state.target = emotion;
    this.blendDuration = duration;
    this.blendTimer = 0;
    this.isBlending = true;

    this.targetExpressions.clear();
    for (const [exprName, weight] of Object.entries(entry.expressions)) {
      this.targetExpressions.set(exprName, weight);
    }
  }

  update(delta: number): void {
    this.updateBlink(delta);

    if (this.isBlending) {
      this.blendTimer += delta;
      const progress = Math.min(this.blendTimer / this.blendDuration, 1);

      const expressionManager = this.vrm?.expressionManager;
      if (expressionManager) {
        for (const [exprName, targetWeight] of this.targetExpressions) {
          const currentWeight = this.currentExpressions.get(exprName) ?? 0;
          const lerpedWeight = currentWeight + (targetWeight - currentWeight) * progress;
          expressionManager.setValue(exprName, lerpedWeight);
          this.currentExpressions.set(exprName, lerpedWeight);
        }
      }

      this.state.transitionProgress = progress;

      if (progress >= 1) {
        this.isBlending = false;
        this.state.current = this.state.target!;
        this.state.target = null;
        this.state.transitionProgress = 1;
      }
    }
  }

  private updateBlink(delta: number): void {
    if (this.isBlinking) {
      this.blinkPhaseTimer += delta;
      this.applyBlinkWeight(this.blinkPhaseTimer / this.blinkDuration);

      if (this.blinkPhaseTimer >= this.blinkDuration) {
        this.isBlinking = false;
        this.applyBlinkWeight(0);
        this.scheduleNextBlink();
      }
      return;
    }

    this.blinkTimer += delta;
    if (this.blinkTimer >= this.blinkInterval) {
      this.startBlink();
    }
  }

  private startBlink(): void {
    if (this.shouldSkipBlink()) return;

    this.isBlinking = true;
    this.blinkPhaseTimer = 0;
  }

  private applyBlinkWeight(t: number): void {
    const expressionManager = this.vrm?.expressionManager;
    if (!expressionManager) return;

    const blinkNames = ['blink', 'Blink', 'BLINK'];
    for (const name of blinkNames) {
      try {
        expressionManager.setValue(name, t);
      } catch {
        continue;
      }
    }
  }

  private shouldSkipBlink(): boolean {
    const skipEmotions: Emotion[] = ['angry', 'excited', 'scared', 'traumatized'];
    return skipEmotions.includes(this.state.current);
  }

  private scheduleNextBlink(): void {
    this.blinkTimer = 0;
    this.blinkInterval = 2000 + Math.random() * 2000;
  }

  reset(): void {
    this.currentExpressions.clear();
    this.isBlending = false;
    this.state = {
      current: 'happy',
      intensity: 1,
      target: null,
      transitionProgress: 0,
    };

    const expressionManager = this.vrm?.expressionManager;
    if (expressionManager) {
      expressionManager.reset?.();
    }
  }

  getState(): ExpressionState {
    return { ...this.state };
  }

  dispose(): void {
    this.currentExpressions.clear();
    this.targetExpressions.clear();
    this.isBlending = false;
    this.isBlinking = false;
  }
}
