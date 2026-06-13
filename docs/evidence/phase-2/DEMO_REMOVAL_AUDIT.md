# CHASE PRO — Demo-Removal / Product-Maturity Audit

Classification of visible controls as of Phase 2 (3D video placement). Goal:
no active-looking control that does nothing real.

## ✅ Real and wired
- **Switcher:** Add Webcam (real `getUserMedia`), To Preview, **CUT**
  (Preview→Program), Remove (stops tracks), source list w/ live status/role.
- **Program in viewport:** live source rendered on a real Babylon mesh
  (ShaderMaterial + VideoTexture); selectable, move/rotate/scale via gizmo,
  aspect-preserving, removable.
- **Builder viewport:** camera switching (6 ArcRotate viewpoints), Select/
  Translate/Rotate/Scale gizmo, Focus selection, Safe-area guides, 2D/3D mode,
  Quality (Low/Balanced/High → real `applyQuality`).
- **Asset panel:** 3D object add (real meshes), glTF/.glb drag-drop import (real),
  studio-pack load (real loader; honest error when a pack file is absent).
- **Inspector → Layout:** Environment Rotation, Floor Reflection, Desk Model,
  Desk Color, Desk Glow, Desk Screen, Desk Screen Text (real `applyDeskProperties`).
- **Inspector → Camera:** Focal Length, Depth of Field (real `applyCameraLens`).
- **Shell:** module rail navigation, panel collapse/expand, Compact / Reduced-
  Motion (real CSS), real FPS + resolution telemetry.

## ⏸ Disabled — "not wired yet" (honest, inert)
- **GO LIVE**, **REC** (top bar) — no output/recorder pipeline yet.
- **Lighting Presets** (asset panel) and the asset **Filter** button.
- **Inspector → Light / Keying / Presenter / Materials** — explicit "not wired
  yet" notices instead of dead sliders.
- **Inspector → Layout Presets** (Standard/Wide/Split/Minimal) — disabled.
- **Viewport Grid toggle** — disabled.
- **To Preview** — disabled unless the source is `live`.

## 🗑 Removed because fake/noisy (now honest)
- Random CPU/GPU/RAM metrics + fabricated performance warning (Phase 1).
- Random audio-meter animation; fake "~124 MB" REC size; fake stream "LIVE" +
  bitrate (Phase 1 → OutputPanel shows "not connected").
- CameraStrip CSS-gradient "previews" → neutral camera-angle tiles (no fake live
  thumbnail).
- Fake "Applied: <preset>" lighting toast.
- DOM Program overlay over the viewport → replaced by real in-scene Babylon video.

## ⚠ Remaining demo-looking areas (not yet addressed)
These still look active but are not fully wired. Listed for transparency; none
fabricate live broadcast confidence (no fake LIVE/REC/health/meters):
- **Top bar:** Save / Open / New / Import and the project selector → currently
  toast "project service not connected" (honest text, but non-functional).
- **Timeline:** transport (play/skip/loop/record-cue), keyframes, zoom — visual
  only; playback animates nothing.
- **Output panel:** Transitions selector (stored, not applied to CUT yet); audio
  mixer M/S toggles (no audio device); "Manage Destinations".
- **CameraStrip:** "Add Camera" → toast "pending".
- **Inspector → Camera:** Parallax slider (stored, not applied).
- **Undo / Redo:** integer counters, not a real history stack.
- **Other rail modules** (Scenes, Assets, Graphics, Overlays, Lighting, Cameras,
  Audio, Scripts, Outputs, Settings): placeholder workspaces.

## Next safest fixes toward production-ready
1. Disable/relabel the Timeline transport + Transitions until wired (or wire a
   real fade on CUT).
2. Wire Save/Open/New via Tauri fs (real project persistence) or disable.
3. Replace integer Undo/Redo with a real command-history stack.
4. Gate placeholder rail modules behind a clear "Coming in Phase N" state.
5. `screenInsert` placement + presenter keying (alpha) as the next video slice.
</content>
