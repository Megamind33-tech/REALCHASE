# Controls Audit — Shell UI

Scope: shell components (`TopBar`, `StatusBar`, `Timeline`, `OutputPanel`,
`SwitcherPanel`, `GraphicsPanel`, the builder toolbar in `Viewport`, and the
non-AR module workspaces in `ModuleWorkspaces`). AR workspace, AssetPanel,
Inspector, SceneOutliner, CameraStrip, ScenesPanel, engine files and contexts
are out of scope (owned by other agents).

Status legend:
- **WIRED** — handler performs a real action wired in this pass.
- **ALREADY-WORKING** — handler was already real and verified against context/engine.
- **HONESTLY-DISABLED** — `disabled` with a `title=` tooltip explaining why; no fake behavior.
- **REMOVED** — a pretend/no-op control was removed.

Every control verified to either mutate real shared state (`useShell`,
`useSources`, `useTimeline`, `useGraphics`, `useLighting`, `useEditorBridge`)
that is consumed downstream (engine, MediaRecorder, WebRTC/WHIP, Web Audio bus),
or is honestly disabled. No silent dead buttons remain.

---

## `src/components/shell/TopBar.tsx`

| Control | Status | Note |
|---|---|---|
| Project selector `<select>` | HONESTLY-DISABLED | Read-only display of open project; switching saved projects needs the persistent project service. (Was a no-op toast → disabled.) |
| Save Project button | ALREADY-WORKING | Serializes shell+sources+scene and writes a `.chaseproj` file via `saveProjectFile`. |
| Open Project button + file input | ALREADY-WORKING | Parses a `.chaseproj`, restores sources and scene assets. |
| New button | HONESTLY-DISABLED | Needs persistent project service; was a no-op `FILE_ACTION` → disabled with tooltip. |
| Import button | HONESTLY-DISABLED | Needs persistent project service; was a no-op `FILE_ACTION` → disabled with tooltip. |
| Undo button | ALREADY-WORKING | Dispatches `UNDO`; disabled when `undoStack <= 0`. |
| Redo button | ALREADY-WORKING | Dispatches `REDO`; disabled when `redoStack <= 0`. |
| Record/Capture button | ALREADY-WORKING | `toggleCapture()` — real MediaRecorder → `.webm`; gated on a Program source. |
| WHIP endpoint URL input | ALREADY-WORKING | Bound state, fed to `toggleAir`; disabled while on air. |
| Live/On-Air button | ALREADY-WORKING | `toggleAir(ingestUrl)` — real WebRTC/WHIP publish; gated on a Program source. |

## `src/components/shell/StatusBar.tsx`

| Control | Status | Note |
|---|---|---|
| Compact toggle (settings module) | ALREADY-WORKING | Dispatches `TOGGLE_COMPACT`. |
| Reduced Motion toggle (settings module) | ALREADY-WORKING | Dispatches `TOGGLE_REDUCED_MOTION`. |
| Live Chat button (non-settings modules) | HONESTLY-DISABLED | Disabled with tooltip — requires a streaming/output service. |

## `src/components/shell/Timeline.tsx`

| Control | Status | Note |
|---|---|---|
| Ruler scrub (pointer down/move) | ALREADY-WORKING | `seek()` on the real timeline playhead. |
| Collapse/expand button + double-click header | ALREADY-WORKING | Dispatches `TOGGLE_TIMELINE`. |
| Layer rail buttons | ALREADY-WORKING | Dispatches `SET_LAYER` with real scene node id. |
| Cue "jump to time" button | ALREADY-WORKING | `seek(cue.time)`. |
| Cue delete button | ALREADY-WORKING | `removeCue(id)`. |
| Jump to start | ALREADY-WORKING | `seek(0)`. |
| Step back / forward | ALREADY-WORKING | `stepBy(-1)` / `stepBy(1)`. |
| Play/Pause | ALREADY-WORKING | `togglePlay()`. |
| Stop | ALREADY-WORKING | `stop()`. |
| Loop toggle | ALREADY-WORKING | `setLoop(!loop)`. |
| + Camera cue | ALREADY-WORKING | `addCue` with a real `cameraSwitch` cue at playhead. |
| + Gfx On / + Gfx Off | ALREADY-WORKING | `addCue` for selected graphic; guides user if none selected. |

