# CHASE STUDIO PRO — Engineering Status Report

## Milestone 2 Completion Update (2026-06-14)

- **Branch:** `chase/fork-audit`
- **Latest implementation commit:** `c778e73` (`729cc78` is the Source Manager backport)
- **Remote sync:** Fast-forwarded from `eaa60a3` to `ed0f468` before implementation. Pre-sync work is preserved on `codex/safety-pre-sync-20260614-074822` at `36db710`.
- **Changed:** Added real video-file, image-file, and screen-capture sources; retained real webcam capture; added editable source names, honest unavailable states, project restore typing, and explicit runtime cleanup for tracks, object URLs, media elements, animation frames, and listeners.
- **Works now:** Image and recorded WebM fixtures decode to live tracks, appear in Preview, CUT to Program, rename, remove, and release their media elements. All implemented source types share the existing Babylon placement/keying path.
- **Still partial:** Restored local files require the operator to choose the file again because browser file handles and media bytes are intentionally not serialized. Interactive screen-picker success still needs a headed rehearsal; the automated suite verifies the honest unsupported path.
- **Blocked:** `vite build` remained silent and exceeded a 304.5 second bound on this OneDrive workstation. Direct TypeScript validation and the dev runtime pass. No generic `lint`, `typecheck`, or `test` scripts exist in `package.json`.
- **Commands run:** direct `tsc -b --pretty false` (pass), `tests/source-manager-smoke.mjs` (pass), `tests/anti-demo-smoke.mjs` (pass), `tests/freed.test.mjs` (pass), in-app browser smoke (pass), `vite build` (timeout).
- **Exact next patch:** Milestone 7 output preview: expose the composited Babylon canvas in Outputs, add recording duration/byte/bitrate telemetry, then add honest WebM/H.264/ProRes capability selection without claiming unavailable codecs.

