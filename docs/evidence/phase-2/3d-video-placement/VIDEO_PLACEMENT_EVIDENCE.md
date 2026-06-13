# Phase 2 — 3D Video Placement Evidence

The live Program source is integrated into the production scene as a **real
Babylon scene object** — not a DOM overlay. This corrects the previous slice,
where CI software-WebGL made a textured plane render white and a DOM monitor was
used as a stopgap. That stopgap is **removed**; the video now renders on the mesh.

## Integration method (and why it's not a DOM overlay)
- The Program source is a dedicated Babylon mesh **`programMedia`** (chaseId
  `program-media`) created by `StudioEngine.setProgramStream`.
- Its material is a purpose-built **`ShaderMaterial`** (`MEDIA_SHADER`) whose
  fragment shader samples a Babylon **`VideoTexture`** bound to the managed
  `<video>` (`gl_FragColor = texture2D(videoSampler, …)`). Frames are pushed to
  the GPU every render tick (`programTexture.update()` in the render loop).
- It is **not** an HTML/CSS element layered over the canvas. The DOM Program
  monitor that previously sat over the viewport has been deleted
  (`ViewportCanvas.tsx`). The only DOM `<video>` elements left are the
  Preview/Program **confidence monitors inside the Switcher panel**, which are
  standard and clearly separate from the 3D viewport.

### Why a ShaderMaterial (root-cause fix)
Babylon's `StandardMaterial` texture sampling renders **white** on this CI host's
software WebGL (ANGLE/SwiftShader) — reproduced with `DynamicTexture`,
`RawTexture`, and `VideoTexture`, all reporting `isReady: true`. A **minimal raw
WebGL2 shader samples the same textures correctly** (verified: a red 1×1 texture
renders red). So the fault is in `StandardMaterial`'s generated shader under
SwiftShader, not texture upload. The media plane therefore uses a small custom
shader, which samples reliably on **both** software WebGL (CI screenshots prove
it) **and** GPU hardware.

## Separation from the virtual set
- The plane floats at a fixed position **in front of** the LED wall — it is a
  distinct object, never the wall/background and never full-screen.
- An always-on blue **edge frame** (`enableEdgesRendering`) marks its boundary so
  it reads as a separate source object even when unselected.
- It appears as its own node (`Program Media`) in the Layers list.

## Selection / move / scale
- Picking the plane (or auto-select on CUT) attaches the transform gizmo and
  shows the edge frame (`07-source-selected-handles.png`).
- The standard transform tools (Select / Translate / Rotate / Scale) operate on
  it like any scene object; the Scale tool shows resize handles
  (`08-source-scaled.png`).
- **Aspect ratio** is derived from `videoWidth/videoHeight`, so the source is
  never stretched/deformed.

## Cleanup (no leaks, no ghosts)
- `removeSource` stops the `MediaStream` tracks; `setProgramStream(null)` /
  `clearProgramMedia` disposes the `VideoTexture`, disposes the mesh, detaches
  the gizmo, and removes the off-screen `<video>`.
- `09-source-removed-no-ghost.png` shows the set with no media plane; the engine
  `dispose()` also tears the texture/video down. `tracks-cleanup.txt` shows
  tracks `live` → `ended` with exactly one stream per Add Webcam.

## What each screenshot proves
| File | Proves |
|------|--------|
| `01-app-launched.png` | App shell launches. |
| `02-empty-virtual-set.png` | Studio viewport with no source. |
| `03-source-in-list-and-preview.png` | Source listed LIVE + visible in Preview. |
| `04-program-empty-before-cut.png` | Program empty before CUT. |
| `05-program-live-after-cut.png` | Program live after CUT (Switcher monitor). |
| `06-program-video-in-viewport.png` / `06b-full-builder.png` | **Live video rendered on the Babylon plane in the 3D viewport.** |
| `07-source-selected-handles.png` | Source selected: gizmo handles + placement frame. |
| `08-source-scaled.png` | Scale tool active: resize handles on the source. |
| `09-source-removed-no-ghost.png` | Source removed — no ghost mesh/texture. |
| `10-honest-controls.png` | Disabled REC/GO LIVE etc. replacing fake demo controls. |
| `tracks-cleanup.txt` | Permission state + tracks `live`→`ended`, single stream. |

## Still missing (next steps for true virtual production)
- **Presenter keying / alpha:** chroma-key shader + transparency so a presenter
  plate composits over the set without a rectangle.
- **Depth / occlusion:** let set geometry occlude the plane correctly (currently
  unlit, always-on-top-ish ordering not enforced).
- **Camera tracking & lens/lighting match:** so the source sits believably in the
  virtual set as the camera moves.
- **Additional placement modes:** `screenInsert` (onto a monitor mesh),
  `presenterPlate`, `backgroundPlate` (opt-in).
</content>
