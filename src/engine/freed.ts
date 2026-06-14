/**
 * FreeD camera-tracking protocol (type D1) decoder.
 *
 * FreeD is the de-facto standard for broadcast camera tracking (Vinten/Mo-Sys/
 * stYpe/etc.). It is a binary UDP protocol; in a browser app a small UDP→
 * WebSocket bridge forwards the raw 29-byte D1 packets, which we decode here.
 *
 * D1 packet layout (29 bytes, big-endian 24-bit fields):
 *   [0]      0xD1 message id
 *   [1]      camera id
 *   [2..4]   pan   (signed, value / 32768 = degrees)
 *   [5..7]   tilt  (signed, / 32768 deg)
 *   [8..10]  roll  (signed, / 32768 deg)
 *   [11..13] pos X (signed, / 64 = mm)
 *   [14..16] pos Y (signed, / 64 mm)
 *   [17..19] pos Z (signed, / 64 mm)
 *   [20..22] zoom  (unsigned encoder)
 *   [23..25] focus (unsigned encoder)
 *   [26..27] spare
 *   [28]     checksum: (0x40 - sum(bytes 0..27)) & 0xFF
 */
export interface FreeDPose {
  cameraId: number;
  /** degrees */
  pan: number;
  tilt: number;
  roll: number;
  /** metres */
  x: number;
  y: number;
  z: number;
  /** raw 24-bit encoder counts */
  zoom: number;
  focus: number;
}

function read24(b: Uint8Array, o: number, signed: boolean): number {
  let v = (b[o] << 16) | (b[o + 1] << 8) | b[o + 2];
  if (signed && (v & 0x800000)) v -= 0x1000000;
  return v;
}

/** True when the 29-byte FreeD checksum is valid. */
export function freeDChecksumOk(b: Uint8Array): boolean {
  if (b.length < 29) return false;
  let sum = 0;
  for (let i = 0; i < 28; i += 1) sum += b[i];
  return ((0x40 - sum) & 0xff) === b[28];
}

/** Decode a FreeD D1 packet, or null if it isn't one. */
export function decodeFreeD(b: Uint8Array): FreeDPose | null {
  if (b.length < 29 || b[0] !== 0xd1) return null;
  return {
    cameraId: b[1],
    pan: read24(b, 2, true) / 32768,
    tilt: read24(b, 5, true) / 32768,
    roll: read24(b, 8, true) / 32768,
    x: read24(b, 11, true) / 64 / 1000,
    y: read24(b, 14, true) / 64 / 1000,
    z: read24(b, 17, true) / 64 / 1000,
    zoom: read24(b, 20, false),
    focus: read24(b, 23, false),
  };
}
