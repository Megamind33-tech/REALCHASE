# CHASE STUDIO PRO — Comprehensive Functionality Audit

## Verified M2 Source Manager Backport (2026-06-14)

**Branch:** `chase/fork-audit`  
**Implementation commits:** `729cc78`, `c778e73`

- [x] Add a real webcam source, or show an honest unavailable/permission error.
- [x] Add a real local video file source and decode frames into a live `MediaStream`.
- [x] Add a real local image source through a bounded-resolution canvas stream.
- [x] Add screen/window capture with `getDisplayMedia`, with an honest unsupported state.
- [x] Show real source type and track-health state in the source list.
- [x] Route selected sources through Preview and CUT to Program.
- [x] Reuse mediaPlane, screenInsert, presenterPlate, and keying settings for all real streams.
- [x] Rename and remove sources.
- [x] Release tracks, listeners, object URLs, hidden elements, and frame loops on remove/unmount.
- [x] Persist source metadata without serializing fake streams or local file contents.
- [x] Browser smoke verifies decoded image/video frames, Preview/Program state, rename/remove, and cleanup.

**Residual risk:** A headed operator rehearsal is still required for the native screen-selection prompt and real camera permissions. The production Vite bundle timed out on the current OneDrive workstation; TypeScript and dev-runtime tests pass.

## Verified M7 Output Preview Slice (2026-06-14)

**Implementation commit:** `e9afea4`

- [x] Show the real composited Babylon canvas in the Outputs panel.
- [x] Include scene sources and Babylon broadcast graphics in that preview/capture path.
- [x] Report recording duration, emitted bytes, bitrate, and negotiated MIME type.
- [x] Record WebM through MediaRecorder.
- [x] Enable H.264/MP4 only when the current runtime reports native support.
- [x] Disable ProRes honestly until a native Tauri/ffmpeg bridge exists.
- [x] Save screenshot and MP4 evidence under `docs/evidence/phase-7/output-preview`.

**Scope:** All user-facing features and internal systems  
**Format:** Feature → Status → Working Details → Missing/Broken Details → Acceptance Criteria for "done"

---

## MODULE: BUILDER

### Scene: Main 3D Viewport

**Status:** PARTIAL (50%)

#### What Works
- ✅ Babylon.js scene renders in real-time
- ✅ Six cameras (cam1–cam6) selectable via dropdown
- ✅ Camera switching updates viewport instantly
- ✅ View mode toggle (3D/2D button exists; 2D not implemented but 3D is solid)
- ✅ Quality modes (Low/Balanced/High) toggle render resolution
- ✅ Performance warning auto-triggers at <24 FPS
- ✅ Transform mode buttons (Select, Translate, Rotate, Scale) toggle state
- ✅ Focus selection button calls engine.focusSelection() — works
- ✅ Safe area guides toggle updates state
- ✅ Camera tracking checkbox wires to engine; smoothing slider functional
- ✅ Tracking source URL input (WebSocket connection to FreeD/mo-sys)

#### What's Missing
- ❌ 2D viewport mode (button exists; not implemented)
- ❌ Grid overlay (button disabled; no implementation)
- ❌ Safe area visual overlay (toggle works; overlay not rendered)
- ⚠️ Transform tool interaction (buttons change mode; 3D gizmo interaction incomplete)

#### Acceptance Criteria for "Done"
- [ ] 3D viewport renders at >30 FPS with 20+ imported assets
- [ ] All six cameras show distinct, live perspectives
- [ ] Transform tools (translate/rotate/scale) allow click-and-drag asset manipulation
- [ ] Safe area guides visible as semi-transparent guides (2.45:1 broadcast safe, 4:3 title safe)
- [ ] Performance warning only shows when FPS actually <24

---

### Asset Import & Management

**Status:** WORKING (85%)

#### What Works
- ✅ Drag-and-drop file upload (AssetPanel left sidebar)
- ✅ GLB/GLTF file validation (magic header, size limits)
- ✅ Real geometry inspection: mesh count, vertex count, file size
- ✅ Heavy asset detection and warning
- ✅ Asset transform controls (position XYZ, rotation XYZ, scale XYZ)
- ✅ External file reference checkbox (embed vs. link)
- ✅ Asset relink UI (file picker to reconnect missing external assets)
- ✅ Asset groups: multi-select → create group → group transform
- ✅ Group hierarchy display in Inspector

