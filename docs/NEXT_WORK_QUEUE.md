# CHASE STUDIO PRO — Next Work Queue & Milestone Breakdown

**Planning Period:** June 14 – December 31, 2026  
## Resume Point (2026-06-15)

- **Branch:** `chase/fork-audit`
- **Milestones complete:** M1 (audit) · M2 (source manager) · M3 (scenes) · M4 (graphics) · M5 (timeline) · M6 (lighting/materials) · M7 (output preview + recording) · M8 (fork wiring audit) · **M9 (performance and stress evidence)**.
- **M2 backport:** COMPLETE at `729cc78`; real webcam, video file, image, and screen source paths are wired to Preview/Program and the Babylon scene.
- **M7:** Composite output preview, recording telemetry, WebM, capability-gated native H.264/MP4. ProRes honestly unavailable (needs native ffmpeg bridge).
- **M8 (this pass):** Verified all 11 forks against real code — 2 ACTIVE (npm Babylon + editor-tools), 2 EXTERNAL (MediaMTX + gstreamer via relay/ffmpeg), 7 REFERENCE-ONLY. No GPL code linked. `@babylonjs/materials` retained deliberately for editor-tools `.babylon` pack loading (documented, not pruned). See `FORKS_AUDIT.md` → "Milestone 8 — Fork Wiring Verification" and enriched `FORKS_MANIFEST.json` (`wiringStatus`/`verifiedUsage`).
- **M9:** Playwright stress coverage and `docs/PERFORMANCE_REPORT.md` are committed at `13ceeab`; the captured software-WebGL run remained stable with flat heap use and no page or console errors.
- **Verification:** `tsc -b`, anti-demo smoke, source-manager smoke, FreeD regression, in-app browser UI smoke, production Vite build, optimized Tauri release build, and Windows launch smoke pass.
- **Windows artifact:** NSIS x64 installer built successfully at `src-tauri/target/release/bundle/nsis/CHASE Studio Pro_0.1.0_x64-setup.exe` (SHA-256 `B77826B345A882D45F39A2F9B2BF447297252E9F1D5919150C677DB377E88E85`).
- **Packaging inputs:** `src-tauri/Cargo.lock` and the generated Tauri icon set are committed so clean worktrees can reproduce the Windows installer.
- **Known release gap:** The installer is not code-signed yet; Windows may show an unknown-publisher warning.
- **Post-milestone hardening (done since M8):** revived all 6 placeholder module screens into real workspaces; asset/group delete (button + Delete key); graphic font selection; headset WebXR *preview* (relabelled — not broadcast AR); **real Web Audio mixer** (per-source fader/mute/solo + master into the recorded/streamed bus).
- **DONE — Broadcast AR (Zero Density-style):** world-anchored AR elements (card/3D-text/box/sphere/cylinder) in a new **AR module**, toggled on-air into the Program composite, locked to the set under FreeD tracking (no headset). Engine `upsertArElement`/`removeArElement`; `ArContext` + `ArSync` persist/replay.
- **DONE — AR floor anchoring + data templates:** "Anchor to studio floor" grounds elements (base on y=0) with a contact ring; AR Data Cards have Plain/Stat/Score Bug/Live Clock templates with editable fields; the Live Clock card redraws every second on air. Future: snap to a tracked floor plane from the camera feed, and external data feeds (live scores/stats).
- **Next:** M10 final polish, native Tauri/ffmpeg ProRes bridge, code signing, and a signed-installer desktop recording rehearsal.

**Target Delivery:** Production-ready virtual broadcasting studio  
**Approach:** Milestone-based; each completes a distinct value delivery

---

## MILESTONE 1: Remove Mock Screens & Audit Complete (CURRENT)

**Objective:** Eliminate all "Coming Soon" placeholders; establish engineering baseline for development.

**Acceptance Criteria:**
- ✅ All 12 modules classified (WORKING/PARTIAL/MOCK/BROKEN/MISSING)
- ✅ 3 audit documents created (ENGINEERING_STATUS, CHASE_FUNCTIONALITY_AUDIT, NEXT_WORK_QUEUE)
- ✅ Known defects documented and prioritized
- ⚠️ No code changes; audit only

