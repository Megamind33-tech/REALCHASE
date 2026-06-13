# CHASE PRO Desktop — Full Repo Audit & Phased Repair Plan

_Audit date: 2026-06-13 · Branch: `claude/chase-pro-audit-4b912d`_

This is the pre-work audit. **No engine/rendering behaviour is changed by this
document.** It maps the codebase, names what is real vs. mock, identifies risks,
lays out a 7-phase repair plan, and defines the first safe patch.

---

## 0. What the app actually is today

A **Tauri + React 19 + Babylon.js 9** desktop shell. It renders one procedural
3-D "newsroom" scene and lets you orbit six pre-placed `ArcRotateCamera`
viewpoints, select/transform meshes with a gizmo, tweak a desk material, and
toggle quality tiers. Everything outside the 3-D viewport — cameras as *video
sources*, recording, going live, audio, transitions, streaming, projects — is
**UI state with toasts**, not a working pipeline.

It is a credible **studio-set builder shell**. It is **not yet** a broadcast
production tool: there is no video anywhere in the system.

---

## 0a. Build status (verified this session)

**The repo did not compile or build out of the box.** Three pre-existing
blockers were found and fixed as part of Patch 1 (none are in engine/render
logic):

1. `tsc` error — `src/data/mock/studioData.ts` imported `./shellTypes` (wrong
   path; file is `src/context/shellTypes.ts`). → switched to the `@/context/...`
   alias used everywhere else.
2. `tsc` error — `StudioEngine.ts:123` `current = current.parent` (`Nullable<Node>`
   not assignable). → narrowing cast, behaviour unchanged.
3. `vite` bundle error — `babylonjs-editor-tools` imports `@babylonjs/gui`, which
   was **never declared** in `package.json`. → added `@babylonjs/gui` pinned to
   `9.9.1` (matching the other Babylon packages).

After these fixes: `tsc -b` is clean and `vite build` succeeds. The production
bundle is **7.2 MB (1.6 MB gzip)** in a single chunk — confirming finding **S6**
(barrel imports / no code-splitting); that is a Phase-6 task, not fixed here.

---

## 1. Findings

### 1.1 Why the app is/feels slow
| # | Cause | Evidence | Fix phase |
|---|-------|----------|-----------|
| S1 | **Google Fonts loaded over network at boot** in a desktop app — blocks first paint and stalls offline. | `index.html` `<link href="fonts.googleapis.com">` | P1 |
| S2 | **Whole-tree re-renders on timers** unrelated to rendering: metrics `setInterval` every 4 s dispatches into the root reducer; audio meters `setInterval` every 200 ms re-render `OutputPanel`. | `ShellContext.tsx:171`, `OutputPanel.tsx:24` | P1 (patch 1) / P3 |
| S3 | **Engine created & disposed twice in dev** (StrictMode mount→unmount→mount). Fragile lifecycle; double GPU context churn. | `EditorBridgeContext.tsx:96` dispose effect + `ViewportCanvas.tsx:10` init | P1 |
| S4 | **`preserveDrawingBuffer: true` + forced `antialias`** on the WebGL engine — disables driver fast paths; only needed for screenshots. | `StudioEngine.ts:63` | P6 |
| S5 | **Per-mesh loop on every quality change** sets `needDepthPrePass=false` across all meshes. | `StudioEngine.ts:351` | P6 |
| S6 | Babylon imported from the **root barrel** in 3 files. Manageable now; will dominate cold-start/bundle as features grow. | `import { ... } from '@babylonjs/core'` | P6 |

### 1.2 What blocks real video workflows (the core gap)
- **There is no video input of any kind.** No webcam (`getUserMedia`), no screen
  capture, no NDI, no RTMP/RTSP/SRT ingest, no file playback, no decoding.
- The six "cameras" are **3-D viewpoints**, not video sources. The CameraStrip
  thumbnails are **CSS gradients** (`CameraStrip.tsx:53`), not live previews.
- **GO LIVE / REC** flip booleans and show toasts (`ShellContext.tsx:98-101`).
  No encoder, no muxing, no MediaMTX wiring, no destinations.
