import * as THREE from 'three';
import type { SceneContext } from '../scene/index.js';
import { createBed } from './bed.js';
import { createDesk } from './desk.js';
import { createFloor } from './floor.js';
import { createWalls } from './walls.js';
import { createWindow } from './window.js';

export interface RoomObjects {
  bed: THREE.Group;
  desk: THREE.Group;
  floor: THREE.Mesh;
  walls: THREE.Group;
  window: THREE.Group;
  windowLight: THREE.Mesh; // the sky/weather visible through window
}

export function buildRoom(ctx: SceneContext): RoomObjects {
  const floor = createFloor();
  floor.position.set(0, -0.5, 0);
  ctx.scene.add(floor);

  const walls = createWalls();
  walls.position.set(0, 0, -1.5);
  ctx.scene.add(walls);

  const bed = createBed();
  bed.position.set(-1.2, -0.5, -0.5);
  ctx.scene.add(bed);

  const desk = createDesk();
  desk.position.set(1.0, -0.5, -0.3);
  ctx.scene.add(desk);

  const windowGroup = createWindow();
  windowGroup.position.set(0, 0.8, -1.45);
  ctx.scene.add(windowGroup);

  // The "sky" plane behind the window frame — this changes color with weather
  const skyGeo = new THREE.PlaneGeometry(1.6, 1.2);
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb });
  const skyPlane = new THREE.Mesh(skyGeo, skyMat);
  skyPlane.position.set(0, 0, -0.06); // slightly behind window frame
  windowGroup.add(skyPlane);

  return {
    bed,
    desk,
    floor,
    walls,
    window: windowGroup,
    windowLight: skyPlane,
  };
}