**Tasks:**
1. ✅ Read all app entry points, contexts, components
2. ✅ Classify module status (builder, switcher, scenes, assets, graphics, overlays, lighting, cameras, audio, scripts, outputs, settings)
3. ✅ Create ENGINEERING_STATUS.md (system overview, known defects, architecture decisions)
4. ✅ Create CHASE_FUNCTIONALITY_AUDIT.md (per-feature status, acceptance criteria)
5. ✅ Create NEXT_WORK_QUEUE.md (this file; prioritized task breakdown)

**Deliverables:**
- docs/ENGINEERING_STATUS.md ✅
- docs/CHASE_FUNCTIONALITY_AUDIT.md ✅
- docs/NEXT_WORK_QUEUE.md ✅
- Evidence: Code excerpts in each audit doc, classified features

**Timeline:** 6/14 – 6/15 (1 day audit)

---

## MILESTONE 2: Real Source Input (Video Files, Images, Screen Capture) - COMPLETE

**Objective:** Make source manager support all broadcast input types, not just webcam.

**Acceptance Criteria:**
- [x] Video file (MP4, MOV, WebM) file-picker ingestion to sources
- [x] Image file (PNG, JPEG, WebP, GIF, BMP) as a static canvas-backed source
- [x] Screen/window capture via getDisplayMedia
- [x] All input types appear in the source list with correct type badges
- [x] Placement modes share the real stream path (mediaPlane, screenInsert, presenterPlate)
- [x] Keying settings apply through the existing Program shader path
- [x] Tracks, listeners, object URLs, elements, and frame loops are released on remove
- [x] Evidence: `tests/source-manager-smoke.mjs` verifies decoded video/image frames and lifecycle
- [ ] Stress evidence with 10+ simultaneous file sources (deferred to M9 performance testing)

**Key Changes:**
1. **SourcesContext.tsx**
   - Add `addVideoFileSource(file)` → validate video MIME, create HTMLVideoElement, stream from canvas
   - Add `addImageFileSource(file)` → validate image MIME, create canvas texture, loop/hold
   - Add `addScreenSource()` → call getDisplayMedia, stream to context
   - Update source type union (webcam | video | image | screen)

2. **SwitcherPanel.tsx**
   - Add "Add Video File" and "Add Image" buttons in source header
   - File picker with appropriate MIME filters
   - Visual indicator for each source type (camera icon, filmstrip icon, image icon, screen icon)

3. **Engine integration**
   - Update mediaPlane texture assignment to handle HTMLVideoElement, canvas, or image
   - Ensure seek/pause/play works on video sources
   - Handle image display (full frame, scaled, tiled options)

**Testing:**
- Add 5+ video sources; verify no playback stutter
- Image source should display at full resolution (no scaling artifacts)
- Screen capture should refresh at monitor frame rate (60 Hz)

**Timeline:** 1.5 weeks

---

## MILESTONE 3: Scene/Layer Composer (Save & Load Scenes)

**Objective:** Enable named scene snapshots; quick-select workflow for broadcast scenes.

**Acceptance Criteria:**
- [ ] Scenes module workspace (no longer "coming soon" placeholder)
- [ ] "Create Scene" button → name dialog → saves asset positions, groups, camera, lighting
- [ ] Scene thumbnail (320×180 preview from 3D viewport)
- [ ] "Load Scene" action restores all saved state
- [ ] Scene list with grid view (thumbnails + names)
- [ ] Scenes persist in project file
- [ ] Scene versioning (timestamp, author, description optional)
- [ ] Evidence: smoke test loading 5 scenes without artifacts

**Key Changes:**
1. **Create SceneSnapshot type** (src/engine/types.ts)
   ```typescript
   interface SceneSnapshot {
     id: string;
     name: string;
     timestamp: number;
     thumbnail: string; // data:image/png
     assets: ImportedAsset[];
     groups: AssetGroup[];
     cameraConfig: { id: string; position; rotation; fov };
     lightingPreset: string;
   }
   ```

