# Keying — Lighting / Colour Match (single-pass, free by default)

Grades the keyed subject toward the set's exposure + white balance so it sits in
the scene instead of looking pasted on — a real composite-integration step.

## How it works
- Uniforms `matchTint` (set-light colour), `matchExposure`, `matchAmount`.
- In the media shader (after despill/light-wrap): `graded = clamp(rgb * matchTint
  * matchExposure, 0, 1); rgb = mix(rgb, graded, matchAmount)`.
- **Gated behind `if (matchAmount > 0.001)`** → default amount 0 = no-op, zero
  extra cost; lives in the same single shader pass.
- Calibration UI: Set-light colour swatch, Match amount, Exposure sliders.

## Evidence
| File | Proves |
|------|--------|
| `00-colormatch-controls.png` | Lighting/colour-match controls in the keying panel. |
| `01-colormatch-off.png` | Subject at native colour (match amount 0). |
| `02-colormatch-on-warm.png` | Same source graded toward a warm set light (`#ff7a33`, amount 1.0, exposure 1.25) — the subject is visibly warmer/darker, integrating with the set lighting. |
| `colormatch.txt` | Settings used + clean console. |

## Gates
`tsc -b` ✅ · `vite build` ✅ · `node tests/anti-demo-smoke.mjs` ✅ · leak scan clean.

## Performance
Single-pass, math-only, default no-op — no FPS impact.

## Next
- Auto colour match: derive `matchTint`/exposure from the backdrop RTT average so
  it adapts to the set automatically.
