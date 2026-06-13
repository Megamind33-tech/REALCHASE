# Phase 2 — Evidence (Reliable Source Import & Switching)

The first **real** broadcast function in CHASE PRO: a real live source, real
Preview, real Program, a real CUT, and the live Program placed inside the studio
as a **separate, selectable media object** (never blended into the set
background). Local only — no MediaMTX, RTMP, recording, or destinations.

> **About the camera:** the CI host has no physical webcam, so Chromium runs
> with its **built-in fake media device** (`--use-fake-device-for-media-stream`).
> Everything else is genuinely real: `navigator.mediaDevices.getUserMedia()` is
> really called, a real `MediaStream` is returned, real `<video>` elements play
> it, and a real Babylon `VideoTexture` is bound to a dedicated mesh. Only the
> camera *pixels* are synthetic. This is not a fake thumbnail.
>
> **About in-set texture display in CI:** this host has no GPU (software WebGL).
> In that environment uploaded textures render **white** — proven by the
> pre-existing desk-screen `DynamicTexture` also being white in the same shots
> (headless *and* headed/Xvfb). So the in-scene `VideoTexture` plane appears as a
> white framed object in CI, while the **docked DOM Program monitor** shows the
> actual live pixels. The Babylon path is the real engine integration and
> displays on GPU hardware. See `source-placement/SOURCE_PLACEMENT_EVIDENCE.md`.

## Screenshots / logs (in `source-placement/`)
| File | Proves |
|------|--------|
| `01-empty-virtual-set.png` | Studio viewport with **no** live source — the set alone. |
| `02-source-in-preview.png` | Real webcam source listed as **LIVE** and playing in the **Preview** monitor; Program still OFF. |
| `03-program-empty-before-cut.png` | Program bus is empty **before** CUT. |
| `04-program-live-after-cut.png` | After **CUT**, the source is on **Program**; Program monitor shows live video, source row shows PROGRAM tally. |
| `05-program-in-set.png` / `05b-full-builder.png` | The Program placement object (`programMedia` plane) floats in the set as a **separate object** (white in CI per the texture caveat), with the **docked DOM Program monitor** showing the live feed — clearly distinct from the LED-wall background. |
| `06-source-selected-handles.png` | The Program media object is **selected**, showing the transform gizmo + a blue placement frame (it's a real, manipulable scene object). |
| `07-source-scale-handles.png` | The **Scale** transform tool active on the source — real resize handles; aspect ratio preserved; still separate from the background. |
| `08-source-removed-no-ghost.png` | After removing the source, the media plane is gone — **no ghost video/texture** left in the set. |
| `09-permission-denied.png` | With `getUserMedia` rejecting `NotAllowedError`, the source row shows **ERROR** with a clear "Camera permission denied" message. |
| `tracks-cleanup.txt` | Permission state + track readyStates: **"live"** while active, **"ended"** after removal — no leaked tracks, one stream per Add Webcam. |
| `../tsc-build.txt` / `../vite-build.txt` | `tsc -b` and `vite build` pass. |
| `../git-status.txt` | `git status --short` clean after commit. |

See `source-placement/SOURCE_PLACEMENT_EVIDENCE.md` for the placement-specific
explanation (DOM vs engine, what's temporary, next steps).

## Real behaviour added
- **Source model** (`src/sources/sourceTypes.ts`): `id, name, type, status,
  createdAt, stream, error, placement`. `SourceType` covers `webcam | screen |
  media | image | ndi | mediamtx`; `PlacementMode` covers `mediaPlane |
  screenInsert | presenterPlate | backgroundPlate`. `describeMediaError()` maps
  getUserMedia failures (denied / not-found / in-use / unsupported) to clear text.
- **Sources state** (`src/context/SourcesContext.tsx`): sources +
  `previewId`/`programId`; async `addWebcamSource()` (real getUserMedia),
  `removeSource()` (stops tracks), `setPreview()`, `cut()` (Preview→Program).
  Unmount cleanup stops every track via a live ref mirror.
- **Switcher UI** (`src/components/shell/SwitcherPanel.tsx`): Add Webcam, source
  list with live status/role, Preview + Program confidence monitors fed by real
  `srcObject`, and a real CUT.
- **Program in the scene** (`src/engine/StudioEngine.ts` `setProgramStream`):
  builds a dedicated `programMedia` plane (chaseId `program-media`) with a
  Babylon `VideoTexture` bound to the live feed (frame-pushed each render tick);
  selectable, gizmo-transformable, aspect-correct, with an always-on edge frame;
  fully disposed on removal/engine teardown.
- **Docked Program monitor** (`src/components/viewport/ViewportCanvas.tsx`): a
  bounded, labelled DOM `<video>` confidence monitor in the Builder viewport —
  the CI-visible live feed (documented temporary), complementary to the engine
  VideoTexture path.
- **Honesty sweep (fake buttons removed):** `GO LIVE`/`REC` disabled with
  "not wired yet"; CameraStrip gradient "previews" replaced with honest neutral
  tiles; lighting presets + filter disabled; Inspector Light/Keying/Presenter/
  Materials tabs now show explicit "not wired yet" notices instead of dead
  sliders.

## Boundaries respected
- No MediaMTX / RTMP / recording / destinations.
- Render engine, scene builder, cameras, gizmos, transforms, set loading
  untouched except the additive `setProgramStream`/`clearProgramMedia` methods.
- No fake video, gradient thumbnails, random meters, or fake LIVE/REC.

## Gates
- `tsc -b` → **PASS** · `vite build` → **PASS**
- Manual launch + WebGL2 render → **PASS**
- Webcam ingest (fake device) → **PASS** · Preview→Program CUT → **PASS**
- Source cleanup (tracks end) → **PASS** · Permission-denied handling → **PASS**
- Lint/tests → none configured (`tsc -b` is the static gate).

## Known remaining risks / next slice
- Preview/Program **monitors** are DOM `<video>` (correct for confidence
  monitors); the **in-set** Program is the Babylon texture object. Other
  placement modes (`screenInsert`, `presenterPlate`, `backgroundPlate`) are
  declared but **not wired**.
- Leaving Builder disposes the engine (Phase 1 behaviour); Program is re-applied
  to the new engine on return.
- Native Tauri desktop still unverified (headless container) — Phase 7.
- **Next safe slice:** `screenInsert` placement (map Program onto the desk
  screen / a real monitor mesh) + a placement-mode selector, then a second
  source + transition for true A/B switching.
</content>
