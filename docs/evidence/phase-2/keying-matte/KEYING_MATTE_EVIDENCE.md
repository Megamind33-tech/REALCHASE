# Keying — Matte Cleanup Layer (performance-safe)

Adds broadcast-style matte cleanup on top of the CbCr key, while staying smooth:
the extra work is **gated** so the default path costs nothing.

## Changes (all in the single media shader pass)
- **Matte black/white clip** (`blackClip` / `whiteClip` uniforms): remaps the
  matte — black point raises the floor to kill grey haze in keyed-out areas;
  white point firms the solid subject core. Pure math, zero extra cost.
- **Edge matte denoise** (`denoise` uniform + `texel`): a 4-tap cross around each
  pixel averages the key alpha to smooth jagged/noisy edges. **Gated behind
  `if (denoise > 0.001)`** so when denoise is 0 (default) there are **no extra
  texture samples** — full smoothness preserved; the cost is only paid when an
  operator opts in.
- Kept: CbCr chroma key, luminance-preserving despill, smootherstep edge.
- **Calibration UI** (`SwitcherPanel`): added Edge denoise, Black clip, White
  clip sliders alongside the existing Similarity/Smoothness/Spill/Opacity + key
  color + Show-matte + Auto-sample.
- `KeyingSettings` gains `denoise` (0), `blackClip` (0), `whiteClip` (1);
  defaults are no-ops so existing projects load unchanged.

## Evidence
| File | Proves |
|------|--------|
| `01-matte-calibration-controls.png` | Full calibration panel incl. Edge denoise (0.70), Black clip (0.12), White clip (0.90); engine "Running", 40 fps. |
| `02-clean-matte.png` | Matte preview: green backdrop keys to **solid black** (no grey haze — black-clip), denoised edges, subject retained. |
| `03-clean-key-composited.png` | Composited result with the cleaned key. |
| `keying-matte.txt` | Settings used + clean console. |

## Performance
- Denoise off (default) = single texture sample (unchanged cost). Verified
  `if (denoise > 0.001)` gate. Clip + smootherstep are free math.
- Still one render pass, no render targets. Builds on PR #9 (CbCr key) and the
  performance passes (#8/#10).

## Gates
`tsc -b` ✅ · `vite build` ✅ · `node tests/anti-demo-smoke.mjs` ✅ · leak scan clean.

## Still deferred (needs a compositor / multi-pass)
- True **light-wrap** (needs the composited background colour behind the plate).
- Garbage/holdout masks; tracking; set occlusion; lighting/colour match.
- These are intentionally not faked single-pass; they come with a compositor pass.
</content>
