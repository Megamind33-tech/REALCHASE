# Performance Optimization Evidence

Addresses the reported sluggishness. Real, measured changes; no behaviour
regressions (program video, selection, keying still work — see screenshots).

## Changes (file → effect)
1. **Bundle code-splitting** (`vite.config.ts` `manualChunks`): the single
   ~7.25 MB JS chunk is split into cacheable vendor chunks.
   - Before: `index-*.js` **7,252 kB** (one chunk).
   - After: `babylon-core` **6,697 kB** · `babylon-loaders` 263 kB ·
     `react-vendor` 216 kB · `babylon-gui` 76 kB · `editor-tools` 37 kB ·
     **app `index` 84 kB**.
   - Effect: the app's own code (84 kB) and React parse/load independently of
     the heavy engine; on app updates only the 84 kB app chunk re-downloads
     (Babylon stays cached). Faster startup + better caching.
2. **`scene.skipPointerMovePicking = true`** (`StudioEngine`): Babylon ray-casts
   the scene on every pointer-move by default; we only pick on POINTERDOWN, so
   this removes continuous picking cost during mouse movement.
3. **`preserveDrawingBuffer: false`** (`StudioEngine` Engine options): re-enables
   GL fast paths (we capture via the DOM compositor, not `canvas.toDataURL`).
4. **Pause rendering when the 3D viewport is off-screen**
   (`StudioEngine.setActive` + render-loop guard, wired via `EditorBridge` →
   `ViewportCanvas` mount/unmount): when the operator is in the Switcher or
   another module the engine no longer renders to an off-screen canvas. Also
   skips rendering while `document.hidden` (tab not visible). The
   `visibilitychange` listener is removed on dispose (no leak).

## Regression check (no functionality lost)
- `01-viewport-after-perf.png`: live Program video renders on the Babylon media
  plane after the perf changes.
- `02-viewport-after-module-roundtrip.png`: after Builder → Switcher → Builder,
  the engine pauses then resumes and the Program video + gizmo still render
  correctly (pause/resume + rebuild + re-apply verified).
- `perf-runtime.txt`: viewport overlay reports live FPS; no console/page errors.

> Note: CI runs software WebGL (no GPU), so absolute FPS here (~10) reflects the
> renderer, not the optimizations. The wins above reduce per-frame work,
> eliminate off-screen rendering, and cut startup/parse — felt most on real
> hardware and lower-end machines.

## Gates
`tsc -b` ✅ · `vite build` ✅ (2m48s) · `node tests/anti-demo-smoke.mjs` ✅ ·
leak scan clean (visibility listener removed on dispose; no setInterval/random).

## Still available (next perf passes)
- Render-on-demand (render only on camera/selection/animation/video change).
- Freeze world matrices/materials for genuinely static set meshes (needs care vs.
  the editor's transform feature).
- Quality auto-step-down on sustained low FPS; WebGPU path where supported.
- Lazy-load `babylonjs-editor-tools`/loaders only when a pack/import is used.
</content>
