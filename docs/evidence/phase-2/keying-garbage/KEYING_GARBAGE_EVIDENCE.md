# Keying — Garbage / Holdout Matte (single-pass, free by default)

Adds a per-source **garbage matte**: a rectangular crop in the media shader that
forces everything outside the talent rectangle transparent — removing stray
backdrop objects, set edges, or lighting rigs that the chroma key alone leaves in.

## How it works
- `garbage` uniform `(minX, minY, maxX, maxY)` in normalised frame coords.
- `garbMask(uv)` = soft-edged 1 inside the rect, 0 outside (smoothstep feather);
  the key alpha is multiplied by it. **Default rect `0,0,1,1` → mask = 1 → no-op.**
- Pure math, **no extra texture samples** → zero added cost; lives in the same
  single shader pass as the key/despill/denoise/light-wrap.
- Calibration UI: Crop left / right / top / bottom sliders (per source).

## Evidence
| File | Proves |
|------|--------|
| `01-garbage-controls.png` | Garbage-matte crop sliders in the keying panel. |
| `02-garbage-matte-cropped.png` | Matte preview: with the key keeping most of the frame, the matte is **white only inside the crop rectangle and black outside** → everything outside the talent rect is cut. |
| `garbage.txt` | Crop values used + clean console. |

## Gates
`tsc -b` ✅ · `vite build` ✅ · `node tests/anti-demo-smoke.mjs` ✅ · leak scan clean.

## Performance
Single-pass, math-only, default no-op — no FPS impact.