2. **Update StudioEngine**
   - Add `captureSceneSnapshot(name): SceneSnapshot`
   - Add `loadSceneSnapshot(snapshot): { restored: number; missing: number }`
   - Capture thumbnail same as camera thumbnail (off-screen render target)

3. **New Scenes module UI** (src/components/shell/ScenesPanel.tsx)
   - Scene browser (grid of thumbnails)
   - Create scene button
   - Load scene button (context menu)
   - Rename/delete scene
   - Scene details panel (name, timestamp, asset count, description)

4. **Update projectPersistence**
   - Add sceneSnapshots array to project file
   - Save/restore scene list on project save/open

**Testing:**
- Create scene with 10+ assets; load it; verify all assets present and positioned correctly
- Load scene; modify assets; create new scene; load first scene; verify first scene reverted

**Timeline:** 2 weeks

---

## MILESTONE 4: Broadcast Graphics System (Lower Thirds, Tickers, Logos)

**Objective:** Add professional broadcast graphics layer (overlays) to program output.

**Acceptance Criteria:**
- [ ] Graphics module workspace
- [ ] Lower third template: name/title/occupation fields + auto-animation (slide in 3s, hold, slide out 3s)
- [ ] Ticker/headline: scrolling text bar at bottom + configurable speed
- [ ] Logo bug: corner placement (TL, TR, BL, BR), opacity, scale
- [ ] Graphics render as Babylon overlay (not DOM)
- [ ] Graphics appear in Program monitor and broadcast stream
- [ ] Graphics can be toggled on/off
- [ ] Graphics settings persist in project
- [ ] Evidence: screenshot showing lower third + ticker + logo on live program feed

**Key Changes:**
1. **Graphics system** (src/graphics/graphics.ts)
   - New GfxLayer class (Babylon DynamicTexture for graphics rendering)
   - Support for text rendering (fonts, sizing, color, shadow)
   - Support for animation (keyframe: position, scale, opacity)
   - Z-order management (multiple graphics stacked)

2. **UI Components**
   - GraphicsPanel (graphics module)
   - LowerThirdEditor (name, title, color, font, animation duration)
   - TickerEditor (text, speed, direction, background color/opacity)
   - LogoBugEditor (image, corner, scale, opacity)
   - GraphicsPreview (real-time preview as user edits)

3. **Engine integration** (StudioEngine.ts)
   - Add `gfxLayer: Babylon.DynamicTexture`
   - Render graphics on top of scene before output
   - Update graphics uniforms per frame (animation, timecode sync)

4. **Output integration**
   - Graphics texture included in canvas capture (MediaRecorder)
   - Graphics texture included in WebRTC stream

**Testing:**
- Create lower third; verify animation timing (3s in, 3s out)
- Create ticker; verify text scrolls at specified speed
- Toggle graphics on/off; verify state persists in project
- Record broadcast with graphics; verify graphics visible in playback

**Timeline:** 3 weeks

---

## MILESTONE 5: Timeline Real & Playback (Transport + Scrubbing)

**Objective:** Make timeline functional; bind playback to 3D scene state.

**Acceptance Criteria:**
- [ ] Play button starts playback; timecode advances in real-time
- [ ] Pause button pauses playback
- [ ] Scrubbing (drag on timeline) updates timecode + 3D scene frame
- [ ] Keyframes editable (right-click to add, drag to move)
- [ ] Keyframe animation (lerp between asset transforms)
- [ ] Timeline events (graphics cue: "show lower third at 00:15:00", etc.)
- [ ] Recording timestamp synced to timeline timecode
- [ ] Evidence: video showing timeline playback with assets animating

**Key Changes:**
1. **Timeline data model** (src/timeline/timeline.ts)
   ```typescript
   interface TimelineEvent {
     type: 'keyframe' | 'graphic' | 'transition' | 'cue';
     timecode: Timecode; // 00:10:12:00
     assetId?: string;
     data: any; // transform, graphic settings, transition type, etc.
   }
   
   interface Timeline {
     duration: Timecode;
     fps: number; // 23.976 or 30
     events: TimelineEvent[];
   }
   ```

