# Phase 2 — Source Placement Evidence

This documents how the live video source is treated as a **separate broadcast
object** inside CHASE PRO, not as a background image or a fake thumbnail.

## The five layers are kept distinct
1. **Virtual set / 3D environment** — the procedural newsroom (desk, LED walls,
   lights, floor). Untouched by the video pipeline.
2. **Live video source** — a `Source` object in state with its own identity
   (`src/sources/sourceTypes.ts`), a real `MediaStream`, status, and placement.
3. **Source placement object** — a dedicated Babylon mesh `programMedia`
   (chaseId `program-media`) that carries the video texture. It is a separate,
   selectable scene node with its own transform and an always-on edge frame.
4. **Preview output** — a DOM `<video>` confidence monitor in the Switcher.
5. **Program output** — a DOM `<video>` confidence monitor in the Switcher **and**
   the in-scene `programMedia` plane in the Builder viewport.

## Which rendering method is used where
- **Preview & Program monitors (Switcher panel):** DOM `<video>` with
  `srcObject`. This is the correct, standard way to show confidence monitors and
  is **not** claimed to be engine integration.
- **In-set Program placement (Builder viewport):** a real **Babylon
  `DynamicTexture`** on the `programMedia` mesh. Each render tick the current
  video frame is drawn into the texture's canvas and uploaded to the GPU
  (`StudioEngine.drawProgramFrame`). This works identically on GPU and on
  software WebGL (SwiftShader in CI), so the screenshots prove the feed is
  genuinely sampled by the engine in 3D space.

Why `DynamicTexture` (canvas) rather than Babylon `VideoTexture`: it renders
reliably under headless software WebGL used for CI evidence, while remaining a
real, GPU-sampled texture on the mesh. Functionally equivalent for this slice.

## Placement guarantees (verified)
- The source is placed as a **free-floating plane** in front of the LED wall, not
  blended into the background. (`05-program-in-set.png`)
- It is **selectable** with transform gizmo handles and a visible placement
  frame. (`06-source-selected-handles.png`)
- It supports **position / rotation / scale** via the standard transform tools;
  the Scale tool shows real resize handles. (`07-source-scale-handles.png`)
- **Aspect ratio is preserved** — the plane is scaled from the source's
  `videoWidth/videoHeight`, so faces/bodies are not stretched; it is not
  stretched across the whole scene.
- It is **removable cleanly** — disposing the source disposes the mesh + texture
  and detaches the video element; no ghost layer remains.
  (`08-source-removed-no-ghost.png`, `tracks-cleanup.txt`)

## What is still temporary / next steps
- Only `mediaPlane` placement is wired. `screenInsert`, `presenterPlate`, and
  `backgroundPlate` are declared in the model but **not implemented**.
- The plane auto-selects on CUT for placement; a dedicated placement panel
  (numeric transform, snap-to-screen) is future work.
- **Next steps toward virtual production:**
  - `screenInsert`: map Program onto the desk screen / a monitor mesh.
  - Presenter keying: chroma-key shader + alpha so a presenter plate composits
    over the set.
  - Camera tracking + lens/lighting match so the source sits correctly in the
    virtual set.
- Migrating the in-set feed from `DynamicTexture` to `VideoTexture` (or WebGL
  external-texture) on GPU hosts is an optimisation, validated separately.
</content>