## `src/components/shell/OutputPanel.tsx`

| Control | Status | Note |
|---|---|---|
| Transition tiles (×N) | HONESTLY-DISABLED | Disabled with tooltip — need the real output transition pipeline. |
| Recording format `<select>` | ALREADY-WORKING | `setRecordingFormat`; options reflect real codec capability detection; disabled while capturing. |
| Destination enable checkbox | ALREADY-WORKING | `updateDestination(id, { enabled })`. |
| Leg enable checkbox (satellite/normal) | ALREADY-WORKING | `updateDestinationLeg`. |
| Leg URL / stream-key inputs | ALREADY-WORKING | `updateDestinationLeg` — kept in memory only. |
| "Open public page" link | ALREADY-WORKING | Opens `live.html` WHEP player (live URL when on air). |

## `src/components/shell/SwitcherPanel.tsx`

| Control | Status | Note |
|---|---|---|
| Add Webcam / Video File / Image / Screen | ALREADY-WORKING | Real getUserMedia / file / getDisplayMedia source creation. |
| Video/Image file inputs | ALREADY-WORKING | Create real media-file sources. |
| CUT button | ALREADY-WORKING | `cut()` — Preview → Program; disabled with no Preview. |
| Source rename input | ALREADY-WORKING | `renameSource` on blur/Enter. |
| Placement `<select>` | ALREADY-WORKING | `updateSourcePlacement`; `backgroundPlate` option disabled until output pipeline. |
| Screen-insert target `<select>` | ALREADY-WORKING | `updateSourcePlacement('screenInsert', target)`. |
| Presenter keying mode `<select>` | ALREADY-WORKING | `updateSourceKeying({ mode })`. |
| Keying color / Auto-sample / Show-matte | ALREADY-WORKING | Bound to live shader uniforms; Auto samples from Program backdrop. |
| Keying sliders (similarity, smoothness, spill, denoise, clips, light-wrap, garbage matte, match, exposure, opacity) | ALREADY-WORKING | `updateSourceKeying` → real chroma/alpha shader uniforms. |
| To Preview button | ALREADY-WORKING | `setPreview(id)`; disabled unless source live. |
| Remove source button | ALREADY-WORKING | `removeSource(id)`. |

## `src/components/shell/GraphicsPanel.tsx`

| Control | Status | Note |
|---|---|---|
| Add Lower Third / Ticker / Logo Bug | ALREADY-WORKING | `addGraphic(defaultGraphic(type))`. |
| Graphic row select | ALREADY-WORKING | `selectGraphic(id)`. |
| Play/Take-off-air button (row) | ALREADY-WORKING | `handleToggleAir` → `playGraphic`/`stopGraphic` real overlay. |
| Delete graphic button (row) | ALREADY-WORKING | Stops if on air, then `removeGraphic(id)`. |
| Editor air toggle | ALREADY-WORKING | `handleToggleAir(selected)`. |
| Title / Subtitle / Ticker text / Logo text inputs | ALREADY-WORKING | `patchGraphic`; live CG UPDATE when on air. |
| Ticker speed / Opacity / Animation sliders | ALREADY-WORKING | `patchGraphic` with live update. |
| Corner `<select>` | ALREADY-WORKING | `patchGraphic({ corner })`. |
| Font `<select>` | ALREADY-WORKING | `patchGraphic({ fontFamily })`. |
| Accent color picker | ALREADY-WORKING | `patchGraphic({ accentColor })`. |

## `src/components/shell/Viewport.tsx` (builder toolbar)