2. **Timeline engine** (StudioEngine.ts)
   - Add `playbackLoop()` → update timecode, evaluate keyframes, update asset transforms
   - Add `scrubTo(timecode)` → jump to specific time, evaluate state at that time
   - Add `recordKeyframe(assetId, transform, timecode)` → add to timeline

3. **UI Components** (Timeline.tsx refactor)
   - Playback controls enabled (play, pause, skip)
   - Scrubbing (drag playhead)
   - Keyframe editor (right-click → add; drag to move; delete)
   - Timecode display (updates during playback)
   - Event markers (graphics cues, transitions)

4. **Persistence**
   - Save timeline events in project file
   - Restore timeline on project open

**Testing:**
- Create keyframe animation (move asset from A to B over 5 seconds); play it back
- Pause playback; scrub timeline; verify asset position updates
- Record while playing back timeline; verify recording includes animation
- Add graphics cue at 10s; play; verify graphics trigger at correct time

**Timeline:** 4 weeks

---

## MILESTONE 6: Stabilize 3D Engine (Lighting, Materials, Performance)

**Objective:** Harden 3D rendering; add professional lighting and material controls.

**Acceptance Criteria:**
- [ ] Lighting controls: 3-point setup (key, fill, back) with intensity/color sliders
- [ ] Lighting presets (Broadcast, Studio, Natural, Stage, Custom)
- [ ] Material editing: texture picker, metallic/roughness sliders, color adjustment
- [ ] Engine memory stable (no leaks with 100+ assets, 1hr+ runtime)
- [ ] Safe area guides visible in viewport (2.45:1 broadcast, 4:3 title)
- [ ] Transform gizmos (visual 3D handles for translate/rotate/scale)
- [ ] Asset LOD (automatic mesh simplification for distant assets)
- [ ] GPU profiling (shader complexity, draw calls)
- [ ] Evidence: performance metrics at 100+ assets, stable FPS >30

**Key Changes:**
1. **Lighting system** (src/engine/lighting.ts)
   - LightingSetup class: 3 lights (key, fill, back) + environment
   - LightPreset struct: intensity, color, position for each light
   - Add lighting to Inspector (Lighting tab)
   - Real-time preview

2. **Material system** (src/engine/materials.ts)
   - MaterialEditor: texture picker (drag-drop), PBR sliders
   - Support for: albedo, normal, metallic, roughness, emission
   - Material presets (Plastic, Metal, Cloth, Skin, etc.)

3. **Viewport overlays**
   - Safe area guides: draw semi-transparent overlays at 2.45:1 and 4:3
   - Enable/disable via viewport button

4. **Transform gizmos**
   - Visual 3D handles (arrows for translate, arcs for rotate, cubes for scale)
   - Click-and-drag interaction
   - Per-gizmo visibility (show only active transform mode)

5. **Performance optimization**
   - LOD (level-of-detail): auto-simplify meshes >50k verts when camera distance >10m
   - Culling: don't render meshes outside camera frustum
   - Instancing: share material data for duplicate models
   - Shader compilation: cache compiled shaders

**Testing:**
- Load 100 assets; measure FPS (expect >30 on balanced quality)
- Toggle lighting; verify all lights affect scene
- Adjust material metallic slider; verify surface reflection changes
- Enable safe area guides; verify overlays visible and correct aspect ratio
- Run for 1 hour; measure memory (expect <500 MB stable)

**Timeline:** 4 weeks

---

## MILESTONE 7: Output Preview & Recording Formats

**Objective:** Add composite output preview; support H.264 + ProRes recording.

**Acceptance Criteria:**
- [ ] Output preview monitor in OutputPanel shows composite of Program source + graphics
- [ ] Preview updates in real-time during broadcast
- [ ] Recording format options: WebM (default), H.264 (via ffmpeg), ProRes (via ffmpeg if available)
- [ ] Recording file size/duration displayed during capture
- [ ] Recorded file playable in standard player (no proprietary codec)
- [ ] Evidence: preview screenshot showing sources + graphics; recorded file playback

