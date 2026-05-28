const PET_SPEED_THRESHOLD = 0.5;

export function createPetDetector(threshold: number = PET_SPEED_THRESHOLD): {
  feedMovement(dx: number, dy: number, dt: number): boolean;
} {
  return {
    feedMovement(dx: number, dy: number, dt: number): boolean {
      if (dt <= 0) return false;
      const speed = Math.sqrt(dx * dx + dy * dy) / dt;
      return speed < threshold;
    },
  };
}