- **Studio packs fail by design**: `loadPack` fetches
  `/scenes/{id}/scene.babylon` but `public/scenes/` contains only a README — so
  every pack button throws "Pack unavailable". (`StudioEngine.ts:186`,
  `public/scenes/`)
- **Save / Open / New / Import** only toast "project service not connected"
  (`ShellContext.tsx:128`). No persistence, no Tauri dialogs.
- **Tauri backend is empty** — only the shell plugin; no commands, no file IO,
  no media-process management. (`src-tauri/src/lib.rs`)

### 1.3 What is mock / demo (must be replaced, not shipped)
- `src/data/mock/studioData.ts` — **all** packs, camera shots, lighting presets,
  transitions, stream destinations, audio channels.
- **Fake system telemetry**: random CPU/GPU/RAM every 4 s + a performance warning
  derived from those random numbers. (`ShellContext.tsx:132-141`) → _addressed by
  Patch 1._
- **Fake audio meters**: random walk every 200 ms. (`OutputPanel.tsx:24`)
- **Fake REC**: counts seconds, shows "~124 MB". (`OutputPanel.tsx:144`)
- **Dead inspector controls**: Light, Keying sliders only toast. Presenter
  "Skin Smoothing / Eye Brightness / Teeth Whitening" are stored but **never
  applied** (there is no presenter mesh) — exactly the kind of useless beautify
  UI to drop. (`Inspector.tsx:171-192`)
- Timeline keyframes are decorative; playback toggles a flag that animates
  nothing. Layout presets, Materials tab = placeholders.

### 1.4 Duplicated / inconsistent code
- **`TransformMode` defined twice**, verbatim, in `shellTypes.ts:103` and
  `sceneRegistry.ts:38`.
- **Layer list rendered twice** with **different colour sources** — `Inspector`
  uses `TIMELINE_LAYERS` colours, `Timeline` uses its own `layerColors` array →
  the same layer shows different colours in the two panels.
  (`Inspector.tsx:224`, `Timeline.tsx:8`)
- `LAYER_TO_OBJECT` duplicates IDs that also live as scene-node metadata.

### 1.5 Weak state management
- One **~40-field reducer** (`ShellState`) mixes UI chrome, an engine mirror,
  fake telemetry, and project data with no separation and **no persistence**.
- Engine identifiers (`activeCameraId`, `selectedObjectId`, …) are **loose
  `string`s** in shell state but enums in the engine, reconciled by **7 separate
  effects** in `EditorBridgeContext` — fragile and re-entrant (engine `selected`
  → `SET_OBJECT` → effect calls `selectObject` again; only saved by a `changed`
  guard).
- **Undo/redo are integer counters**, not a real history stack
  (`ShellContext.tsx:122-127`).

### 1.6 Generic UI panels
- Styling is **inline styles everywhere**; design tokens exist
  (`styles/tokens.css`) but most colours/spacing are hardcoded inline →
  inconsistent and hard to re-skin.
- Only the **Builder** module has content; the other 10 rail modules render
  "coming in next milestone" (`Viewport.tsx:36`).
- Buttons/cards/icons are stock flat rectangles + stock lucide glyphs — not the
  "non-generic broadcast-grade" look requested.

### 1.7 Rendering-path lag
- The Babylon render loop itself is fine. Jank comes from **React timers**
  (S2) re-rendering large subtrees independently of the GPU loop, plus FPS events
  firing on **every integer change** with no smoothing (`StudioEngine.ts:96`).

---

## 2. What to reuse (lawful OSS) vs. build

Boundaries already defined in `ENGINE_BOUNDARIES.md` / `FORKS_MANIFEST.json`.
Honour them.