#### What's Missing
- ❌ Drag-and-drop to viewport (only file picker)
- ❌ Asset library browser (only imported assets shown)
- ❌ Material editing (no texture/shader UI)
- ❌ LOD (level-of-detail) management
- ⚠️ Asset deletion (no remove button in Inspector)

#### Acceptance Criteria for "Done"
- [ ] Import 100 assets without memory leak
- [ ] All asset metadata (mesh/vert count) accurate
- [ ] Heavy asset warning threshold (<10k verts = light, >50k = heavy)
- [ ] External file relink works on project reload
- [ ] Asset groups persist in project save/restore

---

### Timeline Panel

**Status:** WORKING (80%) — implemented in Milestone 5

Real transport + cue engine (`TimelineContext` + always-mounted `TimelinePlayer`).
The playhead advances in real time via requestAnimationFrame; cues fire concrete
app actions — play/stop a broadcast graphic (M4) or switch the active camera.

#### What Works
- ✅ Broadcast timecode (HH:MM:SS:FF) advancing live from the playhead
- ✅ Transport: play / pause / stop (to 0) / step ±1s / loop — all real
- ✅ Scrubbable ruler — click or drag to seek; playhead reflects time
- ✅ Cue authoring at the playhead: camera-cut cue, graphic-on / graphic-off cue
- ✅ Cues fire automatically during playback AND on scrub (state reconciled to cues)
- ✅ Cue markers on the ruler; cue list with jump-to and delete
- ✅ Layer rail (scene nodes) with selection
- ✅ Loop wraps and re-fires cues from the top

#### What's Missing (future)
- ⚠️ Per-object transform keyframing + interpolation (cues only, not tweens)
- ⚠️ Timeline not yet persisted in the project file
- ⚠️ Backward scrub reconciles graphics on/off but not mid-animation frames

#### Acceptance Criteria for "Done"
- [x] Play button triggers playback; timecode advances in real-time
- [x] Pause/resume work; stop returns to start
- [x] Click/drag on ruler to scrub; timecode updates
- [x] Add cues at the playhead (camera + graphics)
- [x] Cues drive real app state (graphics overlay + camera)
- [ ] Transform keyframes + project persistence (future)

---

### Inspector: Layout Tab (Desk Properties)

**Status:** PARTIAL (40%)

#### What Works
- ✅ Desk model selector (Curved Broadcast, Straight Modern, Glass Top)
- ✅ Desk color picker (updates state)
- ✅ Desk glow toggle
- ✅ Desk screen toggle
- ✅ Desk screen text input
- ✅ Environment rotation slider (0–360°)
- ✅ Floor reflection slider (0–100%)

#### What's Missing
- ❌ Layout presets buttons (Standard, Wide, Split, Minimal all disabled)
- ⚠️ Desk property changes not wired to 3D scene (state updates; no Babylon mesh update)

#### Acceptance Criteria for "Done"
- [ ] Desk color change updates Babylon mesh material in real-time
- [ ] Desk glow/screen toggles visible in 3D
- [ ] Desk screen text renders on 3D screen quad
- [ ] Layout presets load named asset snapshots (e.g., "Wide" layout loads wide-angle asset group)
- [ ] All changes persistent in project save

---

### Inspector: Camera Tab

**Status:** PARTIAL (30%)

#### What Works
- ✅ Focal length slider (14–200mm; updates state)
- ✅ Depth of field slider (0–100%)
- ✅ Parallax slider (0–100%)

#### What's Missing
- ❌ Camera property changes not wired to active camera (state only)
- ⚠️ FOV calculation not accurate (values change state; no visual feedback)

#### Acceptance Criteria for "Done"
- [ ] Focal length (14mm = wide, 200mm = telephoto) updates active camera FOV visually
- [ ] Depth of field slider triggers post-process blur
- [ ] Parallax affects camera parallax offset (moves camera slightly per frame)
- [ ] Changes apply only to selected camera (cam1–cam6)

---

### Inspector: Light Tab

**Status:** WORKING (75%) — implemented in Milestone 6

Drives the real scene lights: a key DirectionalLight, the ambient
HemisphericLight, and the accent point lights. Lighting persists across
Builder re-entry (re-applied on engine ready) via `LightingContext`.

#### What Works
- ✅ Key / Ambient / Accent intensity sliders (live)
- ✅ Per-channel colour pickers (live)
- ✅ Presets: Broadcast, Studio, Natural, Dramatic (adjust all channels in concert)
- ✅ Live preview in the viewport (and captured output/thumbnails)
- ✅ Active preset highlighting; persists across module switches

