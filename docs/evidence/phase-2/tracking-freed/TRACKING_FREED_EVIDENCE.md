# Camera Tracking — FreeD Protocol Support

Adds the industry-standard **FreeD** camera-tracking protocol to the receiver, so
real broadcast tracking systems (Vinten / Mo-Sys / stYpe / NCam bridges) can drive
the virtual camera.

## How it works
- `src/engine/freed.ts` — pure decoder for the FreeD **D1** 29-byte binary packet
  (pan/tilt/roll in 1/32768°, X/Y/Z in 1/64 mm, zoom/focus encoders, checksum).
- The WebSocket receiver sets `binaryType = 'arraybuffer'`: **binary** frames are
  decoded as FreeD (`decodeFreeD` → `applyFreeDPose`), **text** frames stay JSON.
  FreeD is UDP, so a small UDP→WebSocket bridge forwards the raw packets.
- `applyFreeDPose` maps the pose into the virtual camera with **calibration**
  (`setTrackingCalibration`: position scale/offset, zoom→focal range), pointing
  the camera from pan/tilt and setting FOV from zoom.

## Evidence
### Decoder unit test (rigorous) — `npm run test:freed`
A constructed D1 packet `{pan:45°, tilt:-10°, x:1.5m, y:2m, z:-5m, zoom:0x800000}`
decodes **exactly** to those values; checksum validated; non-D1 and bad-checksum
packets rejected. (Tests the real `freed.ts` via Node `--experimental-strip-types`.)

### End-to-end — `freed-e2e.txt` + screenshots
A local WebSocket server sends **real FreeD binary packets**; the app connected
and received **180 binary frames**, decoded them, and moved the camera:
| File | Proves |
|------|--------|
| `01-freed-pose-a.png` | FreeD pose A (pos `[-5, 5.5, -6]`, low zoom → wide) — high-left overhead. |
| `02-freed-pose-b.png` | FreeD pose B (pos `[5, 1.1, -4.5]`, high zoom → tele) — low-right close-up. |

Distinct framings + correct zoom→focal = real binary FreeD drives the camera.

## Gates
`tsc -b` ✅ · `vite build` ✅ · `node tests/anti-demo-smoke.mjs` ✅ ·
`npm run test:freed` ✅ · leak scan clean.

## Next
- Bundle a reference FreeD-UDP→WS bridge; per-lens zoom/focus calibration curves;
  nodal-offset + lens-distortion; tracking↔video latency alignment.
