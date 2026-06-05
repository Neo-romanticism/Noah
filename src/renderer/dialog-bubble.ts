import type { Emotion } from '../shared/types/index.js';

export interface DialogBubble {
  show(text: string, duration?: number): void;
  showEmotion(emotion: Emotion): void;
  hide(): void;
  update(delta: number): void;
  addToScene(): void;
  remove(): void;
}

export function createDialogBubble(): DialogBubble {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 12px 24px;
    border-radius: 16px;
    font-family: 'Noto Sans KR', sans-serif;
    font-size: 18px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 1000;
    max-width: 80%;
    text-align: center;
    white-space: nowrap;
  `;
  document.body.appendChild(el);

  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    show(text: string, duration: number = 3000) {
      el.textContent = text;
      el.style.opacity = '1';
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        el.style.opacity = '0';
      }, duration);
    },

    showEmotion(emotion: Emotion) {
      const labels: Record<Emotion, string> = {
        happy: '\u{1F60A} \uD589\uBCF5\uD574!',
        sad: '\u{1F622} \uC2AC\uD37C...',
        angry: '\u{1F620} \uD654\u0D0C\uC5C8\uC5B4!',
        scared: '\u{1F630} \uBB34\uC11C\uC6CC...',
        playful: '\u{1F61C} \uB180\uC790!',
        tired: '\u{1F634} \uC870\uB824...',
        hungry: '\u{1F37D}\uFE0F \uBC30\uACE0\uD30C...',
        sick: '\u{1F912} \uC544\uD30C...',
        traumatized: '\u{1F631} ...',
        submissive: '\u{1F97A} ...',
        excited: '\u{1F929} \uC2E0\uB098!',
        bored: '\u{1F610} \uC2EC\uC2EC\uD574...',
        lonely: '\u{1F614} \uC678\uB85C\uC6CC...',
        grateful: '\u{1F979} \uACE0\uB9C8\uC6CC',
        jealous: '\u{1F612} ...',
        hostage: '\u{1F636} ...',
      };
      this.show(labels[emotion] ?? '...', 2000);
    },

    hide() {
      el.style.opacity = '0';
      if (hideTimer) clearTimeout(hideTimer);
    },

    update(_delta: number) {
      // No per-frame updates needed for DOM-based bubble
    },

    addToScene() {
      // DOM-based, no Three.js scene needed
    },

    remove() {
      el.remove();
    },
  };
}