**Key Changes:**
1. **Output preview** (OutputPanel.tsx)
   - New `OutputPreview` component
   - Renders canvas: texture of Program source + graphics overlay
   - Updates every frame (60 Hz)
   - Shows bitrate info

2. **Recording formats** (src/output/recording.ts)
   - Add format selector: WebM, H.264, ProRes
   - If ffmpeg available: spawn ffmpeg process with appropriate codec
   - If ffmpeg not available: fall back to WebM
   - Display codec info + bitrate to user

3. **Recording metadata**
   - File size in bytes
   - Duration (current time / total length)
   - Bitrate (kbps) calculated from file size + time
   - Show progress bar

**Testing:**
- Start recording; verify preview updates live
- Select H.264 format; record 30s clip; play in VLC (should work)
- Select ProRes format (if ffmpeg available); record; verify file codec
- Monitor file size growth during recording

**Timeline:** 2 weeks

---

## MILESTONE 8: Audit & Wire Forks/Libraries — COMPLETE (2026-06-14)

**Objective:** Document and integrate all external forks; identify and unblock dependencies.

**Acceptance Criteria:**
- [x] FORKS_MANIFEST.json complete (all 11 forks listed; enriched with `wiringStatus` + `verifiedUsage`, `lastChecked` 2026-06-14)
- [x] FORKS_AUDIT.md updated ("Milestone 8 — Fork Wiring Verification" table, grounded in real imports/external calls)
- [x] All forks classified: 2 ACTIVE (npm) · 2 EXTERNAL (MediaMTX + gstreamer via relay/ffmpeg) · 7 REFERENCE-ONLY; GPL forks (CasparCG, OBS) kept external/reference-only — no code linked
- [x] No unused forks; `@babylonjs/materials` retained deliberately for editor-tools `.babylon` pack loading (documented). No dead imports found in `src/`
- [x] Missing forks: none (all 11 present per MISSING_FORKS.md)
- [x] Evidence: enriched FORKS_MANIFEST.json + FORKS_AUDIT.md M8 section; verified with `tsc -b` clean + anti-demo smoke pass

**Key Tasks:**
1. **Inventory all forks** (src/, vendor/, node_modules/)
   - babylon-editor-tools (alpha.2; npm distribution)
   - nativewind (vendor/nativewind; CSS util library)
   - Any others in vendor/?

2. **Verify integration**
   - babylon-editor-tools: used in StudioEngine.ts for thumbnail capture ✅
   - nativewind: imported in CSS files or tsconfig paths?
   - Others: used in codebase or dead code?

3. **Update FORKS_MANIFEST.json**
   ```json
   {
     "forks": [
       { "name": "babylon-editor-tools", "version": "5.4.2-alpha.2", "source": "npm", "purpose": "CreateScreenshotUsingRenderTargetAsync for thumbnail capture", "status": "integrated", "blockers": [] },
       { "name": "nativewind", "version": "?", "source": "vendor/", "purpose": "CSS utility classes", "status": "vendored", "blockers": [] }
     ],
     "missing": []
   }
   ```

4. **Update FORKS_AUDIT.md**
   - Per fork: integration status, usage, performance impact, maintenance burden
   - Blockers: any forks preventing feature completion?
   - Recommendations: upgrade, replace, remove?

**Testing:**
- Build app; verify no missing import errors
- Run anti-demo smoke test; verify no C2-like fork dependencies
- Search codebase for unused imports from forks; remove

**Timeline:** 1 week

---

## MILESTONE 9: Performance & Stress Testing

**Objective:** Verify stability under realistic broadcast loads; create smoke tests.

