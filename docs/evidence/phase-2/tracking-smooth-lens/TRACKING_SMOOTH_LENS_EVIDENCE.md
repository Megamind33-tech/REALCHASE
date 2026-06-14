# Camera Tracking — Pose Smoothing + Lens Match

Two refinements on the tracking foundation, both real and measured.

## Lens match (FOV from focal length)
- The tracked virtual camera's FOV now follows the **focal-length** control
  (`focalLengthToFov(deskProps.focalLength)`) so the virtual lens matches the
  real lens. Changing focal length live-updates the tracked camera each frame.
- Evidence: `01-lens-wide-24mm.png` (wide, set small/distant) vs
  `02-lens-tele-85mm.png` (telephoto, set fills the frame) — clear FOV/zoom change
  while tracking.

## Pose smoothing (jitter rejection)
- `applyCameraPose` now low-passes the incoming pose
  (`lerp(current → target, 1 - smoothing)`) so noisy tracking data (real
  FreeD/mo-sys is jittery) doesn't shake the shot. `setTrackingSmoothing(0..0.97)`
  + a "Smooth" slider in the viewport toolbar (shown while tracking).
- The synthetic test signal now includes per-frame noise (like real tracking
  data) so smoothing has something to reject.
- **Measured** (`tracking2.txt`): mean per-pixel change between consecutive
  viewport frames — **smoothing 0 → 11.01**, **smoothing 0.95 → 6.69**
  (~40% less frame-to-frame motion). The low-pass demonstrably rejects the jitter.
  `03-smoothing-off.png` / `04-smoothing-high.png` are sample frames.

## Other
- The shared `Slider` now sets `aria-label` (accessibility + makes the
  focal-length control addressable for this test).

## Gates
`tsc -b` ✅ · `vite build` ✅ · `node tests/anti-demo-smoke.mjs` ✅ · leak scan clean.
No extra render passes; FPS held. `pngjs` added as a dev/evidence dependency for
the pixel-difference measurement.

## Next toward full tracking
- Real network receiver (FreeD/JSON-over-WebSocket) → `applyCameraPose`.
- Lens distortion + nodal-offset calibration; latency compensation.
