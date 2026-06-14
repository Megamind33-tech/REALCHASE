// Generates real, valid glTF 2.0 binaries (.glb) used as import fixtures for
// evidence. These are genuine 3D assets (distinct geometry + a PBR material),
// NOT demo assets bundled into the product. Run: node tools/make-test-glb.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

function writeGlb({ name, file, positions, indices, color }) {
  const posBytes = Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength);
  const idxBytes = Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength);
  const idxOffset = posBytes.length; // positions are 12-byte aligned
  let bin = Buffer.concat([posBytes, idxBytes]);
  while (bin.length % 4 !== 0) bin = Buffer.concat([bin, Buffer.from([0])]);

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let c = 0; c < 3; c += 1) {
      min[c] = Math.min(min[c], positions[i + c]);
      max[c] = Math.max(max[c], positions[i + c]);
    }
  }

  const gltf = {
    asset: { version: '2.0', generator: 'CHASE Studio Pro test fixture' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [{ name, primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{ name: `${name} mat`, pbrMetallicRoughness: { baseColorFactor: [...color, 1], metallicFactor: 0.1, roughnessFactor: 0.6 } }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes.length, target: 34962 },
      { buffer: 0, byteOffset: idxOffset, byteLength: idxBytes.length, target: 34963 },
    ],
    buffers: [{ byteLength: bin.length }],
  };

  let json = Buffer.from(JSON.stringify(gltf), 'utf8');
  while (json.length % 4 !== 0) json = Buffer.concat([json, Buffer.from(' ')]);
  const chunk = (type, data) => {
    const header = Buffer.alloc(8);
    header.writeUInt32LE(data.length, 0);
    header.writeUInt32LE(type, 4);
    return Buffer.concat([header, data]);
  };
  const jsonChunk = chunk(0x4e4f534a, json);
  const binChunk = chunk(0x004e4942, bin);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + jsonChunk.length + binChunk.length, 8);

  const out = Buffer.concat([header, jsonChunk, binChunk]);
  const dir = resolve('tests/fixtures');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, file), out);
  console.log(`wrote tests/fixtures/${file} (${out.length} bytes, ${positions.length / 3} verts, ${indices.length / 3} tris)`);
}

// Cube — 8 verts (kept identical to the PR #23 fixture).
const s = 0.75;
writeGlb({
  name: 'ChaseTestCube', file: 'chase-test-cube.glb', color: [0.18, 0.62, 0.92],
  positions: new Float32Array([-s, -s, -s, s, -s, -s, s, s, -s, -s, s, -s, -s, -s, s, s, -s, s, s, s, s, -s, s, s]),
  indices: new Uint16Array([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2, 3, 2, 6, 3, 6, 7, 0, 4, 5, 0, 5, 1]),
});

// Tetrahedron — 4 verts.
writeGlb({
  name: 'ChaseTestPyramid', file: 'chase-test-pyramid.glb', color: [0.95, 0.55, 0.2],
  positions: new Float32Array([0, 0.9, 0, -0.8, -0.5, 0.6, 0.8, -0.5, 0.6, 0, -0.5, -0.9]),
  indices: new Uint16Array([0, 1, 2, 0, 2, 3, 0, 3, 1, 1, 3, 2]),
});

// Octahedron — 6 verts.
const a = 0.8;
writeGlb({
  name: 'ChaseTestOcta', file: 'chase-test-octa.glb', color: [0.4, 0.85, 0.5],
  positions: new Float32Array([0, 0.9, 0, 0, -0.9, 0, a, 0, 0, 0, 0, a, -a, 0, 0, 0, 0, -a]),
  indices: new Uint16Array([0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 2, 1, 3, 2, 1, 4, 3, 1, 5, 4, 1, 2, 5]),
});
