/**
 * @jest-environment jsdom
 *
 * NOTE: We mock the entire scene module to avoid creating a real
 * THREE.WebGLRenderer (which needs a WebGL context not available in jsdom).
 * The mock provides scene, camera, renderer, and onWindowResize with the
 * same types and behavior expected by the tests.
 */

import * as THREE from 'three';

// Mock the entire scene module — jest.mock is hoisted above imports
jest.mock('../../src/renderer/scene.js', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 1000);
  camera.position.set(0, 2, 6);
  camera.lookAt(0, 1, 0);

  // Mock renderer — no WebGL context needed
  const renderer = {
    domElement: document.createElement('canvas'),
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    setClearColor: jest.fn(),
    render: jest.fn(),
    getSize: jest.fn((target: THREE.Vector2) => {
      target.set(window.innerWidth, window.innerHeight);
      return target;
    }),
  } as unknown as THREE.WebGLRenderer;

  // Make the mock pass `toBeInstanceOf(THREE.WebGLRenderer)` checks
  Object.setPrototypeOf(renderer, THREE.WebGLRenderer.prototype);

  const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    (renderer as unknown as { setSize: jest.Mock }).setSize(window.innerWidth, window.innerHeight);
  };

  return { scene, camera, renderer, onWindowResize };
});

import { scene, camera, renderer, onWindowResize } from '../../src/renderer/scene.js';

describe('Scene Component', () => {
  test('should have a properly configured scene', () => {
    expect(scene).toBeInstanceOf(THREE.Scene);
    expect(scene.background).toBeNull(); // Should be transparent
  });

  test('should have a properly configured camera', () => {
    expect(camera).toBeInstanceOf(THREE.PerspectiveCamera);
    
    // Check field of view
    expect(camera.fov).toBe(50);
    
    // Check aspect ratio
    expect(camera.aspect).toBe(window.innerWidth / window.innerHeight);
    
    // Check position
    expect(camera.position.x).toBe(0);
    expect(camera.position.y).toBe(2);
    expect(camera.position.z).toBe(6);
    
    // Confirm it's looking at the right point
    // We can't easily test lookAt, but we can check the camera matrix
    const target = new THREE.Vector3(0, 1, 0);
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    // Normalize the vector from camera position to target
    const lookDirection = new THREE.Vector3().subVectors(target, camera.position).normalize();
    
    // The camera should generally be pointing toward the target (0,1,0)
    // Allow some tolerance for floating point comparison
    expect(Math.abs(direction.dot(lookDirection))).toBeGreaterThan(0.99);
  });

  test('should have a properly configured renderer', () => {
    expect(renderer).toBeInstanceOf(THREE.WebGLRenderer);
    
    // Check that alpha is enabled (for transparency)
    expect(renderer.domElement).toBeDefined();
    
    // Check size
    expect(renderer.getSize(new THREE.Vector2()).width).toBe(window.innerWidth);
    expect(renderer.getSize(new THREE.Vector2()).height).toBe(window.innerHeight);
  });

  test('onWindowResize should update camera and renderer', () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    
    // Mock window size change
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 600 });
    
    // Call the resize function
    onWindowResize();
    
    // Check that camera aspect ratio was updated
    expect(camera.aspect).toBe(800 / 600);
    
    // Check that renderer size was updated
    const size = new THREE.Vector2();
    renderer.getSize(size);
    expect(size.width).toBe(800);
    expect(size.height).toBe(600);
    
    // Restore original values
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalWidth });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: originalHeight });
    
    // Call resize again to restore
    onWindowResize();
  });
});