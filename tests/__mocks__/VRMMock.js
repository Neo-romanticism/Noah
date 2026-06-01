/**
 * Mock for @pixiv/three-vrm
 * Provides a minimal VRMLoaderPlugin implementation for Jest tests.
 */

class VRMLoaderPlugin {
  constructor(parser) {
    this.parser = parser;
  }
}

module.exports = { VRMLoaderPlugin };