| Need | Reuse (license / boundary) | Do **not** build from scratch |
|------|----------------------------|-------------------------------|
| 3-D render engine | **Babylon.js** `@babylonjs/core` (Apache-2.0, dep) | A renderer |
| Scene load/save | **babylonjs-editor-tools** + Babylon `SceneSerializer` (Apache-2.0) | A serializer |
| Media ingest/egress (RTMP/RTSP/SRT/WebRTC/HLS) | **MediaMTX** (MIT) — packaged **process**, controlled via REST. Proven to run (`PROOF_OF_RUN.md`). | A media server / RTMP stack |
| Capture + encode | **WebCodecs / getUserMedia / getDisplayMedia** in the WebView for preview; **ffmpeg or GStreamer** (LGPL, dynamic-link only) on the **Rust** side for encode/record | Codecs, an encoder |
| Live preview transport | **WebRTC / HLS** from MediaMTX | A transport |
| CG / playout (optional, later) | **CasparCG** (GPL-3.0) — **external process only**, AMCP over TCP | — |
| Layout / docking | Maintained CSS grid or a small docking lib | A docking engine |
| Design references only | OBS (GPL), Sofie (MIT), Restreamer (Apache) — **read, never import** | — |

**Hard licensing rules:** GStreamer = dynamic link only. CasparCG & OBS source =
never compiled/linked; process/reference only.

---

## 3. Architecture risks
1. **Tauri WebView codec gaps** — system WebViews have limited/zero H.264, no NDI.
   → All capture/encode/mux must live **native (Rust)**, not in the WebView.
2. **GPU availability** — WebGL/WebGPU support varies per WebView. "GPU-aware
   rendering" must **detect capability and fall back** (don't assume WebGPU).
3. **Process & port management** — bundling MediaMTX per-platform, lifecycle,
   firewall prompts on 1935/8554/8889.
4. **Copyleft contamination** — keep GPL pieces in separate processes (already
   the documented plan); verify at packaging time.
5. **Two-way state re-entrancy** (§1.5) can cause selection loops once more
   sources exist.
6. **Build cannot be verified in this session** — `node_modules` is missing and
   network is restricted; `npm install` + typecheck is the first action of P1.

---

## 4. Phased repair plan

> Rule for every phase: **no fake features**. If a control can't do the real
> thing yet, it is hidden or clearly disabled — never faked.

### Phase 1 — Stabilise the existing app
- `npm install`; get `tsc -b && vite build` and `tauri dev` green. Record results.
- Self-host the Inter/JetBrains fonts (kill the network font fetch, S1).
- Make the engine lifecycle StrictMode-safe (single create/dispose, S3).
- **Patch 1 (this PR): honest telemetry** — remove random CPU/GPU/RAM + fake
  performance warning; drive status off **real FPS** (see §5).
- Throttle/scope the meter & metrics timers so they don't re-render the tree (S2).
- De-duplicate `TransformMode`; unify the layer colour source (§1.4).
- **Exit:** app boots fast, no console errors, no fabricated numbers on screen.

### Phase 2 — Reliable source import & switching
- Real **video sources** behind a `Source` model: webcam (`getUserMedia`),
  screen (`getDisplayMedia`), media file, and a 3-D-scene source.
- **Scene/source switcher** (vMix-style Preview→Program) with a real cut/fade.
- Make studio-pack loading honest: ship 1–2 real `.babylon` packs **or** disable
  packs with a clear empty state until assets exist (no silent failure).
- glTF/`.glb` drag-drop import already works in-engine — harden errors & feedback.
- **Exit:** import a webcam + a file + the 3-D set; switch between them live in
  preview without freezing.

### Phase 3 — UI/UX skin & panels
- Promote inline styles into token-driven primitives (Card, Panel, Toolbar,
  SourceTile, Meter) — original broadcast-grade styling.
- Replace gradient camera tiles with **real source thumbnails**.
- Resizable/dockable panel layout; remove "coming soon" placeholder modules or
  gate them behind a clear roadmap flag.

### Phase 4 — Scene/source builder
- Drag-and-drop **layer compositor** (sources, overlays, graphics) per scene.
- Real scene save/load via Babylon serializer + a Tauri project file (`.chase`).
- Real undo/redo history (replace integer counters).

### Phase 5 — Virtual studio / AR foundations
- Camera tracking data model, keying (real chroma key shader), LED-wall/virtual-set
  asset import pipeline, parallax/lens binding to actual camera nodes.

