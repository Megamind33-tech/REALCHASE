# Real Recording (REC) — Program output → .webm

Makes the REC button real: it captures the **Program output** (the composited
studio render with the keyed source) to a downloadable WebM file via the
browser `MediaRecorder` API. No fake recording state.

## How it works
- `StudioEngine.captureOutputStream(fps)` → `canvas.captureStream()` of the live
  studio render. Falls back to the raw Program video track if the canvas isn't
  capturable.
- `SourcesContext` recording manager: mixes the captured video with the Program
  source's **audio** tracks, picks a supported `video/webm` codec, runs a
  `MediaRecorder`, shows a real elapsed clock, and on stop builds a `Blob` and
  triggers a real download. Timer + recorder are cleaned up on stop and on
  unmount (no zombie interval/recorder).
- REC is **enabled only when a source is on Program** (else disabled with a clear
  tooltip) — operator-safe, no fake "REC".

## Evidence
| File | Proves |
|------|--------|
| `01-rec-ready.png` | REC enabled once a source is on Program. |
| `02-recording.png` | Button shows **● REC 0:03** — real elapsed recording. |
| `chase-program-*.webm` | The actual recorded file (saved via the real download). |
| `rec.txt` | file size **113,582 bytes**, valid WebM EBML magic `1A45DFA3` = a real, playable recording of the Program output. |

## Gates
`tsc -b` ✅ · `vite build` ✅ · `node tests/anti-demo-smoke.mjs` ✅ · leak scan
clean (REC interval cleared on stop + unmount; recorder stopped on unmount).

## Next (GO LIVE)
- Real streaming via WebRTC **WHIP** to MediaMTX (or RTMP via a server), reusing
  `captureOutputStream`. Then GO LIVE publishes the same Program output live.
