import * as THREE from 'three';

export function createDragTracker(): {
  start(target: THREE.Object3D, x: number, y: number): void;
  update(x: number, y: number): THREE.Vector2;
  end(): { velocity: THREE.Vector2 };
} {
  let target: THREE.Object3D | null = null;
  let prevX = 0;
  let prevY = 0;
  let prevTime = 0;
  const velocity = new THREE.Vector2();

  return {
    start(t: THREE.Object3D, x: number, y: number) {
      target = t;
      prevX = x;
      prevY = y;
      prevTime = performance.now();
      velocity.set(0, 0);
    },
    update(x: number, y: number): THREE.Vector2 {
      if (!target) return velocity;
      const now = performance.now();
      const dt = (now - prevTime) / 1000;
      if (dt > 0) {
        velocity.x = (x - prevX) / dt;
        velocity.y = (y - prevY) / dt;
      }
      prevX = x;
      prevY = y;
      prevTime = now;
      return velocity;
    },
    end(): { velocity: THREE.Vector2 } {
      const result = { velocity: velocity.clone() };
      target = null;
      velocity.set(0, 0);
      return result;
    },
  };
}
