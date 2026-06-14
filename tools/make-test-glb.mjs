// Generates a real, valid glTF 2.0 binary (.glb): an indexed cube with a PBR
// material. This is a genuine 3D asset used as the import fixture for evidence —
// it is NOT bundled into the product as a demo asset; it stands in for any GLB a
// user would drop in. Run: node tools/make-test-glb.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const s = 0.75; // half-extent
const positions = new Float32Array([
  -s, -s, -s, s, -s, -s, s, s, -s, -s, s, -s,
  -s, -s, s, s, -s, s, s, s, s, -s, s, s,
]);
const indices = new Uint16Array([
  0, 1, 2, 0, 2, 3, // -z
  4, 6, 5, 4, 7, 6, // +z
  0, 3, 7, 0, 7, 4, // -x
  1, 5, 6, 1, 6, 2, // +x
  3, 2, 6, 3, 6, 7, // +y
  0, 4, 5, 0, 5, 1, // -y
]);

const posBytes = Buffer.from(positions.buffer);
const idxBytes = Buffer.from(indices.buffer);
const idxOffset = posBytes.length; // 96, already 4-byte aligned
let bin = Buffer.concat([posBytes, idxBytes]);
while (bin.length % 4 !== 0) bin = Buffer.concat([bin, Buffer.from([0])]);

const min = [-s, -s, -s];
const max = [s, s, s];
const gltf = {
  asset: { version: '2.0', generator: 'CHASE Studio Pro test fixture' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'ChaseTestCube' }],
  meshes: [{ name: 'ChaseTestCube', primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
  materials: [{ name: 'CHASE Cyan', pbrMetallicRoughness: { baseColorFactor: [0.18, 0.62, 0.92, 1], metallicFactor: 0.1, roughnessFactor: 0.6 } }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 8, type: 'VEC3', min, max },
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

function chunk(type, data) {
  const header = Buffer.alloc(8);
  header.writeUInt32LE(data.length, 0);
  header.writeUInt32LE(type, 4);
  return Buffer.concat([header, data]);
}
const jsonChunk = chunk(0x4e4f534a, json); // "JSON"
const binChunk = chunk(0x004e4942, bin);   // "BIN\0"
const total = 12 + jsonChunk.length + binChunk.length;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); // "glTF"
header.writeUInt32LE(2, 4);
header.writeUInt32LE(total, 8);

const out = Buffer.concat([header, jsonChunk, binChunk]);
const dir = resolve('tests/fixtures');
mkdirSync(dir, { recursive: true });
const path = resolve(dir, 'chase-test-cube.glb');
writeFileSync(path, out);
console.log(`wrote ${path} (${out.length} bytes, ${indices.length / 3} triangles)`);
