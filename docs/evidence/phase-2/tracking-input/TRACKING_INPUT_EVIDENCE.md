# Real External Camera-Tracking Input (WebSocket)

Wires a **real network tracking receiver** into the camera-pose API, so live
tracking hardware can drive the virtual camera. This closes the loop from the
"test signal" to real external data.

## How it works
- `StudioEngine.connectTrackingSource(url)` opens a **WebSocket** to a tracking
  source. Each JSON message `{ position:[x,y,z], target:[x,y,z], fov?|focalLength? }`
  is parsed and fed to `applyCameraPose` (smoothing + lens match still apply).
  This is the production hook — a FreeD/mo-sys/NDI bridge forwards poses here.
- `disconnectTrackingSource()` closes the socket and restores the studio camera.
  The socket is also closed on studio-camera select and on engine dispose
  (no leak). Status events drive the UI ("Connect tracking" → "● Tracking live").
- UI: a tracking-source URL field + Connect button + live status in the viewport
  toolbar.

## End-to-end proof (real socket, real network)
The capture runs an actual local **WebSocket server** (`ws`) that emits camera
poses; the app connects to it over the network and the camera follows.

`tracking-input.txt`:
- `client connected to server: true`
- `pose messages sent over the socket: 188`
- `button label after connect: ● Tracking live`

| File | Proves |
|------|--------|
| `01-before-connect.png` | Studio camera before connecting. |
| `02-external-pose-a.png` | Camera at **externally-commanded pose A** (high-left overhead) — driven by the WebSocket data, not the internal test signal. |
| `03-external-pose-b.png` | The external source commands **pose B** (low-right close-up) → the camera moves there. Distinct framing = real network input drives the camera. |
| `04-after-disconnect.png` | Disconnect restores the studio camera. |

The live source stays world-locked in the set across the externally-tracked move.

## Gates
`tsc -b` ✅ · `vite build` ✅ · `node tests/anti-demo-smoke.mjs` ✅ · leak scan clean
(socket closed on disconnect / camera-select / dispose). `ws` added as a
dev/evidence dependency for the test tracking server.

## Next
- FreeD (UDP) → JSON-over-WS bridge; nodal-offset + lens-distortion calibration;
  timestamp/latency alignment between tracking and video.
