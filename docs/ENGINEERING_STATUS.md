# CHASE STUDIO PRO — Engineering Status Report

**Report Date:** June 14, 2026  
**Current Build:** v0.1.0  
**Architecture:** React 19 + Babylon.js 9.9.1 + Tauri (desktop) / Vite (web)

## Executive Summary

CHASE STUDIO PRO is a professional virtual broadcasting studio application. The codebase currently exists in a **hybrid state**: core systems (3D engine, media sources, output streaming) are partially wired and functional, but 11 of 12 modules present only placeholder screens or minimal mock implementations. The application requires substantial work to transform from a prototype UI into a fully functional professional broadcasting tool.

### Current Capability Snapshot
- ✅ **3D Viewport:** Live Babylon.js rendering with multi-camera support and real asset import
- ✅ **Media Sources:** Real webcam ingestion, live audio/video tracks, chroma-key controls
- ✅ **Output Pipeline:** WebRTC/WHIP streaming to destinations, local capture to .webm
- ✅ **Asset Management:** GLB/GLTF import, asset groups, transform controls, external file references
- ✅ **Scene Persistence:** Project save/restore with asset state
- ✅ **Live Camera Thumbnails:** 6-camera round-robin rendering with per-camera live previews
- ⚠️ **Switcher Module:** Functional sources/preview/program but limited placement modes
- ❌ **11 Other Modules:** Placeholder screens ("coming in next milestone")
- ❌ **Timeline:** Display-only; transport/playback controls disabled
- ❌ **Broadcast Graphics:** No lower thirds, tickers, name straps, or overlay system
- ❌ **Scene/Layer Composer:** No scene save/load workflow
- ❌ **Broadcasting Destinations:** RTMP leg routing wired but output relay incomplete

---

## Module Status Matrix

| Module | Status | Functional | Notes |
|--------|--------|-----------|-------|
| **builder** | PARTIAL | 50% | 3D viewport works; asset import/transform works; timeline display-only |
| **switcher** | WORKING | 85% | Sources, preview/program monitors work; limited placement modes |
| **scenes** | MOCK | 0% | Placeholder screen only |
| **assets** | MOCK | 0% | Placeholder screen; real import is in AssetPanel (builder) |
| **graphics** | MOCK | 0% | Placeholder screen; no overlay/graphics system exists |
| **overlays** | MOCK | 0% | Placeholder screen; no overlay stacking |
| **lighting** | MOCK | 0% | Placeholder screen; no studio lighting controls |
| **cameras** | MOCK | 0% | Placeholder screen; camera setup is in viewport toolbar |
| **audio** | MOCK | 0% | Placeholder screen; audio meters exist in OutputPanel but no mixer |
| **scripts** | MOCK | 0% | Placeholder screen; no automation/scripting engine |
| **outputs** | MOCK | 0% | Placeholder screen; real output config is in OutputPanel |
| **settings** | MOCK | 0% | Placeholder screen; no preferences/settings UI |

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
- Virtual set loading: ❌ MISSING (no pack system)
- Layout presets: ❌ MISSING (UI buttons exist; not wired)

### Graphics & Overlays
- Lower thirds (name straps): ❌ MISSING
- Tickers/headlines: ❌ MISSING
- Logo bug: ❌ MISSING
- Broadcast watermark: ❌ MISSING
- Safe area guides: ⚠️ PARTIAL (viewport button exists; toggle works; overlay not visible)
- Chroma-key: ✅ WORKING (on sources; shader uniforms wired)
- Keying UI: ✅ WORKING

### Broadcast Quality
- Multi-camera support: ✅ WORKING (6 cams)
- Camera tracking (FreeD): ✅ WORKING (basic)
- Audio metering: ✅ WORKING (real-time from tracks)
- Performance monitoring: ✅ WORKING (FPS, performance warnings)
- Quality presets: ⚠️ PARTIAL (low/balanced/high; quality mode applies; actual GPU binning incomplete)

---

## Known Defects & Blockers

### Critical Issues
1. **Timeline is display-only.** Transport buttons (play, pause, skip) are disabled. No actual playback engine exists. Keyframe editor is non-functional.
2. **No broadcast graphics system.** Lower thirds, tickers, and overlays are completely absent. Would require dedicated Babylon overlay layer + UI controls.
3. **Studio packs disabled.** AssetPanel expects `public/scenes/<pack-id>/scene.babylon` but no packaged scenes exist. Pack load is silently disabled to avoid fake success.
4. **Output relay incomplete.** Destination RTMP legs are configured but the local ffmpeg fan-out process is manual; no automatic relay startup.
5. **No scene/layer composer.** Scenes module is a placeholder. No workflow to save/load named scene configurations beyond full project persistence.

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
