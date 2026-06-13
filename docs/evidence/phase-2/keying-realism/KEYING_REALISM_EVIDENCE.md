# High-Grade Keying Realism (performance-safe)

Upgrades the chroma key toward broadcast realism **without** adding render cost —
it stays a single-pass, single-sample fragment shader (no extra passes, no
per-frame CPU), so the viewport stays smooth.

## What changed (all in one GPU pass)
- **Chroma-space (CbCr) keying** (`StudioEngine` `MEDIA_SHADER`): the key is now
  computed from BT.601 **chroma distance** instead of raw RGB distance. Keying on
  chroma ignores luminance, so shadows/highlights and uneven backdrop lighting no
  longer tear holes in the matte — markedly cleaner edges. Same one texture
  sample → **identical GPU cost**.
- **Smootherstep matte edge**: `a*a*(3-2a)` on the alpha — softer, cleaner edge
  falloff (free, no extra taps).
- **Luminance-preserving despill**: the dominant key channel is capped at the
  brighter of the other two, removing the key tint on fringe pixels without
  darkening them.
- **Auto key-colour sampler** (`StudioEngine.sampleProgramKeyColor` → bridge
  `sampleKeyColor` → "Auto" button): one-shot CPU read of the live Program
  backdrop's top-left region to pick the real key colour. Not per-frame.

## Performance
- Render loop unchanged; shader still does **one** `texture2D` sample.
  `grep` confirms a single sampler read. No extra render targets, no blur taps.
- Verified the viewport still runs (CI software-WebGL ~10 fps, same as before —
  the keying change adds no measurable cost; smoothness preserved on real GPUs).

## Evidence
| File | Proves |
|------|--------|
| `01-realism-controls-auto.png` | Calibration panel after **Auto** sampled the backdrop; sliders tuned. |
| `02-chromakey-realism-result.png` | Clean key in the 3D set — green fully removed (set/gizmo/frame visible through the plate), no green fringe/halo. |
| `03-realism-matte.png` | Alpha matte preview for the tuned key. |
| `keying-realism.txt` | Auto-sampled key colour `#029500` (the real backdrop green, not the assumed `#00ff00`) + clean console. |

## Gates
`tsc -b` ✅ · `vite build` ✅ · `node tests/anti-demo-smoke.mjs` ✅ · leak scan clean.

## Still toward full Zero-Density parity (future, heavier)
These need a compositor / multi-pass and are deliberately deferred to protect
smoothness until they can be done GPU-cheaply:
- Edge **light-wrap** (needs the composited background colour).
- Garbage masks / holdout mattes; matte denoise (separable blur pass).
- Camera **tracking**, set **occlusion** of the plate, and lighting/colour match.
- Perceptual despill (Lab/▽E) and spill re-lighting.
</content>
