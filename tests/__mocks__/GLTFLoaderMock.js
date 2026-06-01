/**
 * Mock for three/examples/jsm/loaders/GLTFLoader.js
 * Jest cannot parse ES module syntax from Three.js examples, so we provide
 * a CommonJS mock that returns a minimal GLTFLoader implementation.
 */

const { Group } = require('three');

class GLTFLoader {
  constructor() {
    this.plugins = [];
  }

  register(plugin) {
    this.plugins.push(plugin);
  }

  async loadAsync(path) {
    return {
      scene: new Group(),
      animations: [],
      userData: { vrm: null },
    };
  }

  load(path, onLoad, onProgress, onError) {
    onLoad({ scene: new Group(), animations: [], userData: { vrm: null } });
  }

  parse(data, path, onLoad, onError) {
    onLoad({ scene: new Group(), animations: [], userData: { vrm: null } });
  }

  parseAsync(data, path) {
    return Promise.resolve({
      scene: new Group(),
      animations: [],
      userData: { vrm: null },
    });
  }
}

module.exports = { GLTFLoader };