#### What's Missing (future)
- ⚠️ Light position gizmo / 3D placement
- ⚠️ Shadow controls
- ⚠️ Lighting not yet saved in the project file (scene snapshot captures desk look only)

#### Acceptance Criteria for "Done"
- [x] Studio lighting controls (key + ambient + accent)
- [x] Presets adjust multiple lights in concert
- [x] Live preview of lighting changes
- [ ] Light placement gizmo + shadows + project persistence (future)

---

### Inspector: Presenter Tab

**Status:** MOCK (0%)

#### What Works
- ❌ Tab label only

#### What's Missing
- ❌ Skin smoothing
- ❌ Eye brightness
- ❌ Teeth whitening
- ❌ Face detection/tracking

#### Acceptance Criteria for "Done"
- [ ] Real-time beautification filters on presenterPlate sources
- [ ] Sliders for each adjustment (0–100% range)
- [ ] Preview in Program monitor
- [ ] Per-source settings (different talent, different presets)

---

### Inspector: Keying Tab

**Status:** MOCK (0%)

#### What Works
- ❌ Tab label only (keying controls exist on Switcher instead)

#### What's Missing
- ❌ Keying mode selector (disabled, chromaKey, alpha)
- ❌ Chroma-key controls (similarity, smoothness, spill, etc.)
- ❌ Matte visualization

#### Acceptance Criteria for "Done"
- [ ] Advanced keying UI mirrors SwitcherPanel KeyingControls
- [ ] Allows preset save/load for keying settings
- [ ] Settings apply to selected presenterPlate source

---

### Inspector: Materials Tab

**Status:** WORKING (70%) — implemented in Milestone 6

#### What Works
- ✅ Reads the selected mesh's real material (StandardMaterial or PBRMaterial)
- ✅ Base colour + emissive colour pickers apply live
- ✅ PBR metallic + roughness sliders apply live (for imported glTF/PBR assets)
- ✅ Honest empty state when the selection has no editable material (e.g. a group)

#### What's Missing (future)
- ⚠️ Texture picker / replace
- ⚠️ Material browser / presets
- ⚠️ Material changes not yet persisted in the project file

#### Acceptance Criteria for "Done"
- [x] Select object → edit its material colour/emissive
- [x] PBR sliders (metallic, roughness) update in real-time
- [ ] Texture picker (future)

---

## MODULE: SWITCHER

### Live Source Management

**Status:** WORKING (85%)

#### What Works
- ✅ "Add Webcam" button ingests real MediaStream
- ✅ Source health status displays (TRACK LIVE, CONNECTING, ERROR, DISCONNECTED)
- ✅ Source name, type (webcam), health badge all accurate
- ✅ Source list shows all added sources
- ✅ Remove source button works
- ✅ Source placement mode dropdown (mediaPlane, screenInsert, presenterPlate)
- ✅ Keying mode selector (disabled, chromaKey, alpha) when placement = presenterPlate
- ✅ Keying controls (similarity, smoothness, spill, etc.) fully functional