### Phase 6 — Performance
- Babylon deep imports / tree-shaking (S6); drop `preserveDrawingBuffer` unless a
  screenshot needs it (S4); fix the per-mesh quality loop (S5).
- WebGPU-with-fallback detection; FPS smoothing; render-on-demand where possible.

### Phase 7 — Test, package, release
- Bundle MediaMTX + native encode sidecars per platform; Tauri permissions/capabilities.
- Smoke tests for source switch, record, go-live; signed installers; release notes.

---

## 5. First safe patch — "Honest telemetry"

**Goal:** satisfy the explicit mandate *"no fake demo features"* with a minimal,
reversible change that touches **no engine/rendering code**.

**Change:**
- Delete the 4-second random CPU/GPU/RAM generator and the performance warning
  that was computed from those random numbers.
- Drive `performanceWarning` from the **real** engine FPS (sustained < 24 fps
  while the engine is ready).
- Stop printing fabricated CPU/GPU/RAM/memory/disk figures in the TopBar and
  StatusBar; show the **real** resolution + FPS instead.

**Files (telemetry):** `context/shellTypes.ts`, `context/ShellContext.tsx`,
`data/mock/studioData.ts`, `components/shell/TopBar.tsx`,
`components/shell/StatusBar.tsx`.

**Files (build-green, see §0a):** `data/mock/studioData.ts` (import path),
`engine/StudioEngine.ts` (cast), `package.json` (`@babylonjs/gui`).

**Why it's safe:** no Babylon/engine calls touched; only removes a misleading
random source and reroutes a warning to data that already flows
(`UPDATE_ENGINE_FPS`). Fully reversible.

**Verification (done this session):** `tsc -b` is clean and `vite build`
succeeds. At runtime the TopBar/StatusBar now show real FPS that tracks the
viewport; the performance banner only appears on genuinely low FPS; no number on
screen is fabricated. (Runtime FPS observation belongs to the P1 `tauri dev`
smoke test.)

---

## 6. Answers to the four framing questions
1. **What are we building?** An original, broadcast-grade virtual-production /
   live-switching desktop tool (vMix-style source control + a drag-and-drop
   studio builder + Zero-Density-style virtual-set thinking), built on Babylon +
   MediaMTX + native encode. Not a clone; original UI/UX.
2. **Which files get touched first?** Only the five telemetry files in §5 for
   Patch 1. The broader file map is §1 / §7-below.
3. **How do we know it works?** Per-phase exit criteria (§4) + the Patch-1
   verification (§5): real build green, real FPS on screen, warning only on real
   low FPS.
4. **What must not change (yet)?** The Babylon render loop, scene construction,
   camera/gizmo logic, and the licensing boundaries in `ENGINE_BOUNDARIES.md`.
   Patch 1 deliberately stays out of all of them.

---

## 7. File map (current)
```
src/
  App.tsx                       providers → AppShell
  main.tsx                      React root (StrictMode)
  context/
    ShellContext.tsx            ROOT reducer (~40 fields) + toast/metrics timers   [mock telemetry]
    shellTypes.ts               all shell types + actions   [dup TransformMode]
    EditorBridgeContext.tsx     React↔engine bridge (7 sync effects)
  engine/
    StudioEngine.ts             Babylon engine: cameras, gizmo, pick, quality, import   [core, keep]
    defaultStudioScene.ts       procedural newsroom set
    sceneRegistry.ts            id↔metadata maps   [dup TransformMode]
    qualityProfile.ts           low/balanced/high tiers
  components/
    shell/  TopBar StatusBar ModuleRail AssetPanel Viewport CameraStrip
            Timeline Inspector OutputPanel AppShell
    viewport/ ViewportCanvas.tsx   canvas mount + drag-drop import
    ui/     Button.tsx Controls.tsx   (only real shared primitives)
  data/mock/studioData.ts       ALL mock data
  styles/ tokens.css global.css
src-tauri/                      Tauri 2 shell — backend essentially empty
public/scenes/                  README only — NO packs (loadPack always fails)
```
</content>
</invoke>
