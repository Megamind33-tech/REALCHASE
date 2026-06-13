# Real Audio Meters Evidence

Replaces the "no audio source connected" placeholder with **real** audio level
metering measured from a live source audio track. No fabricated levels.

## Real behaviour
- **Capture** (`SourcesContext.addWebcamSource`): now requests
  `getUserMedia({ video: true, audio: true })`, with a graceful fallback to
  video-only when the device has no microphone.
- **Metering** (`src/audio/audioMeter.ts`): a shared `AudioContext` +
  per-stream `MediaStreamAudioSourceNode` → `AnalyserNode`; level is the **RMS of
  the time-domain signal** (0..1). The analyser is **not** connected to the
  output, so metering never plays the source back (no echo).
- **Meter UI** (`src/components/audio/AudioMeter.tsx`): a level bar + peak-hold
  marker driven by `requestAnimationFrame`, updating the DOM **via refs** — it
  never calls `setState`, so it adds zero React re-render churn (important for
  the performance concern). Cleans up rAF + disconnects nodes on unmount.
- **Outputs panel** (`OutputPanel.tsx`): renders a real meter per live source
  that has an audio track; otherwise shows the honest "No real audio source
  connected" fallback.

## Proof it is real (not a fake bar)
`audio-meter-readback.txt`:
- Captured stream has `audioTracks: 1, videoTracks: 1`.
- Meter fill width sampled over time: **94.34% → 0.016% → 0%** — the width
  tracks the actual audio waveform amplitude frame-to-frame. A static/fake bar
  would not vary; a random bar is forbidden by the smoke test.

## Screenshots
| File | Proves |
|------|--------|
| `01-builder-with-audio-meter.png` | Builder with the Outputs panel showing a live meter for the source. |
| `02-output-panel-audio-meter.png` | The Audio section: "Webcam 1" real level bar + peak marker + "live", next to the honestly-disabled Transitions/REC. |
| `audio-meter-readback.txt` | Track counts + varying meter levels (real analysis). |

## Gates
- `tsc -b` → PASS · `node tests/anti-demo-smoke.mjs` → PASS · `vite build` → PASS.
- Smoke test updated: fake/animated/random meters remain forbidden; a meter is
  allowed **only** if it is the Web Audio `AudioMeter` gated on `getAudioTracks()`.
- Leak scan: no `setInterval`/`console`/`Math.random`/`debugger` in audio code;
  rAF cancelled and analyser disconnected on unmount; source tracks stopped on
  source removal.

## Still missing (next)
- Per-channel mixer (gain/mute/solo) and a master bus.
- dBFS scale + true-peak/LUFS metering; configurable make-up gain.
- Routing audio into a real Program/record/stream bus (needs the output pipeline).
</content>
