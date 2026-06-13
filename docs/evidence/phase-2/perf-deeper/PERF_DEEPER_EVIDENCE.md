# Deeper Performance Evidence

Second performance pass, focused on keeping the engine smooth at runtime. All
changes are regression-checked (idle scene, camera switch, and live program all
still render correctly).

## Changes (file → effect)
1. **Idle render throttling** (`StudioEngine` render loop): when there is **no
   live Program feed** and **no recent interaction** (>1.5 s since any pointer /
   camera / gizmo / selection / quality change), the loop drops to ~10 redraws/s
   (a heartbeat every 6th frame) instead of full rate — saving ~80% of idle GPU
   work. A live feed or any interaction instantly restores full rate. It never
   stops entirely, so the viewport can't get stuck. `markInteraction()` is fired
   from pointer events and from the camera/selection/transform/desk/quality
   methods.
2. **Freeze static materials** (`StudioEngine.init`): every material except the
   genuinely-dynamic ones (`deskMat`, `floorMat`, `deskScreenMat`, and the live
   program shader) is `material.freeze()`d, so Babylon skips their per-frame
   readiness/dirty checks. (Freezing a material doesn't affect mesh transforms,
   so the editor's gizmo still works.)
3. **Adaptive quality step-down** (`StudioEngine` FPS observer +
   `applyEffectiveScaling`): on **sustained** FPS < 20 the render resolution
   steps down (one-way, capped at +0.5 hardware-scaling) so weak GPUs stay
   smooth. It never auto-raises (no oscillation) and resets on an explicit
   quality change.

## Regression check (no functionality lost)
| File | Proves |
|------|--------|
| `01-idle-viewport-renders.png` | After 4 s idle the full set still renders (heartbeat) — idle throttling does **not** blank the viewport. |
| `02-after-camera-switch.png` | Switching to CAM 2 marks interaction → full-rate render; scene updates. |
| `03-live-program-full-rate.png` | Live Program video renders on the media plane at full rate from CAM 2 (freeze + throttle + adaptive don't break the feed). |
| `perf-deeper.txt` | Viewport overlay + clean console (no errors). |

## Gates
`tsc -b` ✅ · `vite build` ✅ · `node tests/anti-demo-smoke.mjs` ✅ ·
leak scan clean (visibilitychange listener removed on dispose; loadedmetadata is
`{once:true}`; no setInterval).

> CI software-WebGL FPS is low regardless (no GPU); these changes cut idle work,
> per-frame material checks, and auto-reduce resolution on weak GPUs — felt on
> real/low-end hardware. Builds on the earlier code-split + render-efficiency pass.

## Still available (future perf)
- True render-on-demand (render only on a dirty flag) once gizmo/animation dirty
  tracking is exhaustive.
- Freeze world matrices for static meshes (needs unfreeze-on-select wiring).
- Lazy-load glTF loader + editor-tools until a pack/import is used.
- WebGPU path with capability detection.
</content>
