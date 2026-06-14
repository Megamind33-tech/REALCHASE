# Camera Tracking Foundation

Adds the integration point for real camera tracking (FreeD / mo-sys / NDI) and a
clearly-labelled test signal to verify the keyed source stays locked in the set
as the virtual camera moves.

## Real behaviour
- **Pose API** (`StudioEngine.applyCameraPose(position, target, fov)`): drives a
  dedicated tracked `FreeCamera`. This is the per-frame hook external tracking
  data calls — the deliverable foundation.
- **Tracking toggle** (`setCameraTracking`, Crosshair button in the viewport
  toolbar): switches to the tracked camera. With no tracking hardware attached it
  feeds a **synthetic test signal** (a gentle jib/handheld move) — explicitly a
  stand-in (like the fake webcam device), labelled "test signal" in the UI tooltip.
  Real tracking data replaces it via `applyCameraPose`.
- Selecting a studio camera or disabling tracking restores the ArcRotate camera;
  the tracking observer is removed (no leak) on disable, camera-select, and dispose.
- Because the source is a real world-anchored scene mesh, the set + keyed source +
  light-wrap (active-camera backdrop) + occlusion all stay consistent under the
  tracked move.

## Evidence
| File | Proves |
|------|--------|
| `01-before-tracking.png` | Default studio camera with the live source in the set. |
| `02-tracking-pose-a.png` / `03` / `04-tracking-pose-c.png` | Tracked camera at successive poses — the framing clearly changes (camera moves) while the live source stays **world-locked** in the set (integrated, not screen-locked). |
| `05-tracking-off-restored.png` | Disabling tracking restores the studio camera. |
| `tracking.txt` | Notes + clean console. |

## Performance
The tracked move keeps full frame rate (markInteraction each tracked frame);
no extra render passes; FPS held (~11 CI software-WebGL). No `setInterval`.

## Gates
`tsc -b` ✅ · `vite build` ✅ · `node tests/anti-demo-smoke.mjs` ✅ · leak scan clean
(onBeforeRender observer removed on disable/camera-select/dispose).

## Next toward full tracking
- Wire a real FreeD/mo-sys/NDI receiver to `applyCameraPose` (network input).
- Lens distortion + nodal-offset calibration; tracking latency compensation.
- Per-camera tracking profiles persisted in the project file.
