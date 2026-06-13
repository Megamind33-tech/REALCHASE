> **UPDATE (superseded):** the CI texture caveat below was **resolved**. Babylon's
> `StandardMaterial` mis-samples textures under CI software-WebGL, but a custom
> `ShaderMaterial` samples correctly, so the live video now renders **on the
> Babylon plane in CI** and the DOM Program monitor was removed. See the
> authoritative, current evidence in `../3d-video-placement/`
> (`VIDEO_PLACEMENT_EVIDENCE.md`). This file is kept for history.

# Phase 2 — Source Placement Evidence

How the live video source is treated as a **separate broadcast object** inside
CHASE PRO — not a background image, not a fake thumbnail, not a full-screen plate.

## The five layers are kept distinct
1. **Virtual set / 3D environment** — the procedural newsroom (desk, LED walls,
   lights, floor). Untouched by the video pipeline.
2. **Live video source** — a `Source` object in state with its own identity
   (`src/sources/sourceTypes.ts`): real `MediaStream`, status, placement mode.
3. **Source placement object** — a dedicated Babylon mesh `programMedia`
   (chaseId `program-media`): a separate, selectable scene node with its own
   transform, an always-on blue edge frame, and a `VideoTexture` bound to the
   live feed. It floats in front of the LED wall — never blended into it.
4. **Preview output** — a DOM `<video>` confidence monitor in the Switcher.
5. **Program output** — a DOM `<video>` confidence monitor in the Switcher and a
   docked Program monitor in the Builder viewport, plus the in-scene
   `programMedia` plane.

## Which rendering method is used where (and why)
- **Engine integration (the real one):** the in-set `programMedia` plane uses a
  Babylon **`VideoTexture`** bound to the managed `<video>`; frames are pushed to
  the GPU each render tick (`StudioEngine.setProgramStream` + render loop
  `programTexture.update()`). This is the canonical Babylon live-video path and
  it displays the feed on GPU hardware.
- **Confidence monitors (DOM):** Preview/Program monitors in the Switcher and the
  docked Program monitor in the Builder viewport are DOM `<video>` with
  `srcObject`. These are standard broadcast confidence views and are **not**
  claimed to be engine integration.

### Important environment caveat (honest)
This CI host has **no GPU**; Chromium runs on software WebGL (ANGLE/SwiftShader).
In that environment, **uploaded textures sample as white** — geometry and
lighting render correctly, but any texture upload does not display. This is **not
a code bug**: the pre-existing desk-screen `DynamicTexture` ("CHASE NEWS") also
renders white in the same screenshots, in **both headless and headed (Xvfb)**
runs. Consequently, in CI screenshots the `programMedia` plane shows as a white
framed object rather than the live pixels. The **docked DOM Program monitor**
therefore guarantees the live Program pixels are visible in the viewport for
evidence, while the Babylon `VideoTexture` path is the real engine integration
that displays on GPU hardware.

> This DOM monitor is the temporary, CI-visible representation. It is bounded,
> labelled, and not a background; it does not pretend to be the engine texture.
> **Next patch must visually validate the `VideoTexture` plane on a GPU host.**

## Placement guarantees (verified)
- Placed as a **free-floating plane** in front of the LED wall, not blended into
  the background. (`05-program-in-set.png`)
- **Selectable** with transform gizmo handles + visible blue placement frame.
  (`06-source-selected-handles.png`)
- Supports **position / rotation / scale** via the standard transform tools; the
  Scale tool shows real resize handles. (`07-source-scale-handles.png`)
- **Aspect ratio preserved** — plane scaled from `videoWidth/videoHeight`, so
  faces/bodies are not stretched and it is not stretched across the scene.
- **Removable cleanly** — disposing the source disposes the mesh + VideoTexture
  and detaches/removes the `<video>`; no ghost layer remains.
  (`08-source-removed-no-ghost.png`, `tracks-cleanup.txt`)

## What is still temporary / next steps
- Only `mediaPlane` placement is wired. `screenInsert`, `presenterPlate`,
  `backgroundPlate` are declared in the model but **not implemented**.
- The in-set `VideoTexture` needs a **GPU-host screenshot** to visually confirm
  pixels on the plane (CI software-GL can't show it). The DOM monitor covers CI.
- Toward virtual production next: `screenInsert` (map onto a monitor mesh),
  presenter chroma-key + alpha, camera tracking, and lens/lighting match.
</content>
