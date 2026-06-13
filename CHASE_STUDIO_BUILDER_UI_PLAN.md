# CHASE Studio Builder — UI Implementation Plan

Phased plan to deliver the Builder shell and integrate the BabylonJS Editor fork as the scene foundation.

## Milestone 0 — UI Direction Lock (this deliverable)

**Goal:** Documented design system + responsive shell with no engine coupling.

**Deliverables:**
- [x] `UI_DESIGN_SYSTEM.md`
- [x] `UI_LAYOUT_SPEC.md`
- [x] `UI_COMPONENT_MAP.md`
- [x] `CHASE_STUDIO_BUILDER_UI_PLAN.md`
- [x] Vite + React + TypeScript project scaffold
- [x] Tauri desktop shell configuration
- [x] Full 9-region layout with working local state
- [x] Collapsible panels, compact mode, quality selector, performance warning UI

**Out of scope:**
- Babylon.js runtime
- Streaming / RTMP
- Automation / macros execution
- Real file I/O beyond UI feedback

---

## Milestone 1 — BabylonJS Editor Fork Assessment

**Goal:** Identify fork/adapt path; do not build 3D editor from scratch.

**Tasks:**
1. Clone [Babylon.js Editor](https://github.com/BabylonJS/Editor) (or maintained fork)
2. Audit modules to keep vs remove:
   - **Keep:** viewport, scene graph, asset browser, inspector, transforms, cameras, lights, materials, save/load
   - **Remove:** game-oriented tooling, physics debug, particle labs, unrelated plugins
3. Document integration boundary in `docs/BABYLON_INTEGRATION.md`
4. Replace Editor chrome with CHASE `AppShell` — embed editor canvas in `ViewportCanvas`

**Acceptance:** Editor scene loads inside CHASE viewport; CHASE rail/panels remain authoritative for navigation.

**Status:** Complete (M1)
- [x] Editor audit: `vendor/babylon-editor/EDITOR_AUDIT.md`
- [x] Integration doc: `docs/BABYLON_INTEGRATION.md`
- [x] `StudioEngine` + default broadcast scene in viewport
- [x] `babylonjs-editor-tools` dependency for M2 scene load
- [x] EditorBridge syncs shell ↔ Babylon (cameras, selection, gizmos, desk props, quality)

---

## Milestone 2 — Asset Pipeline Bridge

**Goal:** Asset panel drives real scene objects.

**Tasks:**
1. Wire Studio Pack selection → load `.babylon` / glTF pack
2. Wire 3D Object grid → instantiate prefab nodes
3. Wire Lighting Presets → apply light rig templates
4. Drag-drop zone → import asset into scene graph
5. Sync timeline layers with Babylon scene nodes

---

## Milestone 3 — Camera & Output

**Goal:** Multi-cam production path.

**Tasks:**
1. Camera strip ↔ Babylon camera nodes
2. Shot recall with transitions (Output panel duration)
3. Program/Preview bus separation (UI + render targets)
4. Safe area guides from broadcast safe margins

---

## Milestone 4 — Broadcast I/O

**Goal:** Record and stream from Tauri host.

**Tasks:**
1. Tauri sysinfo → real CPU/GPU/RAM in TopBar/StatusBar
2. Local recording (FFmpeg or platform APIs)
3. RTMP destination manager
4. Audio mixer → host audio engine

---

## Milestone 5 — Small Computer Hardening

**Goal:** Reliable on modest hardware per lightweight studio skill.

**Tasks:**
1. Quality mode → renderer config (shadows, MSAA, internal resolution)
2. Auto-degrade when performance warning triggers
3. Disable heavy viewport effects on weak machines
4. Profile on minimum spec device; document in `docs/PERFORMANCE_BUDGET.md`

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| UI | React 19 + TypeScript |
| Build | Vite 6 |
| Desktop | Tauri 2 |
| 3D (M1+) | Babylon.js + Editor fork |
| Icons | lucide-react |
| State (shell) | React Context |
| State (editor, M1+) | Editor store + CHASE bridge |

---

## Project Structure (shell milestone)

```
CHASE/
├── UI_DESIGN_SYSTEM.md
├── UI_LAYOUT_SPEC.md
├── UI_COMPONENT_MAP.md
├── CHASE_STUDIO_BUILDER_UI_PLAN.md
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── context/ShellContext.tsx
│   ├── components/
│   │   ├── shell/          # 9 layout regions
│   │   └── ui/             # design system primitives
│   ├── data/mock/          # packs, cameras, layers, destinations
│   └── styles/
│       ├── tokens.css
│       └── global.css
├── src-tauri/              # Tauri 2 config
├── package.json
└── vite.config.ts
```

---

## Definition of Done — Shell Milestone

1. Application launches in browser (`npm run dev`) and Tauri (`npm run tauri dev`)
2. All 9 layout regions visible and proportioned per `UI_LAYOUT_SPEC.md`
3. Module rail switches workspace context (Builder = full layout)
4. Asset panel tabs, search, filters, grids, drop zone functional (UI state)
5. Camera strip selects active shot; updates inspector
6. Timeline selects layer; shows keyframe placeholders
7. Inspector sub-tabs swap content; controls update local state
8. Output panel transitions, mixer meters, stream list interactive
9. Collapse left/right panels; timeline minimize; compact mode toggle in Settings or status
10. Quality mode selector updates state + viewport badge
11. Performance warning appears when mock metrics exceed threshold
12. No dead buttons — every control produces visible feedback (toast, state change, or panel update)

---

## Next Action After Shell

Begin Milestone 1: clone BabylonJS Editor, run standalone, map viewport mount point to `ViewportCanvas` ref.