| Control | Status | Note |
|---|---|---|
| 3D / 2D mode toggle | ALREADY-WORKING | `SET_VIEWPORT_MODE` → `engine.setViewportMode`. |
| Camera selector `<select>` | ALREADY-WORKING | `SET_CAMERA` (cam1–cam6 match `CAMERA_SHOTS`). |
| Transform-mode buttons (select/translate/rotate/scale) | ALREADY-WORKING | `SET_TRANSFORM_MODE` → `engine.setTransformMode`. |
| Focus selection | ALREADY-WORKING | `engine.focusSelection()`. |
| Grid overlay button | HONESTLY-DISABLED | Disabled with tooltip — engine grid toggle not exposed yet. |
| Camera tracking toggle | ALREADY-WORKING | `setCameraTracking` — drives virtual camera test signal. |
| Tracking smoothing slider | ALREADY-WORKING | `setTrackingSmoothing`. |
| Tracking source URL input | ALREADY-WORKING | Bound state fed to `connectTracking`. |
| Connect/disconnect tracking button | ALREADY-WORKING | `connectTracking`/`disconnectTracking` (FreeD/mo-sys WebSocket bridge). |
| Safe-area button | ALREADY-WORKING | `TOGGLE_SAFE_AREA` (guides rendered in `ViewportCanvas`). |
| Quality mode buttons (low/balanced/high) | ALREADY-WORKING | `SET_QUALITY`. |
| Performance warning Set-Low / Dismiss | ALREADY-WORKING | `SET_QUALITY` + `DISMISS_PERFORMANCE_WARNING`. |

## `src/components/shell/ModuleWorkspaces.tsx` (non-AR workspaces)

### Cameras
| Control | Status | Note |
|---|---|---|
| Studio camera buttons | ALREADY-WORKING | `SET_CAMERA` per `CAMERA_SHOTS` id. |
| Test-signal toggle | ALREADY-WORKING | `setCameraTracking`. |
| Smoothing slider | ALREADY-WORKING | `setTrackingSmoothing`. |
| Tracking URL input + connect button | ALREADY-WORKING | `connectTracking`/`disconnectTracking`. |

### Lighting
| Control | Status | Note |
|---|---|---|
| Preset buttons | ALREADY-WORKING | `applyPreset` → real engine lighting. |
| Per-channel intensity sliders | ALREADY-WORKING | `setLighting` (key/ambient/accent). |
| Per-channel color pickers | ALREADY-WORKING | `setLighting`. |

### Audio
| Control | Status | Note |
|---|---|---|
| Channel faders | ALREADY-WORKING | `setChannelParams({ gain })` on real Web Audio bus. |
| Channel mute / solo | ALREADY-WORKING | `setChannelParams({ muted/solo })`. |
| Master fader | ALREADY-WORKING | `setMasterGain` — the recorded/streamed bus. |

### Outputs
| Control | Status | Note |
|---|---|---|
| Composite preview / status read-outs | ALREADY-WORKING | Derived from real sources state (display only). |
| (No interactive transport here) | — | Go-live/record live on the toolbar; this is a status surface. |

### Overlays
| Control | Status | Note |
|---|---|---|
| Per-graphic On-air / Off button | ALREADY-WORKING | `setOnAir` + `playGraphic`/`stopGraphic`. |

### Scripts (Rundown)
| Control | Status | Note |
|---|---|---|
| Cue "jump to time" button | ALREADY-WORKING | `seek(cue.time)` on the real timeline. |

### Settings
| Control | Status | Note |
|---|---|---|
| Quality mode buttons | ALREADY-WORKING | `SET_QUALITY`. |
| Compact mode toggle | ALREADY-WORKING | `TOGGLE_COMPACT`. |
| Reduced motion toggle | ALREADY-WORKING | `TOGGLE_REDUCED_MOTION`. |
| Automatic backup switch | HONESTLY-DISABLED | Was a real `TOGGLE_BACKUP` toggle that did nothing observable (no backup service); replaced with a disabled `role="switch"` + tooltip pointing to manual Save Project. |

---

## Summary

- **WIRED (this pass):** 0 — all live controls were already wired in prior commits on this branch; this pass verified each against the contexts/engine and confirmed no silent no-ops remain.
- **ALREADY-WORKING (verified real):** ~70 controls across the in-scope files.
- **HONESTLY-DISABLED:** 6 — Project selector, New, Import (TopBar); Live Chat (StatusBar); Grid overlay (Viewport); Automatic backup (Settings); plus per-tile Transition buttons (OutputPanel) and the `backgroundPlate` placement option (SwitcherPanel).
- **REMOVED:** 0 — no pretend controls left behind; the previously fake project-selector / New / Import / backup toggles were converted to honest-disabled rather than deleted, since they are meaningful affordances awaiting the persistent project service / output pipeline.

All interactive controls have an `aria-label` or visible text, and `title` tooltips where they add clarity or explain a disabled state.