**Acceptance Criteria:**
- [ ] Smoke test: 20+ concurrent sources, 1hr runtime, <500 MB memory, >30 FPS
- [ ] Smoke test: 100+ 3D assets, <500 MB memory, >25 FPS (low quality)
- [ ] Smoke test: timeline playback 10+ min, scrubbing responsive (<100ms latency)
- [ ] Smoke test: output relay multi-destination (5+ RTMP legs), all active simultaneously
- [ ] Smoke test: recording + streaming simultaneously (no dropped frames)
- [ ] Web build: <10 MB bundle, <2s load time on 4G
- [ ] Desktop build (Tauri): <50 MB app size, <3s startup
- [ ] Evidence: test results, metrics dashboards, recorded evidence videos

**Key Tasks:**
1. **Create stress tests** (tests/stress-test.mjs)
   - Add 20 webcam sources; measure memory + FPS over 1 hour
   - Import 100 assets; measure render time per frame
   - Play 10-minute timeline; measure scrub responsiveness
   - Publish to 5 RTMP legs; measure latency per leg
   - Record + stream simultaneously; measure frame drop rate

2. **Create smoke test suite** (tests/smoke-tests.mjs)
   - Pre-broadcast checklist: all sources connected, output armed, graphics loaded
   - Live broadcast simulation: 30 min continuous with periodic scene changes
   - Post-broadcast checklist: files finalized, destinations reported success

3. **Monitor metrics**
   - Memory: heap size, non-heap allocations
   - CPU: GPU utilization, shader compilation time
   - Network: bitrate per destination, packet loss
   - Render: draw calls, triangle count, frame time per system

4. **Document findings**
   - Performance profile (CPU, GPU, memory vs. asset count)
   - Bottlenecks and optimizations applied
   - Threshold recommendations (max assets, max sources, max destinations)

**Testing:**
- Run stress tests; collect baseline metrics
- Identify any memory leaks; fix
- Identify any FPS regressions; optimize
- Verify no crash or degradation over 1hr+

**Timeline:** 3 weeks

---

## MILESTONE 10: Final Polish & Delivery

**Objective:** Fix remaining issues; prepare for production release.

**Acceptance Criteria:**
- [ ] All Tier 1 features (Milestones 2–7) complete and tested
- [ ] All known defects from ENGINEERING_STATUS fixed or marked "future work"
- [ ] Keyboard shortcuts documented (help screen)
- [ ] User guide (quick-start, tutorial workflows)
- [ ] Settings module complete (theme, shortcuts, project defaults)
- [ ] Help/About screen with version info + credits
- [ ] Build verified: web (Vite) and desktop (Tauri)
- [ ] Evidence: final smoke test passing, user guide, release notes

**Key Tasks:**
1. **Polish UI**
   - Settings panel (theme, shortcuts, defaults)
   - Help screen + keyboard shortcut reference
   - Toast notifications for all major actions
   - Consistent error messages
   - Tooltips on all obscure controls

2. **Documentation**
   - User guide PDF (quick-start workflow)
   - Tutorial videos (setup, first broadcast, troubleshooting)
   - API documentation (if exposing scripting)
   - Keyboard shortcut reference
   - Known limitations + workarounds

3. **Final QA**
   - Manual test all workflows (setup, broadcast, record, archive)
   - Browser compatibility (Chrome, Edge, Firefox)
   - Desktop (Windows, macOS if applicable)
   - Network edge cases (high latency, packet loss, bandwidth limit)

4. **Build & Release**
   - Version bump (0.2.0)
   - Changelog (features, fixes, known issues)
   - Release notes (highlights, upgrade path)
   - Build artifacts (web dist/, desktop installer)

**Timeline:** 2 weeks

---

## PRIORITY MATRIX

| Milestone | Impact | Effort | Blockers | Priority |
|-----------|--------|--------|----------|----------|
| 1. Audit | Info | Low | None | ✅ IN PROGRESS |
| 2. Source Input | High | Medium | None | 🔴 CRITICAL |
| 3. Scene Composer | High | High | Timeline (M5) useful but not blocking | 🔴 CRITICAL |
| 4. Graphics | High | High | None (independent) | 🔴 CRITICAL |
| 5. Timeline | High | High | None (independent) | 🔴 CRITICAL |
| 6. Engine Stability | Medium | High | None (independent) | 🟡 IMPORTANT |
| 7. Output Preview | Medium | Medium | Graphics (M4) useful for preview | 🟡 IMPORTANT |
| 8. Forks | Low | Low | None | 🟢 NICE-TO-HAVE |
| 9. Performance | Medium | High | Dep on M2–M7 | 🟡 IMPORTANT |
| 10. Polish | Low | Medium | Dep on M2–M9 | 🟢 NICE-TO-HAVE |

