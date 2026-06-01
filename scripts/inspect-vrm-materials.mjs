#!/usr/bin/env node
/**
 * Inspect VRM material definitions to understand texture-to-material mapping.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const VRM_PATH = resolve(PROJECT_ROOT, 'assets/models/Noah3.vrm');

const buffer = readFileSync(VRM_PATH);
const header = { magic: buffer.readUInt32LE(0), version: buffer.readUInt32LE(4), length: buffer.readUInt32LE(8) };
if (header.magic !== 0x46546C67) throw new Error('Not GLB');

let offset = 12;
const chunks = [];
while (offset < buffer.length) {
  const len = buffer.readUInt32LE(offset);
  const type = buffer.readUInt32LE(offset + 4);
  chunks.push({ type, data: buffer.subarray(offset + 8, offset + 8 + len) });
  offset += 8 + len;
}

const jsonChunk = chunks.find(c => c.type === 0x4E4F534A);
const json = JSON.parse(jsonChunk.data.toString('utf-8'));

console.log('=== MATERIALS ===');
json.materials.forEach((mat, i) => {
  console.log(`\nMaterial[${i}]: "${mat.name || 'unnamed'}"`);
  if (mat.pbrMetallicRoughness) {
    const pbr = mat.pbrMetallicRoughness;
    if (pbr.baseColorTexture) {
      console.log(`  baseColorTexture: index=${pbr.baseColorTexture.index} texCoord=${pbr.baseColorTexture.texCoord}`);
    }
    if (pbr.metallicRoughnessTexture) {
      console.log(`  metallicRoughnessTexture: index=${pbr.metallicRoughnessTexture.index}`);
    }
  }
  if (mat.normalTexture) {
    console.log(`  normalTexture: index=${mat.normalTexture.index}`);
  }
  if (mat.emissiveTexture) {
    console.log(`  emissiveTexture: index=${mat.emissiveTexture.index}`);
  }
  if (mat.occlusionTexture) {
    console.log(`  occlusionTexture: index=${mat.occlusionTexture.index}`);
  }
});

console.log('\n=== TEXTURES ===');
json.textures.forEach((tex, i) => {
  console.log(`Texture[${i}]: source=${tex.source} sampler=${tex.sampler}`);
});

console.log('\n=== IMAGES ===');
json.images.forEach((img, i) => {
  console.log(`Image[${i}]: name="${img.name}" mimeType=${img.mimeType} bufferView=${img.bufferView}`);
});

console.log('\n=== MESHES ===');
json.meshes.forEach((mesh, i) => {
  console.log(`\nMesh[${i}]: "${mesh.name}"`);
  mesh.primitives.forEach((prim, j) => {
    const matName = prim.material !== undefined ? json.materials[prim.material].name : 'NONE';
    console.log(`  Primitive[${j}]: material="${matName}" (index ${prim.material})`);
  });
});

console.log('\n=== VRM EXTENSION (material properties) ===');
if (json.extensions && json.extensions.VRM) {
  const vrmMat = json.extensions.VRM.materialProperties || [];
  vrmMat.forEach((mat, i) => {
    console.log(`\nVRM Mat[${i}]: "${mat.name}" (shader: ${mat.shader})`);
    if (mat.textureProperties) {
      Object.entries(mat.textureProperties).forEach(([key, val]) => {
        console.log(`  ${key}: textureIndex=${val}`);
      });
    }
    if (mat.keywordMap) {
      Object.entries(mat.keywordMap).forEach(([key, val]) => {
        console.log(`  keyword: ${key}=${val}`);
      });
    }
  });
}

console.log('\n=== NODES (to find mesh→node mapping) ===');
json.nodes.forEach((node, i) => {
  const meshName = node.mesh !== undefined ? json.meshes[node.mesh].name : 'NONE';
  console.log(`Node[${i}]: "${node.name}" mesh=${node.mesh} (${meshName})`);
});
