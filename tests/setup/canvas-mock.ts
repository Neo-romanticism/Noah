const canvasEl = document.createElement('canvas');
const ctx2d = canvasEl.getContext('2d')!;
Object.defineProperty(ctx2d.constructor.prototype, 'measureText', {
  value(text: string) {
    return { width: text.length * 24 };
  },
});
