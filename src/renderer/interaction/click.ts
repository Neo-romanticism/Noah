const CLICK_SPEED_THRESHOLD = 30;
const CLICK_SPEED_WINDOW_MS = 500;

export interface ClickDetector {
  recordClick(): void;
  isClickAbuse(): boolean;
  reset(): void;
}

export function createClickDetector(
  threshold: number = CLICK_SPEED_THRESHOLD,
  windowMs: number = CLICK_SPEED_WINDOW_MS,
): ClickDetector {
  const timestamps: number[] = [];

  return {
    recordClick() {
      timestamps.push(Date.now());
    },
    isClickAbuse() {
      const now = Date.now();
      const cutoff = now - windowMs;
      while (timestamps.length > 0 && timestamps[0]! < cutoff) {
        timestamps.shift();
      }
      return timestamps.length >= threshold;
    },
    reset() {
      timestamps.length = 0;
    },
  };
}
