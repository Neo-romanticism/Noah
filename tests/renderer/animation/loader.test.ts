/**
 * @jest-environment jsdom
 */

import { loadAnimationManifest, loadAnimationClips } from '../../../src/renderer/animation/loader.js';

describe('Animation Loader', () => {
  describe('loadAnimationManifest', () => {
    test('rejects with error for non-existent manifest', async () => {
      await expect(
        loadAnimationManifest('file:///nonexistent/manifest.json'),
      ).rejects.toThrow();
    });
  });

  describe('loadAnimationClips', () => {
    test('returns empty array for empty manifest', async () => {
      const result = await loadAnimationClips({}, '/base/path');
      expect(result).toEqual([]);
    });

    test('logs warning for missing animation files but does not throw', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const manifest = {
        idle: { file: 'nonexistent.glb', loop: true, priority: 0, blendIn: 0.3 },
      };

      const result = await loadAnimationClips(manifest, '/base/path');
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
