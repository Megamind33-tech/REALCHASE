# Demo Removal Audit — Outputs, Audio, Settings, Packs, Presenter Controls

## Outputs / Streaming
- **Real and wired:** none yet; no encoder, MediaMTX, RTMP, or output service is present.
- **Disabled because not wired yet:** destination management, stream destination status, GO LIVE, and any output monitor state.
- **Removed because fake/noisy:** fake ready/armed/connected language, fake bitrate/quality display, and any UI path that could imply destinations are healthy.
- **Remaining risk:** the Outputs module shell still exists as a navigation destination, but it is an empty future workspace.

## GO LIVE / REC
- **Real and wired:** neither GO LIVE nor REC has a runtime engine.
- **Disabled because not wired yet:** TopBar REC/GO LIVE remain disabled with engine-requirement labels.
- **Removed because fake/noisy:** reducer actions no longer create fake recording or streaming active state if accidentally dispatched.
- **Remaining risk:** recording and streaming require explicit engine work before any active indicator returns.

## Audio
- **Real and wired:** none; no Web Audio/native analysis is connected.
- **Disabled because not wired yet:** audio routing/metering is replaced with an honest empty state.
- **Removed because fake/noisy:** idle/fake mixer meters and mock channel routing controls were removed from the active output panel.
- **Remaining risk:** source audio extraction and metering need a real MediaStream/Web Audio implementation later.

## Source health
- **Real and wired:** source status is derived from source error state, reconnect state, and MediaStream video track `readyState`.
- **Disabled because not wired yet:** fake FPS/bitrate/signal/quality health remains absent.
- **Removed because fake/noisy:** generic green “LIVE” health now distinguishes `TRACK LIVE`, `NO LIVE TRACK`, and `NEEDS RECONNECT`.
- **Remaining risk:** decode/video-element readiness can be added once media-file/screen sources land.

## Camera/source thumbnails
- **Real and wired:** camera strip buttons switch 3D viewport cameras/viewpoints.
- **Disabled because not wired yet:** Add Viewpoint is disabled.
- **Removed because fake/noisy:** camera strip no longer uses source-like video icon language or fake live thumbnails; it labels items as viewpoints.
- **Remaining risk:** true multi-camera Program/Preview rendering is future work and must not reuse viewpoint UI as broadcast source UI.

## Pack loading
- **Real and wired:** user glTF/glb drag/drop import remains wired.
- **Disabled because not wired yet:** packaged studio pack buttons are disabled because no `public/scenes/<pack-id>/scene.babylon` files exist.
- **Removed because fake/noisy:** pack cards no longer pretend premium packs are immediately loadable.
- **Remaining risk:** re-enable pack loading only after adding real scene files and evidence proving successful load.

## Presenter controls
- **Real and wired:** presenter source placement and keying foundation from the previous patch remains available through source placement/keying state.
- **Disabled because not wired yet:** cosmetic presenter controls remain absent/not wired in the inspector.
- **Removed because fake/noisy:** no active skin smoothing, teeth whitening, or beauty filter controls are shown.
- **Remaining risk:** future presenter controls should focus on scale, aspect, depth/occlusion, lighting match, and key calibration before cosmetics.

## Settings
- **Real and wired:** compact mode, reduced motion, quality mode, viewport mode, camera choice, transform mode, and safe area have runtime effects.
- **Disabled because not wired yet:** autosave/backup and live chat now show honest disabled/future states instead of active-looking workflow controls.
- **Removed because fake/noisy:** fake autosave recency and clickable backup success state were removed from the status bar.
- **Remaining risk:** a real settings workspace should only expose persistent settings with visible runtime effects.

## Next safest cleanup patch
- Add a small automated Playwright visual smoke test around Builder/Switcher/Outputs placeholders and assert forbidden words like fake `LIVE`, `excellent`, `healthy`, `connected`, and random meter UI do not appear without real backing state.