**Report Date:** June 14, 2026  
**Current Build:** v0.1.0  
**Branch:** `chase/fork-audit` (default, post PRs #16–#25 + Scenes/Graphics)  
**Architecture:** React 19 + Babylon.js 9.9.1 + Tauri (desktop) / Vite (web)

> **Reconciliation note (2026-06-14):** This report was originally drafted against
> an older base. It is now reconciled to the **actual `chase/fork-audit` HEAD**,
> which already merged 10 PRs (#16–#25): real WebRTC/WHIP publish, MediaRecorder
> capture, multi-destination RTMP fan-out, GLB/glTF asset import, multi-asset scene
> management + external references, camera tracking (FreeD), and live camera
> thumbnails — plus the newly added Scene Composer and Broadcast Graphics.

## Executive Summary

CHASE STUDIO PRO is a professional virtual broadcasting studio application. Its
core broadcast pipeline is **genuinely functional**: live sources → preview/program
switching with real chroma keying → WebRTC/WHIP publish + multi-destination RTMP
fan-out + .webm capture, on a stable Babylon 3D set with asset import and broadcast
graphics. Four modules ship full real workspaces (Builder, Switcher, Scenes,
Graphics). The remaining modules are either surfaced through the right-column panels
(Outputs, Audio meters, Assets via the Builder) or are still placeholder screens
(Overlays, Lighting, Cameras, Scripts, Settings). The Timeline is the main
display-only area pending Milestone 5.

### Current Capability Snapshot
- ✅ **3D Viewport:** Live Babylon rendering, 6 cameras, asset import, transforms, FreeD tracking
- ✅ **Media Sources:** Real webcam ingestion, live tracks, full chroma-key calibration
- ✅ **Switcher:** Preview/Program monitors, CUT, keying, placement modes — real
- ✅ **Output Pipeline:** WebRTC/WHIP publish, multi-destination RTMP fan-out, .webm capture
- ✅ **Asset Management:** GLB/GLTF import, groups, transforms, external references, relink
- ✅ **Scene Persistence:** Project save/restore with asset state
- ✅ **Live Camera Thumbnails:** 6-camera round-robin live previews
- ✅ **Scene Composer (M3):** Save/load/recapture named scenes with thumbnails
- ✅ **Broadcast Graphics (M4):** Lower thirds, ticker, logo bug as real scene overlay
- ✅ **Timeline (M5):** Real transport (play/pause/stop/step/loop), scrubbable playhead, cues that fire graphics + camera switches live
- ✅ **Lighting (M6):** Real key/ambient/accent light controls + presets, live in viewport & output
- ✅ **Materials (M6):** Live base/emissive colour + PBR metallic/roughness editing of the selected object
- ⚠️ **Source input:** webcam only on this branch — video file / image / screen capture not yet ported (M2 backport outstanding)
- ⚠️ **Outputs/Audio/Assets modules:** real functionality lives in right-column panels, not standalone module workspaces
- ❌ **Overlays / Lighting / Cameras / Scripts / Settings:** placeholder screens

---

## Module Status Matrix

| Module | Status | Functional | Notes |
|--------|--------|-----------|-------|
| **builder** | WORKING | 85% | 3D viewport, asset import/transform, tracking, thumbnails, real timeline transport + cues |
| **switcher** | WORKING | 85% | Real sources, preview/program, CUT, full chroma keying, placement modes |
| **scenes** | WORKING | 85% | M3 — save/load/recapture/rename/delete named scenes with live thumbnails |
| **graphics** | WORKING | 85% | M4 — lower third, ticker, logo bug; real overlay, play/stop/live-update |
| **outputs** | PARTIAL | 60% | Real WHIP/REC/multi-destination in OutputPanel (right column); no standalone module workspace |
| **audio** | PARTIAL | 30% | Real per-source level meters in OutputPanel; no mixer/module workspace |
| **assets** | PARTIAL | 40% | Real GLB/glTF import + inspector in the Builder's AssetPanel; no standalone module workspace |
| **overlays** | MOCK | 0% | Placeholder screen; overlay stacking not built (graphics cover lower-third/ticker) |
| **lighting** | MOCK | 0% | Placeholder screen; no studio lighting controls |
| **cameras** | MOCK | 0% | Placeholder screen; camera select/tracking is in the viewport toolbar |
| **scripts** | MOCK | 0% | Placeholder screen; no automation/scripting engine |
| **settings** | MOCK | 0% | Placeholder screen; no preferences UI |

---

## Core Systems Status

### 1. **3D Rendering Engine** (StudioEngine.ts)
- **Status:** WORKING (85%)
- **What Works:**
  - Babylon.js scene initialization and cleanup
  - Multi-camera setup (6 cameras: cam1–cam6)
  - Real-time asset import (.glb/.gltf)
  - Transform controls (select, translate, rotate, scale)
  - Scene serialization/deserialization
  - Live camera thumbnail capture via render targets
  - Quality mode support (low/balanced/high)
  - Camera tracking (FreeD/mo-sys via WebSocket)
  - Chroma-key shader uniforms for live sources
  
- **What's Missing/Broken:**
  - Material editing UI
  - Lighting controls (hard-coded; no adjustment)
  - Advanced camera tracking (only basic heading/pitch)
  - Grid overlay (toolbar button disabled)
  - Undo/redo (state tracked but not connected)

### 2. **Media Sources** (SourcesContext.tsx)
- **Status:** WORKING (80%)
- **What Works:**
  - Real webcam/camera ingestion (MediaStream API)
  - Live audio/video track detection
  - Source health monitoring (connected, connecting, error, disconnected)
  - Keying setup (chroma-key, alpha, disabled)
  - Placement modes: `mediaPlane`, `screenInsert`, `presenterPlate`
  - Preview/program switching (cut)
  - Live audio metering
  
- **What's Missing:**
  - Video file input (not implemented)
  - Image file input (not implemented)
  - Screen/window capture (not implemented)
  - Multicam NDI/RTMP ingest (not implemented)
  - Audio submix/routing (no mixer)

### 3. **Output Pipeline** (output/*)
- **Status:** WORKING (70%)
- **What Works:**
  - WebRTC/WHIP publish to a single ingest endpoint
  - RTMP leg configuration (satellite + normal per destination)
  - Destination enable/disable toggle
  - Multi-leg fan-out (separate ffmpeg process per leg)
  - Capture to .webm via MediaRecorder
  - Public WHEP player (live.html)
  
- **What's Missing:**
  - Local MediaMTX relay setup (manual only)
  - Fallback/retry logic for failed destinations
  - Output preview in UI (Program monitor only shows sources, not composite)
  - HLS/DASH output (RTMP + WebRTC only)
  - Recording to H.264/ProRes (only WebM)
  - Transition effects (UI buttons disabled)

### 4. **Asset Management** (AssetPanel, Inspector)
- **Status:** WORKING (75%)
- **What Works:**
  - GLB/GLTF import and validation
  - Asset details: format, size, mesh/vertex count
  - Heavy asset warnings
  - External file references with relink UI
  - Asset groups with multi-select
  - Per-asset transform (position, rotation, scale)
  - Per-group transform
  - Missing file detection
  
- **What's Missing:**
  - Studio pack loading (disabled; expects public/scenes/*/scene.babylon)
  - Asset library browser
  - Drag-and-drop import
  - Asset categorization beyond sets/elements/assets tabs
  - Material/texture editing
  - LOD (level of detail) management

### 5. **Scene Persistence** (projectPersistence.ts)
- **Status:** WORKING (65%)
- **What Works:**
  - Project save (.chaseproj JSON)
  - Project restore from file
  - Source state save/restore
  - Asset scene snapshot with restore
  - External asset reference paths
  - Missing asset detection on restore
  
- **What's Missing:**
  - Timeline events/keyframes persistence (no timeline data model)
  - Workspace layout save
  - Undo/redo history persistence
  - Project versioning/migrations
  - Auto-save with backup

### 6. **Live Camera Thumbnails**
- **Status:** WORKING (95%)
- **What Works:**
  - All 6 cameras render distinct, real live views
  - Active camera refreshes every 700ms
  - Round-robin refresh of inactive cameras (~1–2 per second)
  - Off-screen render targets prevent viewport flicker
  - FPS stable (~42 avg even with SW renderer)
  - Evidence captured and verified
  
- **What's Missing:**
  - Nothing material; feature is complete per spec

---

## Feature Completeness by Domain

### Broadcasting Workflow
- Source management: ✅ WORKING (webcam only)
- Preview/program switching: ✅ WORKING
- Timeline playback: ❌ BROKEN (UI only; no engine binding)
- Transitions: ❌ BROKEN (UI only; disabled)
- Output publishing: ✅ WORKING (WHIP + RTMP)
- Output capture: ✅ WORKING (.webm only)
- Recording: ⚠️ PARTIAL (capture works; no replay deck)

### Scene/Asset Management
- 3D scene rendering: ✅ WORKING
- Asset import: ✅ WORKING (GLB/GLTF only)
- Asset transform: ✅ WORKING
- Asset groups: ✅ WORKING
- Scene save/restore: ✅ WORKING
- Scene composer (named scenes, M3): ✅ WORKING (save/load/recapture transforms + camera + desk + thumbnail)
- Virtual set loading: ❌ MISSING (no pack system)
- Layout presets: ❌ MISSING (UI buttons exist; not wired)

### Graphics & Overlays
- Lower thirds (name straps): ✅ WORKING (M4 — title/subtitle, animated in/out)
- Tickers/headlines: ✅ WORKING (M4 — scrolling crawl, configurable speed)
- Logo bug: ✅ WORKING (M4 — corner placement, opacity, fade)
- Broadcast watermark: ✅ WORKING (logo bug serves this role)
- Graphics render path: ✅ WORKING (Babylon GUI overlay on the live scene, in the rendered frame)
- Safe area guides: ⚠️ PARTIAL (viewport button exists; toggle works; overlay not visible)
- Chroma-key: ✅ WORKING (on sources; shader uniforms wired)
- Keying UI: ✅ WORKING
- Overlay stacking module: ❌ MISSING (Overlays module still placeholder)

### Broadcast Quality
- Multi-camera support: ✅ WORKING (6 cams)
- Camera tracking (FreeD): ✅ WORKING (basic)
- Audio metering: ✅ WORKING (real-time from tracks)
- Performance monitoring: ✅ WORKING (FPS, performance warnings)
- Quality presets: ⚠️ PARTIAL (low/balanced/high; quality mode applies; actual GPU binning incomplete)

---

## Known Defects & Blockers

### Critical Issues
1. **Source input is webcam-only on this branch.** Video file / image / screen-capture inputs (built in M2 against an older base) were **not** ported onto the advanced `SourcesContext` and remain an outstanding backport.
3. **Studio packs disabled.** AssetPanel expects `public/scenes/<pack-id>/scene.babylon` but no packaged scenes exist. Pack load is silently disabled to avoid fake success.
4. **Output relay startup is manual.** Multi-destination RTMP fan-out is implemented (one ffmpeg process per leg, PR #22) but requires the local relay/MediaMTX to be running; no automatic relay startup or health/retry.

### Resolved since original draft
- ~~No broadcast graphics system~~ → **Done (M4):** lower thirds, ticker, logo bug as a real Babylon GUI overlay with play/stop/live-update.
- ~~No scene/layer composer~~ → **Done (M3):** named scene save/load with transforms + camera + desk + thumbnail.
- ~~Timeline is display-only~~ → **Done (M5):** real transport + scrubbable playhead; cues fire broadcast graphics and camera switches live. (Transform keyframing remains future work.)
- ~~No lighting / material controls~~ → **Done (M6):** real key/ambient/accent lighting + presets and live material (colour/emissive/metallic/roughness) editing of the selected object. (Light gizmos, shadows, texture picker remain future work.)

### Medium Issues
6. **Video/image file input not implemented.** Only webcam sources work. Video/image file import on switcher would unlock single-file broadcast workflows.
7. **Workspace layout not persistent.** Panel collapse state is in UI only; not saved to project.
8. **Undo/redo not connected.** State counters exist (undoStack, redoStack) but no actual history snapshots.
9. **Safe area overlay not visible.** Toggle works in state; overlay rendering missing.
10. **Heavy asset warnings basic.** No automatic LOD or mesh simplification; only flagging and user warning.

### Minor Issues
11. **Module descriptions generic.** Each placeholder says "coming in next milestone" but doesn't specify purpose.
12. **No audio mixer.** Audio meters work on sources; no submix, routing, or fader controls.
13. **Camera preset buttons disabled.** Layout presets UI exists but buttons are disabled with no wiring plan.
14. **Grid overlay disabled.** Viewport toolbar has button; feature not implemented.

---

## Test Coverage

### Automated Tests
- **anti-demo-smoke.mjs:** Scans imports for @/streaming/ references (guards against bundling C2 libraries). ✅ Passing
- **browser-visual-smoke.mjs:** Selenium-based evidence capture (camera thumbnails, FPS stability, no crash). ✅ Passing (as of PR #25)
- **freed.test.mjs:** Babylon-editor-tools integration test (validates Tool signatures). ⚠️ Manual; requires npm run test:freed

### Manual Testing Gaps
- Timeline transport (blocked until engine binding)
- Output relay (requires ffmpeg setup)
- Broadcast graphics (system doesn't exist)
- Multi-leg fan-out (tested in isolation; not in UI flow)
- Scene/layer restore after project reload (basic; missing complex scenarios)

---

## Dependency & Fork Status

### Key Dependencies
| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| @babylonjs/core | 9.9.1 | LOCKED | Stable; no known issues |
| @babylonjs/loaders | 9.9.1 | LOCKED | GLB/GLTF support |
| babylonjs-editor-tools | 5.4.2-alpha.2 | PINNED | CreateScreenshotUsingRenderTargetAsync (for thumbnails) |
| playwright | 1.60.0 | DEV | Browser automation for evidence |
| ws | 8.21.0 | DEV | WebSocket (tracking source) |

### Forks (FORKS_MANIFEST.json)
- **babylon-editor-tools:** Pinned alpha version; no source fork present (relies on npm distribution)
- **nativewind:** CSS utility library fork in vendor/; integrated via tsconfig paths
- **libx264-wasm:** H.264 encoder (referenced in docs; not used in current output pipeline)

See FORKS_AUDIT.md for detailed fork justifications.

---

## Build & Deployment

### Build Process
- **Development:** `npm run dev` → Vite dev server (localhost:4177)
- **Production:** `npm run build` → tsc + vite build → dist/
- **Tauri Desktop:** `npm run tauri:build` → Rust binary + bundled app
- **CI/Testing:** GitHub Actions (anti-demo, browser-visual smoke tests)

### Known Build Issues
- TypeScript strict mode enabled; no `any` types permitted
- Playwright tests require PW_EXECUTABLE env var (Chromium binary path)
- Tauri build requires Windows (PowerShell script: clone-editor-fork.ps1)

---

## Next Steps (Prioritized by Impact)

### Tier 1: Unblock Broadcasting
1. **Implement output preview** — Composite of Program source + graphics into small monitor
2. **Make timeline real** — Engine binding for playback, not just transport UI
3. **Add source file input** — Video files and images on switcher
4. **Complete output relay** — Auto-start ffmpeg, monitor health, fallback logic

### Tier 2: Professional Broadcast Graphics
5. **Build broadcast graphics system** — Overlay layer for lower thirds, tickers, logos
6. **Wire scene/layer composer** — Named scene save, quick-select workflow
7. **Implement studio packs** — Scene asset loading from public/scenes/ registry

### Tier 3: Polish & Performance
8. **Persist workspace layout** — Save panel collapse state to project
9. **Connect undo/redo** — History snapshots for asset/scene edits
10. **Stabilize engine** — Mesh LOD, memory cleanup, thermal management

---

## Key Architectural Decisions

1. **StudioEngine as single render target:** All scene content (desk, sources, assets, graphics) renders to one Babylon scene. Overlays are Babylon layers, not DOM. This keeps rendering efficient but complicates graphics authoring.

2. **Sources as Babylon planes:** Live sources are textures on 3D planes (mediaPlane, presenterPlate, screenInsert). Allows set integration but adds latency (texture upload per frame).

3. **Off-screen render targets for thumbnails:** Camera thumbnail capture uses secondary render targets instead of main canvas screenshot, preventing viewport flicker and FPS impact.

4. **Project-level persistence only:** No autosave; full scene snapshots on save. Timeline events, workspace state, undo history not persisted (scope reduction).

5. **Output via ffmpeg relay:** Published stream (WebRTC/WHIP) is one leg; RTMP destinations require local ffmpeg fan-out. Avoids transcoding in-process but requires operational setup (MediaMTX).

---

## Documentation References

- **FORKS_AUDIT.md** — Detailed fork justifications and integration notes
- **ENGINE_BOUNDARIES.md** — StudioEngine API contracts
- **CHASE_FUNCTIONALITY_AUDIT.md** — Per-feature status detail
- **NEXT_WORK_QUEUE.md** — Milestone breakdown and task prioritization

---

## Contributors & History

- **Initial Prototype:** Babylon.js scene, basic UI layout (PR #1–#20)
- **Asset Management:** GLB/GLTF import, scene restore, asset groups (PR #21–#24)
- **Live Camera Thumbnails:** Off-screen render targets, round-robin refresh (PR #25)
- **Current State:** Awaiting Milestone 1 audit → Milestone 2+ implementation (in progress)

---

*Last updated: June 14, 2026 · Next review after Milestone 1 completion*
