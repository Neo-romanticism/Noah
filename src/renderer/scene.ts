import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
// scene.background = null; // Removed — renderer.setClearColor handles transparency

// Camera setup (positioned to see room interior)
const camera = new THREE.PerspectiveCamera(
  50, // FOV: 50 degrees
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1, // Near plane
  1000 // Far plane
);
camera.position.set(0, 2, 6); // Positioned slightly elevated, looking in
camera.lookAt(0, 1, 0); // Looking at a point slightly above the floor center

// Renderer setup
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  // NOTE: premultipliedAlpha MUST be false (default) for Electron transparency.
  // With premultipliedAlpha=true, color values are multiplied by alpha before
  // compositing. When the Chromium compositor expects straight (un-premultiplied)
  // alpha, the result appears fully transparent — matching the observed bug
  // where the window is invisible despite correct rendering.
  premultipliedAlpha: false,
  preserveDrawingBuffer: true, // 스크린샷/픽셀 읽기용
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0); // Fully transparent clear

// WebGL context loss handling
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  console.error('WebGL context lost!', event);
  event.preventDefault();
});

renderer.domElement.addEventListener('webglcontextrestored', () => {
  console.log('WebGL context restored');
});

// Resize handler
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

export { scene, camera, renderer, onWindowResize };