---

## CRITICAL PATH

1. **Milestone 2** (Source Input): Unblock broadcast workflows (video/image sources)
2. **Milestone 4** (Graphics): Unblock professional broadcasts (lower thirds, tickers)
3. **Milestone 3** (Scene Composer): Enable scene management workflow
4. **Milestone 5** (Timeline): Enable animation + event sequencing
5. **Milestone 6** (Engine Stability): Ensure professional rendering quality
6. **Milestone 7** (Output Preview): Complete broadcast pipeline
7. **Milestones 8–10**: Polish + release

---

## SUCCESS METRICS

### By Milestone
- **M2:** 100% of source input types functional (webcam, video, image, screen)
- **M3:** 10+ named scenes saveable/loadable without artifact
- **M4:** Graphics rendering in output stream; visible in broadcast
- **M5:** Timeline playback >30 FPS; scrub latency <100ms
- **M6:** 100+ assets renderable at >25 FPS (low quality)
- **M7:** Output preview showing live composite; recording formats working
- **M8:** Zero unused forks; 100% fork usage documented
- **M9:** Stress tests passing; no crashes or memory leaks over 1hr
- **M10:** All features merged; version 0.2.0 released

### Overall
- **Broadcasting capability:** Fully functional virtual studio (sources → graphics → output)
- **Professional quality:** Stable rendering, reliable streaming, broadcast-grade graphics
- **User experience:** Intuitive UI, responsive interaction, comprehensive help
- **Code quality:** >80% test coverage, zero critical defects, documented architecture

---

## RISK ASSESSMENT

### Technical Risks
1. **Timeline sync complexity** (M5) — asset animation interpolation + playback sync
   - *Mitigation:* Start with simple linear interpolation; add easing later
   
2. **Graphics rendering performance** (M4) — DynamicTexture overhead
   - *Mitigation:* Pre-render static graphics; animate only what changes
   
3. **Output relay stability** (M2–M7) — ffmpeg subprocess management
   - *Mitigation:* Log all ffmpeg output; implement retry + health checks

4. **Memory leaks under load** (M9) — WebGL context, audio tracks, video elements
   - *Mitigation:* Profile early + often; add stress tests to CI

### Schedule Risks
1. **Scope creep** — features requested mid-milestone
   - *Mitigation:* Document scope per milestone; defer to "future work" list

2. **Platform-specific issues** — Tauri desktop, browser compatibility
   - *Mitigation:* Test on multiple platforms early; isolate platform code

3. **Dependency updates** — Babylon.js, Tauri, React breaking changes
   - *Mitigation:* Pin versions; monitor for security updates quarterly

---

## FUTURE WORK (Beyond M10)

- **Tier 2 Features:**
  - Audio mixer (faders, routing, EQ, compression)
  - Advanced camera tracking (full 6-DOF pose estimation)
  - HDRI environment lighting
  - Material library + PBR textures
  - Advanced transitions (3D wipes, morphs, etc.)
  - Scripting engine (automation, hotkey binding)

- **Tier 3 Features:**
  - Multi-camera live switching (PinP, quad layout)
  - Virtual set library (pre-built broadcast sets)
  - Puppet animation (skeletal animation for talent)
  - AI-powered auto-framing (intelligent camera positioning)
  - Cloud project sync
  - Live collaboration (multi-user editing)

- **Operational:**
  - API for 3rd-party control (OSC, MIDI, REST)
  - Telemetry + usage analytics
  - Crash reporting
  - Remote support (screen share, diagnostics)

---

*Prepared: June 14, 2026*  
*Next Review: After Milestone 1 completion (June 15)*  
*Expected Full Delivery: December 31, 2026 (with 2 months buffer)*
