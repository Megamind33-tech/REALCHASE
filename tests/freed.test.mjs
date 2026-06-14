import assert from 'node:assert';
import { decodeFreeD, freeDChecksumOk } from '../src/engine/freed.ts';

const enc24 = (v) => { v &= 0xFFFFFF; return [(v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF]; };
function buildD1({ cam = 1, pan = 0, tilt = 0, roll = 0, x = 0, y = 0, z = 0, zoom = 0, focus = 0 }) {
  const b = new Uint8Array(29); b[0] = 0xD1; b[1] = cam;
  const put = (o, a) => { b[o] = a[0]; b[o + 1] = a[1]; b[o + 2] = a[2]; };
  put(2, enc24(Math.round(pan * 32768))); put(5, enc24(Math.round(tilt * 32768))); put(8, enc24(Math.round(roll * 32768)));
  put(11, enc24(Math.round(x * 1000 * 64))); put(14, enc24(Math.round(y * 1000 * 64))); put(17, enc24(Math.round(z * 1000 * 64)));
  put(20, enc24(zoom)); put(23, enc24(focus));
  let sum = 0; for (let i = 0; i < 28; i++) sum += b[i]; b[28] = (0x40 - sum) & 0xFF;
  return b;
}
const pkt = buildD1({ cam: 3, pan: 45, tilt: -10, x: 1.5, y: 2.0, z: -5.0, zoom: 0x800000 });
assert.ok(freeDChecksumOk(pkt), 'checksum valid');
const d = decodeFreeD(pkt);
assert.equal(d.cameraId, 3);
assert.ok(Math.abs(d.pan - 45) < 0.001, `pan ${d.pan}`);
assert.ok(Math.abs(d.tilt + 10) < 0.001, `tilt ${d.tilt}`);
assert.ok(Math.abs(d.x - 1.5) < 0.001, `x ${d.x}`);
assert.ok(Math.abs(d.y - 2.0) < 0.001, `y ${d.y}`);
assert.ok(Math.abs(d.z + 5.0) < 0.001, `z ${d.z}`);
assert.equal(d.zoom, 0x800000);
assert.equal(decodeFreeD(new Uint8Array([0, 1, 2])), null, 'non-D1 rejected');
const bad = buildD1({ x: 1 }); bad[28] ^= 0xFF; assert.equal(freeDChecksumOk(bad), false, 'bad checksum rejected');
console.log('FreeD decode test PASSED:', JSON.stringify(d));