#### What's Missing
- ❌ "Add Video File" button (built in M2 on an older base; **not yet ported** to this branch's advanced SourcesContext — outstanding backport)
- ❌ "Add Image" button (same — outstanding backport)
- ❌ "Add Screen Capture" button (same — outstanding backport)
- ❌ NDI/RTMP input (not implemented)
- ⚠️ Placement mode "backgroundPlate" disabled (no composite output rendering yet)

#### Acceptance Criteria for "Done"
- [x] Add webcam works (real MediaStream)
- [ ] Add video file / image / screen capture (backport from M2 outstanding)
- [x] Source health reflects actual track state
- [x] New sources appear in list immediately
- [x] Remove source stops playback and releases handles

---

### Preview / Program Switching

**Status:** WORKING (95%)

#### What Works
- ✅ Preview monitor shows selected source (or empty with message)
- ✅ Program monitor shows on-air source
- ✅ "CUT" button transitions preview → program
- ✅ Source "To Preview" button selects for preview
- ✅ Program source tally (source name displayed in red)
- ✅ Preview source tally (source name displayed in green)

#### What's Missing
- ⚠️ Transition effects disabled (UI only; no actual transition)

#### Acceptance Criteria for "Done"
- [ ] Program source updates instantly on CUT (visual feedback)
- [ ] Tally states accurate (preview shows green, program shows red)
- [ ] Only one source can be on-program at a time

---

### Chroma-Key & Keying Controls

**Status:** WORKING (90%)

#### What Works
- ✅ Keying mode selector (disabled, chromaKey, alpha)
- ✅ Key color picker
- ✅ "Auto" button samples key color from Program backdrop
- ✅ Show matte toggle
- ✅ Similarity, smoothness, spill, denoise sliders (0–1 range)
- ✅ Black/white clip controls
- ✅ Light wrap slider
- ✅ Garbage matte crop (4 sliders: left, right, top, bottom)
- ✅ Lighting/color match (color picker + matchAmount/matchExposure sliders)
- ✅ Opacity slider (final alpha)
- ✅ Sliders update shader uniforms in real-time

#### What's Missing
- ⚠️ Matte visualization not rendered (toggle works; no visual preview)

#### Acceptance Criteria for "Done"
- [ ] Keying values apply to presenterPlate source in real-time
- [ ] Matte preview shows white = keep, black = key out
- [ ] Presets can be saved/loaded (Basic, High Contrast, Soft Edge, etc.)

---

## MODULE: SCENES

**Status:** WORKING (85%) — implemented in Milestone 3

Real scene composer (`ScenesPanel` + `ScenesContext`) backed by engine methods
`captureNodeTransforms` / `applyNodeTransforms` / `captureSceneThumbnail` /
`getActiveCameraId`.

#### What Works
- ✅ Save current scene (captures every selectable object's transform + active camera + desk look)
- ✅ Live render-target thumbnail per scene
- ✅ Load scene restores transforms + camera + desk; honest partial-restore (reports missing objects)
- ✅ Scene grid with thumbnails, object count, camera tag
- ✅ Rename (inline), re-capture, delete per scene
- ✅ Active scene highlighting

#### What's Missing (future polish)
- ⚠️ Scenes not yet persisted in the project file (in-session only)
- ⚠️ Lighting state not part of snapshot (lighting controls don't exist yet)

#### Acceptance Criteria for "Done"
- [x] Create scene button
- [x] Scene thumbnail generated from 3D viewport
- [x] Load scene restores object positions + camera + desk
- [ ] Scenes persist in project file (future)
- [x] Quick-select scene from thumbnails grid

---

## MODULE: ASSETS

**Status:** MOCK (0%)

#### Note
Real asset management exists in **builder → AssetPanel** (left sidebar). This module should consolidate and extend that UI.

#### What's Missing
- ❌ Asset library browser (by category)
- ❌ Drag-and-drop to viewport
- ❌ Asset details (format, size, usage)
- ❌ Asset dependencies (which scenes use this asset)
- ❌ Asset search/tagging
- ❌ Asset export

#### Acceptance Criteria for "Done"
- [ ] Browse all imported assets with thumbnails
- [ ] Sort by name, size, mesh count, usage
- [ ] Drag asset to viewport to place
- [ ] Double-click asset to select in scene
- [ ] Delete asset (removes from all scenes)

---

## MODULE: GRAPHICS

**Status:** WORKING (85%) — implemented in Milestone 4

Built on `@babylonjs/gui` as a real fullscreen overlay on the live scene
(CasparCG CG paradigm: template item + play/stop/update + layered z-order).
GPL CasparCG referenced as design model only; no GPL code used.

#### What Works
- ✅ Add lower third, ticker, logo bug (real CG templates)
- ✅ Lower third: title + subtitle, slide-up + fade-in animation, accent bar
- ✅ Ticker: scrolling headline crawl with configurable speed, LIVE flag
- ✅ Logo bug: corner placement (TL/TR/BL/BR), opacity, fade-in
- ✅ Play On Air / Take Off Air per graphic (real play/stop with in/out anim)
- ✅ Live CG UPDATE — editing an on-air graphic updates it in real time
- ✅ Renders into the actual scene frame (visible in thumbnails + output)
- ✅ On-air state survives module switches (GraphicsSync replays onto fresh engine)
- ✅ Accent color, animation duration controls
- ✅ No disabled/"coming soon" controls

#### What's Missing (future polish)
- ⚠️ Graphics not yet persisted in project file (M5/M7 follow-up)
- ⚠️ Image-based logo (text-based bug only for now)
- ⚠️ Template library / presets

#### Acceptance Criteria for "Done"
- [x] Lower third template: title + subtitle + animated in/out
- [x] Ticker: scrolling headline text; configurable speed
- [x] Logo bug: corner placement, opacity
- [x] Graphics render as Babylon GUI overlay (not DOM)
- [x] Graphics play/stop on air; live update
- [ ] Graphics data stored in project; persist across sessions (future)

---

## MODULE: OVERLAYS

**Status:** MOCK (0%)

#### What's Missing
- ❌ Overlay stacking order UI
- ❌ Overlay opacity/blending controls
- ❌ Overlay animation keyframes
- ❌ Overlay mask/matte controls
- ❌ Overlay export/import

#### Acceptance Criteria for "Done"
- [ ] Multi-layer overlay composition
- [ ] Show/hide individual overlays
- [ ] Z-order drag-to-reorder
- [ ] Per-overlay opacity slider
- [ ] Blend mode selector (normal, add, multiply, screen, etc.)

---

## MODULE: LIGHTING

**Status:** MOCK (0%)

#### What's Missing
- ❌ 3-point lighting (key, fill, back)
- ❌ Light intensity/color controls
- ❌ Light position gizmo (3D placement)
- ❌ Light type selector
- ❌ Shadow controls (cast, receive)
- ❌ Lighting preset save/load
- ❌ HDRI environment lighting

#### Acceptance Criteria for "Done"
- [ ] Adjust light intensity, color, position with live 3D preview
- [ ] Save/load lighting presets (Broadcast, Studio, Natural, Stage, etc.)
- [ ] Light gizmo in viewport (click + drag to position)
- [ ] Shadow maps for realistic lighting
- [ ] Lighting changes persist in scene/project

---

## MODULE: CAMERAS

**Status:** MOCK (0%)

#### What Works
- ⚠️ Camera selection exists in viewport toolbar

#### What's Missing
- ❌ Camera position/rotation editor
- ❌ Camera preset save (wide, medium, tight, OTS, etc.)
- ❌ Camera focus targets
- ❌ Camera speed/easing controls
- ❌ Camera path animation (spline movement between points)
- ❌ Tracking camera setup UI

#### Acceptance Criteria for "Done"
- [ ] Create named camera presets (Wide, Medium, Tight, OTS)
- [ ] Preset selector loads camera position/rotation/FOV
- [ ] Manual camera control (position XYZ, rotation XYZ, FOV)
- [ ] Camera path editor (record camera motion; replay)
- [ ] Tracking camera setup wizard (FreeD/mo-sys URL, calibration)

---

## MODULE: AUDIO

**Status:** MOCK (0%)

#### What Works
- ✅ Audio meters exist in OutputPanel (reads live source audio levels)

#### What's Missing
- ❌ Audio mixer (per-source faders)
- ❌ Audio routing (submix groups)
- ❌ EQ controls
- ❌ Compression/limiting
- ❌ Audio monitoring (headphone mix)
- ❌ Audio recording control

#### Acceptance Criteria for "Done"
- [ ] Fader for each audio source (dB scale: −∞ to +20)
- [ ] Master fader
- [ ] Mute/solo per source
- [ ] Live level meters (real-time from audio tracks)
- [ ] Audio recorded with program output (sync)
- [ ] Audio settings persist; can be saved as preset

---

## MODULE: SCRIPTS

**Status:** MOCK (0%)

#### What's Missing
- ❌ Script editor
- ❌ Scripting language (Python? Node? Lua?)
- ❌ Event triggers (on-air, timeline, keybind)
- ❌ API access (scene, sources, output)
- ❌ Script library/templates
- ❌ Script console/debugging

#### Acceptance Criteria for "Done"
- [ ] Script editor with syntax highlighting
- [ ] Triggers: keyboard hotkey, MIDI, timeline position, source change
- [ ] API: change camera, toggle source visibility, start recording, etc.
- [ ] Error logging + console output
- [ ] Example scripts (lower third auto-trigger, camera auto-focus, etc.)

---

## MODULE: OUTPUTS

**Status:** MOCK (0%)

#### What Works
- ✅ Output configuration exists in OutputPanel (right sidebar)

#### What's Missing
- ⚠️ Outputs module placeholder should consolidate OutputPanel UI

#### Acceptance Criteria for "Done"
- [ ] Output module shows OutputPanel controls (capture, streaming, audio)
- [ ] Consolidated UI for all output destinations
- [ ] Output preview (composite monitor)
- [ ] Output health/status per destination

---

## MODULE: SETTINGS

**Status:** MOCK (0%)

#### What's Missing
- ❌ Preference panel (theme, layout defaults, performance)
- ❌ Keyboard shortcuts customization
- ❌ File/project settings (project name, resolution, frame rate)
- ❌ System preferences (GPU selection, memory limits)
- ❌ Help/about
- ❌ Telemetry opt-out

#### Acceptance Criteria for "Done"
- [ ] Settings panel organized by category (Project, Appearance, Performance, Shortcuts)
- [ ] Project settings: resolution, frame rate, bitrate
- [ ] Appearance: theme, panel layout, font size
- [ ] Keyboard shortcuts page (searchable; editable)
- [ ] Settings persist to config file

---

## OUTPUT PANEL (Right Sidebar)

### Transitions

**Status:** BROKEN (0%)

#### What Works
- ✅ UI renders 3 transition buttons (Fade, Dissolve, Push)

#### What's Missing
- ❌ Buttons disabled; transition engine not implemented
- ❌ Transition duration control disconnected

#### Acceptance Criteria for "Done"
- [ ] Select transition; adjust duration
- [ ] Apply transition on CUT (crossfade over specified time)
- [ ] Transition presets (Fade 0.5s, Dissolve 1s, Push 0.8s, etc.)

---

### Audio Metering

**Status:** WORKING (95%)

#### What Works
- ✅ Real-time audio level meters from live source tracks
- ✅ Reads audio context analyzer data (honest, not faked)
- ✅ dB scale display
- ✅ Peak indicator

#### What's Missing
- ⚠️ No audio mixer (meters read-only; no fader controls)

#### Acceptance Criteria for "Done"
- [ ] Meters update in real-time (no lag >50ms)
- [ ] Accurate dB scaling (−60 to +10 range)
- [ ] Peak hold for 2 seconds

---

### Output Tiles (Capture & Program Output)

**Status:** WORKING (90%)

#### What Works
- ✅ Capture tile shows recording state (Idle / Recording)
- ✅ Program Output tile shows stream state (Off air / Publishing)
- ✅ Tiles reflect actual MediaRecorder + WebRTC state
- ✅ Status text accurate (not faked)

#### What's Missing
- ⚠️ Capture tile shows status only (start/stop buttons are in TopBar)
- ⚠️ Output tile shows status only (streaming controls in TopBar)

#### Acceptance Criteria for "Done"
- [ ] Tiles show live status (Idle, Recording, Publishing)
- [ ] Tile reflects actual file write/stream publish (honest state)
- [ ] Capture tile shows file size, duration when recording
- [ ] Output tile shows bitrate, destination count when streaming

---

### Stream Destinations

**Status:** PARTIAL (70%)

#### What Works
- ✅ Destination list shows all configured destinations (YouTube, Twitch, Website, Custom RTMP)
- ✅ Enable/disable per destination checkbox
- ✅ RTMP leg configuration (satellite + normal URLs, stream keys)
- ✅ Website destination shows WHEP URL when on-air
- ✅ "Open public page" link to live.html player
- ✅ Armed leg count display

#### What's Missing
- ❌ Output relay not auto-started (manual ffmpeg setup required)
- ❌ Destination health monitoring (no ping/heartbeat)
- ❌ Fallback/retry logic (if RTMP fails, no auto-retry)
- ❌ Output preview (Program monitor shows source, not composite)
- ⚠️ HLS/DASH output (RTMP + WebRTC only; no HLS)

#### Acceptance Criteria for "Done"
- [ ] Destinations enable/disable without app restart
- [ ] Fan-out to all armed legs works (can verify in ffmpeg logs)
- [ ] Output relay starts/stops automatically
- [ ] Health indicator shows per-destination status (healthy, buffering, failed)
- [ ] Fallback to secondary RTMP leg on primary failure
- [ ] Recording + streaming both work simultaneously

---

## SYSTEM: Top Bar (Toolbar)

### File Operations

**Status:** PARTIAL (70%)

#### What Works
- ✅ Save Project: builds project file, opens dialog, saves to user location
- ✅ Open Project: file picker, parses JSON, restores sources/scene
- ✅ Project selector dropdown: changes displayed project name
- ✅ Undo/Redo buttons: update state counters (but undo/redo history not connected)

#### What's Missing
- ❌ New Project button (disabled; says "project service not connected")
- ❌ Import button (disabled; says "project service not connected")
- ❌ Auto-save (manual save only)
- ❌ Project versioning (no migration logic)

#### Acceptance Criteria for "Done"
- [ ] Save Project works reliably (prompts location; indicates success)
- [ ] Open Project restores all scene state exactly
- [ ] New Project creates blank workspace
- [ ] Undo/Redo actually reverses/reapplies scene changes
- [ ] Auto-save every 5 minutes (optional, with notification)

---

### Performance Monitoring

**Status:** WORKING (95%)

#### What Works
- ✅ System health indicator (green = OK, yellow = limited)
- ✅ Resolution display (1600×900 default)
- ✅ FPS display (real-time from engine)
- ✅ Performance warning triggers at <24 FPS

#### Acceptance Criteria for "Done"
- [ ] Performance indicator always reflects actual engine FPS
- [ ] Warning threshold <24 FPS (broadcast standard 23.976)
- [ ] "Set Low" button applies quality:low automatically

---

### Recording Controls

**Status:** WORKING (85%)

#### What Works
- ✅ Record button shows red when recording
- ✅ Captures program output to .webm file (MediaRecorder)
- ✅ Button disabled when no program source active
- ✅ Label shows file info or "Idle"
- ✅ File save location prompted on start

#### What's Missing
- ⚠️ Recording format hard-coded to WebM (no H.264/ProRes option)
- ⚠️ No recording file management UI (list, export, delete)

#### Acceptance Criteria for "Done"
- [ ] Record button starts/stops capture
- [ ] File writes to user-selected location
- [ ] File size/duration shown while recording
- [ ] Format options: WebM, H.264 (if ffmpeg available), ProRes (if QuickTime available)
- [ ] Saved files visible in file manager

---

### Streaming Controls

**Status:** WORKING (80%)

#### What Works
- ✅ WHIP endpoint URL input field
- ✅ Live button shows red when streaming
- ✅ Button disabled when no program source
- ✅ Label shows stream status or "Off air"
- ✅ WebRTC/WHIP publish works (proof via PR #22)

#### What's Missing
- ⚠️ RTMP destination fan-out is manual (no auto relay startup)
- ⚠️ No streaming preset shortcuts (YouTube, Twitch quick-config)

#### Acceptance Criteria for "Done"
- [ ] Go on-air button starts streaming to WHIP endpoint
- [ ] Streams to all armed RTMP destinations simultaneously
- [ ] Streaming stops reliably on button click
- [ ] Stream error message shows why stream failed
- [ ] Public page (live.html) playable while streaming

---

## SYSTEM: Project Persistence

**Status:** WORKING (70%)

#### What Works
- ✅ Project save: writes scene state (assets, groups, transforms) to JSON
- ✅ Project restore: reads JSON, loads all assets, restores transforms
- ✅ Source state: save/restore preview/program sources
- ✅ Asset missing detection: relink UI if external file not found
- ✅ Project file format: .chaseproj extension

#### What's Missing
- ❌ Timeline events not saved (no timeline data model yet)
- ❌ Workspace layout not saved (panel collapse state lost)
- ❌ Undo/redo history not saved
- ❌ Project migrations (no schema versioning)
- ❌ Auto-save (manual only)

#### Acceptance Criteria for "Done"
- [ ] Save project includes: scene assets, transforms, groups, sources, settings
- [ ] Restore project loads all state correctly
- [ ] Large projects (100+ assets) save/restore in <2 seconds
- [ ] External asset relinks work on restore
- [ ] Corrupted project file shows helpful error message

---

## SYSTEM: 3D Engine (StudioEngine.ts)

**Status:** WORKING (85%)

#### What Works
- ✅ Scene initialization and cleanup (no memory leaks detected in tests)
- ✅ Multi-camera setup (6 cameras, each selectable, distinctive FOV)
- ✅ Real-time asset import (GLB/GLTF loaded and rendered)
- ✅ Asset transform (position, rotation, scale)
- ✅ Asset groups with group transform
- ✅ Scene serialization/deserialization
- ✅ Camera thumbnail capture (off-screen render targets)
- ✅ Quality mode support (affects render resolution + shadow quality)
- ✅ Camera tracking input (FreeD/mo-sys WebSocket)
- ✅ Chroma-key shader uniforms (updated per-frame based on keying settings)
- ✅ FPS counter + performance monitoring
- ✅ View mode (3D only; 2D not implemented)

#### What's Missing
- ❌ 2D viewport mode
- ❌ Grid rendering
- ❌ Material editing (shader properties)
- ❌ Lighting control (hard-coded; no adjustment)
- ❌ Advanced camera tracking (full 6-DOF; only heading/pitch now)
- ⚠️ Transform gizmos (mode buttons work; visual gizmo interaction incomplete)

#### Acceptance Criteria for "Done"
- [ ] Engine renders 1000s of assets without memory leak
- [ ] All six cameras distinct and selectable
- [ ] Asset transform precise (±0.01 unit accuracy)
- [ ] Camera thumbnail capture shows all 6 distinct views
- [ ] FPS stable (no sudden drops unless asset count increases)
- [ ] Tracking camera responds to FreeD input in <100ms latency

---

## SYSTEM: Media Sources (SourcesContext.tsx)

**Status:** WORKING (80%)

#### What Works
- ✅ Webcam ingestion (getUserMedia)
- ✅ Real-time video/audio track monitoring
- ✅ Source health states (live, connecting, error, disconnected)
- ✅ Keying setup (mode selector, parameters, shader uniforms)
- ✅ Placement modes (mediaPlane, screenInsert, presenterPlate)
- ✅ Preview/program switching (cut)
- ✅ Source removal (stops tracks, releases context)
- ✅ Audio metering (real-time dB from audio analyzer)

#### What's Missing
- ❌ Video file input
- ❌ Image file input (static texture)
- ❌ Screen/window capture
- ❌ NDI input
- ❌ RTMP/RTSP ingest
- ⚠️ Multi-audio track handling (only main track)
- ⚠️ Audio submix/routing (no faders)

#### Acceptance Criteria for "Done"
- [ ] Add webcam, video file, image, screen capture
- [ ] Real source health reflects actual MediaStream track state
- [ ] Placement modes show source correctly (texture on plane, on desk, etc.)
- [ ] Keying applies and updates shader in real-time
- [ ] No memory leaks when adding/removing sources
- [ ] Audio tracks correctly sync with video

---

## SYSTEM: Output Pipeline (output/*)

**Status:** WORKING (70%)

#### What Works
- ✅ WebRTC/WHIP publish (to single ingest endpoint)
- ✅ Capture to .webm (MediaRecorder)
- ✅ RTMP leg configuration (2 legs: satellite + normal per destination)
- ✅ Destination enable/disable
- ✅ Multi-leg fan-out (separate ffmpeg process per leg)
- ✅ Stream error handling (shows error message if publish fails)
- ✅ Public WHEP player (live.html)

#### What's Missing
- ❌ Local relay startup (requires manual ffmpeg + MediaMTX setup)
- ❌ Relay health monitoring
- ❌ Fallback/retry logic
- ❌ Output preview (composite of sources + graphics)
- ❌ HLS/DASH output
- ❌ Recording formats (H.264, ProRes)
- ❌ Transition effects (UI only)

#### Acceptance Criteria for "Done"
- [ ] WebRTC/WHIP publish works to configured endpoint
- [ ] RTMP fan-out reaches all armed legs (verify in logs)
- [ ] Capture .webm file is valid and playable
- [ ] No stream interruption when sources change
- [ ] Stream error shows root cause (network, auth, endpoint unreachable)
- [ ] Can record + stream simultaneously
- [ ] Output preview shows live composite before broadcast

---

## SYSTEM: Scene Outliner & Layers

**Status:** WORKING (70%)

#### What Works
- ✅ Scene outliner shows layer list (from sceneNodes)
- ✅ Layer selection updates selectedLayerId
- ✅ Layer names display correctly
- ✅ Layer colors shown as dots

#### What's Missing
- ❌ No layer visibility toggle (eye icon)
- ❌ No layer lock (prevent accidental selection)
- ❌ No layer hierarchy/grouping beyond asset groups
- ⚠️ Layers read-only from engine; no rename in UI

#### Acceptance Criteria for "Done"
- [ ] Click layer to select; highlight in 3D
- [ ] Eye icon to toggle visibility per layer
- [ ] Lock icon to prevent selection of layer
- [ ] Right-click → rename layer
- [ ] Drag to reorder layers (affects Z-order in render)

---

## ACCEPTANCE CRITERIA SUMMARY

### By Component Priority

**Tier 1: Blocking Broadcasting**
- [ ] Timeline playback functional (play, pause, scrub)
- [ ] Output preview shows live composite
- [ ] Video file + image input on sources
- [ ] Broadcast graphics lower third (name straps)

**Tier 2: Professional Feature Set**
- [ ] Scene/layer composer (save/load scenes)
- [ ] Lighting controls (3-point studio setup)
- [ ] Audio mixer (faders, routing)
- [ ] Output relay auto-startup

**Tier 3: Polish**
- [ ] Material editing
- [ ] Workspace layout persistence
- [ ] Undo/redo history
- [ ] Performance optimization

---

*Last updated: June 14, 2026*
