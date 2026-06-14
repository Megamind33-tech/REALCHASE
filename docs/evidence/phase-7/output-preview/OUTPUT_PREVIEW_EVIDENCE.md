# Milestone 7 Output Preview Evidence

Captured on June 14, 2026 from `chase/fork-audit`.

## Verified

- The Outputs panel displays the real Babylon canvas composite through `captureStream()`.
- A real image source was routed through Preview, CUT to Program, and shown in the composite preview.
- WebM remains the default recording format.
- This Chromium runtime reports native H.264/MP4 MediaRecorder support and produced `recorded-output.mp4`.
- The MP4 was non-empty and was decoded by Chromium in the automated smoke run.
- ProRes remains disabled and is labelled as requiring a native ffmpeg bridge.
- Recording telemetry reports duration, emitted bytes, bitrate, and the negotiated MIME type.

## Artifacts

- `01-composite-preview.png`: live composite preview in the right Outputs panel.
- `recorded-output.mp4`: native H.264/MP4 recording captured from the composited Program canvas.

## Checks

- `tsc -b --pretty false`: pass.
- `tests/anti-demo-smoke.mjs`: pass.
- `tests/output-preview-smoke.mjs`: passed the composite preview and native MP4 capture flow during development; the final script also contains WebM live-telemetry and playback gates.
- `ffprobe`: unavailable on this workstation, so Chromium playback is used as the independent decode check.

## Remaining

- ProRes needs a native Tauri/ffmpeg recording bridge.
- Production `vite build` still exceeds the local time bound on this OneDrive workstation.
