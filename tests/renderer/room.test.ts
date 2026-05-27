import * as THREE from 'three';
import { room, floor, backWall, leftWall, rightWall } from '../../src/renderer/room.js';

describe('Room Component', () => {
  test('should create room with floor and 3 walls', () => {
    expect(room).toBeInstanceOf(THREE.Group);
    expect(room.children).toHaveLength(4); // floor + back wall + left wall + right wall
  });

  test('should have a floor plane', () => {
    expect(floor).toBeInstanceOf(THREE.Mesh);
    expect(floor.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    
    // Check position
    expect(floor.position.y).toBe(0); // Floor should be at y=0
    
    // Check rotation - floor should be rotated to be horizontal (facing up)
    expect(floor.rotation.x).toBe(-Math.PI / 2);
  });

  test('should have a back wall', () => {
    expect(backWall).toBeInstanceOf(THREE.Mesh);
    expect(backWall.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    
    // Check position - back wall should be at z = -FLOOR_SIZE/2
    expect(backWall.position.z).toBeCloseTo(-5); // With FLOOR_SIZE = 10, this puts it at -5
    expect(backWall.position.y).toBeCloseTo(2); // Half of WALL_HEIGHT (4/2 = 2)
  });

  test('should have a left wall', () => {
    expect(leftWall).toBeInstanceOf(THREE.Mesh);
    expect(leftWall.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    
    // Check position - left wall should be at x = -5
    expect(leftWall.position.x).toBeCloseTo(-5);
    expect(leftWall.position.y).toBeCloseTo(2); // Half of WALL_HEIGHT (4/2 = 2)
    
    // Check rotation - left wall should be rotated to face inward
    expect(leftWall.rotation.y).toBe(Math.PI / 2);
  });

  test('should have a right wall', () => {
    expect(rightWall).toBeInstanceOf(THREE.Mesh);
    expect(rightWall.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    
    // Check position - right wall should be at x = +5
    expect(rightWall.position.x).toBeCloseTo(5);
    expect(rightWall.position.y).toBeCloseTo(2); // Half of WALL_HEIGHT (4/2 = 2)
    
    // Check rotation - right wall should be rotated to face inward
    expect(rightWall.rotation.y).toBe(-Math.PI / 2);
  });
  
  test('floor should have warm gray color (#8B7D6B)', () => {
    const expectedColor = new THREE.Color(0x8B7D6B);
    // Extract material color
    const material = floor.material as THREE.MeshStandardMaterial;
    expect(material.color).toEqual(expectedColor);
  });
  
  test('walls should have light gray color (#C0C0C0)', () => {
    const expectedColor = new THREE.Color(0xC0C0C0);
    
    // Test back wall
    const backWallMaterial = backWall.material as THREE.MeshStandardMaterial;
    expect(backWallMaterial.color).toEqual(expectedColor);
    
    // Test left wall
    const leftWallMaterial = leftWall.material as THREE.MeshStandardMaterial;
    expect(leftWallMaterial.color).toEqual(expectedColor);
    
    // Test right wall
    const rightWallMaterial = rightWall.material as THREE.MeshStandardMaterial;
    expect(rightWallMaterial.color).toEqual(expectedColor);
  });
});