# Chroma-Key Hardening Evidence

Builds on codex PR #5's foundational keying. Adds real, operator-tunable
chroma-key with spill suppression and a matte preview, bound to the live media
shader — verified visually (codex could not capture screenshots).

## What changed (real behaviour)
- **Shader** (`StudioEngine.ts` `MEDIA_SHADER` fragment): added `spill` and
  `showMatte` uniforms.
  - **Spill suppression:** clamps the dominant key channel toward the other two
    (green/blue/red-screen aware), mixed by the `spill` amount — removes key-color
    fringing on kept pixels.
  - **Matte preview:** `showMatte` renders the alpha matte as grayscale so the
    operator can calibrate the key (white = kept, black = keyed out).
  - Keeps adjustable `similarity` / `smoothness` (soft edge via `smoothstep`).
- **Model** (`sourceTypes.ts`): `KeyingSettings` gains `spill` and `showMatte`;
  defaults `spill: 0.5`, `showMatte: false`.
- **Live, non-destructive updates** (`StudioEngine.setProgramStream`): a fast
  path re-applies placement + keying uniforms **without rebuilding the
  VideoTexture** when the stream is unchanged, so dragging calibration sliders no
  longer flickers/resets the feed (`programStream` tracked).
- **Calibration UI** (`SwitcherPanel.tsx` `KeyingControls`): for a
  `presenterPlate` source with keying on, a panel exposes key color, Similarity,
  Smoothness, Spill, Opacity sliders, and a **Show matte** toggle — all wired to
  `updateSourceKeying` → real shader uniforms.

## Screenshots
| File | Proves |
|------|--------|
| `01-keying-calibration-controls.png` | Real calibration panel (key color + Similarity/Smoothness/Spill/Opacity + Show matte) under the presenterPlate source; Preview/Program show the live feed. |
| `02-chromakey-default.png` | Default key in the 3D viewport (this synthetic green sits outside the default threshold — see matte). |
| `03-matte-preview.png` | `showMatte` renders the alpha matte as grayscale in-scene — the calibration tool. |
| `04-tuned-controls.png` | Similarity raised to ~0.55, Spill to ~0.9. |
| `05-chromakey-tuned-similarity-spill.png` | After tuning, the green is keyed out and the plate is transparent — set + gizmo visible through it (real alpha compositing). |

## Verification (gates)
- `tsc -b` → PASS · `vite build` → PASS (2m48s) · `node tests/anti-demo-smoke.mjs` → PASS.
- Visual capture: `tools/evidence/capture-keying.mjs` (Chromium 1194 + fake device).
- Leak scan of changed files: no `setInterval`/`console`/`Math.random`/`debugger`.

## Still missing (documented, next steps)
- Garbage masks, edge-light wrap, and per-source key calibration presets.
- Despill in a perceptual space (current despill is RGB channel-clamp).
- Tracking, occlusion by set geometry, and lighting/colour match.
- Default key color/threshold auto-pick from a sampled background region.
</content>
