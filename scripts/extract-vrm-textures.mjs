#!/usr/bin/env node
/**
 * Extract textures from VRM (GLB) file and save them alongside the FBX.
 *
 * The FBX file references textures like "textures/_10.png" but the actual
 * texture data is only in the VRM file. This script extracts embedded
 * images from the VRM binary and writes them to the expected location.
 *
 * Usage:
 *   node scripts/extract-vrm-textures.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const VRM_PATH = resolve(PROJECT_ROOT, 'assets/models/Noah3.vrm');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'assets/models/textures');

function parseGLB(filePath) {
  const buffer = readFileSync(filePath);
  const header = {
    magic: buffer.readUInt32LE(0),
    version: buffer.readUInt32LE(4),
    length: buffer.readUInt32LE(8),
  };

  if (header.magic !== 0x46546C67) { // 'glTF'
    throw new Error(`Not a valid GLB file (magic: 0x${header.magic.toString(16)})`);
  }

  let offset = 12;
  const chunks = [];

  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const chunkData = buffer.subarray(offset + 8, offset + 8 + chunkLength);
    chunks.push({ type: chunkType, data: chunkData });
    offset += 8 + chunkLength;
  }

  return { header, chunks };
}

function extractTextures(glb) {
  // Find JSON chunk (type 0x4E4F534A = "JSON" in little-endian)
  const jsonChunk = glb.chunks.find(c => c.type === 0x4E4F534A);
  if (!jsonChunk) throw new Error('No JSON chunk found');

  const json = JSON.parse(jsonChunk.data.toString('utf-8'));

  // Find BIN chunk (type 0x004E4942 = "BIN" in little-endian)
  const binChunk = glb.chunks.find(c => c.type === 0x004E4942);
  if (!binChunk) throw new Error('No BIN chunk found');

  const binData = binChunk.data;

  const images = json.images || [];
  const bufferViews = json.bufferViews || [];
  const textures = json.textures || [];

  console.log(`Found ${images.length} images, ${textures.length} textures`);

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const extracted = [];

  for (const image of images) {
    let imageData;
    let mimeType = image.mimeType || 'image/png';
    let ext = mimeType.split('/')[1] || 'png';
    let name = image.name || `texture_${images.indexOf(image)}`;

    if (image.uri) {
      // Data URI or external URI
      if (image.uri.startsWith('data:')) {
        const matches = image.uri.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          ext = mimeType.split('/')[1] || 'png';
          imageData = Buffer.from(matches[2], 'base64');
        }
      }
    } else if (image.bufferView !== undefined) {
      // Referenced from buffer view
      const bv = bufferViews[image.bufferView];
      imageData = binData.subarray(bv.byteOffset, bv.byteOffset + bv.byteLength);
    }

    if (imageData) {
      const filename = `${name}.${ext}`;
      const outputPath = resolve(OUTPUT_DIR, filename);
      writeFileSync(outputPath, imageData);
      extracted.push(filename);
      console.log(`  ✓ ${filename} (${(imageData.length / 1024).toFixed(1)} KB)`);
    } else {
      console.warn(`  ✗ Could not extract image: ${name}`);
    }
  }

  return extracted;
}

// Also try to use the texture name mapping from the FBX
// The FBX references textures like "_10.png", "_11.png", etc.
// These might map to VRM texture names differently.
// Let's also save with numbered names as the FBX expects.

function saveWithFbxNames(json, outputDir) {
  const textures = json.textures || [];
  const images = json.images || [];

  textures.forEach((tex, idx) => {
    if (tex.source !== undefined) {
      const img = images[tex.source];
      if (img && img.name) {
        // FBX uses names like _10, _11, _12 etc.
        // Some VRM textures have names like "00_00_00_Face_00" etc.
        // We'll also save with index-based names
        console.log(`  Texture[${idx}] → image[${tex.source}] "${img.name}"`);
      }
    }
  });
}

try {
  console.log('Extracting VRM textures...');
  const glb = parseGLB(VRM_PATH);
  console.log(`GLB: version=${glb.header.version}, ${glb.chunks.length} chunks`);

  const jsonChunk = glb.chunks.find(c => c.type === 0x4E4F534A);
  const json = JSON.parse(jsonChunk.data.toString('utf-8'));

  console.log('\nTextures found in VRM:');
  saveWithFbxNames(json, OUTPUT_DIR);

  console.log('\nExtracting images...');
  const extracted = extractTextures(glb);

  console.log(`\nDone! ${extracted.length} textures extracted to ${OUTPUT_DIR}`);
} catch (err) {
  console.error('Failed:', err.message);
  process.exit(1);
}
