/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';

describe('Noah FBX Pipeline Test', () => {
  it('should load noah.fbx and verify structure', async () => {
    // Dynamic import to avoid jest transform issues with ESM
    const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
    const loader = new FBXLoader();
    const object = await loader.loadAsync('./assets/models/noah.fbx');

    expect(object).toBeDefined();
    expect(object.type).toBe('Group');

    // Traverse and collect stats
    const stats = {
      meshes: 0,
      skinnedMeshes: 0,
      bones: 0,
      armatures: 0,
      materials: new Set<string>(),
      morphTargets: 0,
    };

    const boneNames: string[] = [];
    const meshNames: string[] = [];

    object.traverse((child) => {
      const c = child as THREE.Object3D;
      if ((c as THREE.SkinnedMesh).isSkinnedMesh) {
        stats.skinnedMeshes++;
        meshNames.push(c.name);
        const sm = c as THREE.SkinnedMesh;
        if (sm.morphTargetDictionary) {
          stats.morphTargets += Object.keys(sm.morphTargetDictionary).length;
        }
        if (sm.material) {
          const mat = Array.isArray(sm.material) ? sm.material[0] : sm.material;
          stats.materials.add(mat.name || 'unnamed');
        }
      } else if ((c as THREE.Mesh).isMesh) {
        stats.meshes++;
        meshNames.push(c.name);
      }
      if ((c as THREE.Bone).isBone) {
        stats.bones++;
        boneNames.push(c.name);
      }
      if (c.type === 'Group' && c.children.some(ch => (ch as THREE.Bone).isBone)) {
        stats.armatures++;
      }
    });

    console.log('=== Noah FBX Structure ===');
    console.log('Root type:', object.type);
    console.log('Skinned meshes:', stats.skinnedMeshes, meshNames);
    console.log('Static meshes:', stats.meshes);
    console.log('Bones:', stats.bones);
    console.log('Armatures:', stats.armatures);
    console.log('Materials:', Array.from(stats.materials));
    console.log('Morph targets:', stats.morphTargets);
    console.log('Animations:', object.animations.length);
    console.log('Bone names (first 20):', boneNames.slice(0, 20));

    // Validation
    expect(stats.skinnedMeshes + stats.meshes).toBeGreaterThan(0);
    expect(stats.bones).toBeGreaterThan(0);

    // Check critical bones exist
    const criticalBones = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Head', 'LeftArm', 'RightArm'];
    for (const boneName of criticalBones) {
      expect(boneNames).toContain(boneName);
    }

    // Check scale is reasonable (should be ~1.5m tall)
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    console.log('Bounding box size:', size.x.toFixed(3), size.y.toFixed(3), size.z.toFixed(3));
    expect(size.y).toBeGreaterThan(1.0);
    expect(size.y).toBeLessThan(3.0);

  }, 30000);
});
