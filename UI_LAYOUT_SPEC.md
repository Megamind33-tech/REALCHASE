# CHASE Studio Pro — UI Layout Specification

Grid-based shell layout for the Builder module. All dimensions assume 1920×1080 minimum; layout is fluid and reflows down to 1280×720.

## Grid Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR (36px) — logo, project, file ops, metrics, REC, GO LIVE           │
├──┬──────────────┬──────────────────────────────────────┬───────────────────┤
│R │ ASSET PANEL  │         CENTER COLUMN                │ RIGHT COLUMN      │
│A │ (240px)      │  ┌────────────────────────────────┐  │ Inspector (flex)  │
│I │ collapsible  │  │ VIEWPORT (flex-grow)           │  │ 280px collapsible │
│L │              │  └────────────────────────────────┘  ├───────────────────┤
│  │              │  CAMERA STRIP (88px)                 │ OUTPUT PANEL      │
│5 │              │  ┌────────────────────────────────┐  │ (fixed ~220px)    │
│6 │              │  │ TIMELINE (180px, resizable)    │  │                   │
│  │              │  └────────────────────────────────┘  │                   │
├──┴──────────────┴──────────────────────────────────────┴───────────────────┤
│ STATUS BAR (22px) — project status, metrics, autosave, backup, messages     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Region Definitions

### 1. Top Bar

**Height:** 36px | **Background:** `--bg-panel` | **Border-bottom:** 1px `--border-subtle`

| Zone | Content | Alignment |
|------|---------|-----------|
| Brand | `CHASE STUDIO PRO` wordmark | Left, 12px padding |
| Project | Show name dropdown (e.g. "Apex Evening Broadcast") | After brand, 16px gap |
| File ops | Save, Open, New, Import | Center-left cluster |
| History | Undo, Redo | After file ops |
| System health | Green dot + "System OK" | Center-right |
| Metrics | CPU, GPU, RAM, resolution/FPS | Mono, 8px gaps |
| Broadcast | REC button, GO LIVE button | Right, 12px padding |

REC: toggles local recording state (UI only in shell milestone).  
GO LIVE: opens destination panel focus (UI state only in shell milestone).

---

### 2. Module Rail

**Width:** 56px | **Background:** `--bg-rail`

Vertical stack of module buttons. Active module shows 2px blue left bar + `--accent-blue-dim` background.

| Order | Module | Shell behavior |
|-------|--------|----------------|
| 1 | Builder | Default active; shows asset panel |
| 2 | Scenes | Swaps center placeholder label |
| 3 | Assets | Full asset browser (future) |
| 4 | Graphics | Lower third / CG (future) |
| 5 | Overlays | Bug, ticker (future) |
| 6 | Lighting | Light rig presets (future) |
| 7 | Cameras | Multi-cam matrix (future) |
| 8 | Audio | Full mixer view (future) |
| 9 | Scripts/Rundown | Rundown editor (future) |
| 10 | Outputs | Stream destinations (future) |
| 11 | Settings | App settings (future) |

Non-Builder modules show a centered "Module: {name}" placeholder in shell milestone — not dead buttons; they switch visible workspace context.

---

### 3. Asset Panel (Builder only)

**Width:** 240px (collapsible to 0) | **Border-right:** 1px

**Header tabs:** SETS | ELEMENTS | ASSETS (segmented control)

**Sections (scrollable):**
1. Search input + filter icon
2. Category chips: ALL, NEWS, SPORTS, TALKSHOW, BUSINESS
3. Premium Studio Packs — 2-column thumbnail grid
4. 3D Objects — 3-column icon grid
5. Lighting Presets — circular preset buttons
6. Drop zone — dashed border, "Drag & drop assets into the scene"

Collapse control: vertical tab on panel right edge.

---

### 4. Center Viewport

**Flex:** 1 1 auto | **Min-height:** 280px | **Background:** `--bg-viewport`

**Toolbar (32px, top of viewport):**
- 3D / 2D toggle
- Camera selector dropdown (Main Camera)
- Tool cluster: Select, Translate, Rotate, Scale, Focus, Grid, Safe Area
- Quality mode: Low | Balanced | High
- LIVE indicator (top-right overlay when simulating live)

**Canvas area:**
- Placeholder gradient mesh or static studio preview image
- Selected object: blue bounding box (CSS overlay in shell)
- Transform gizmo indicator (decorative SVG in shell)
- Safe area guides: 90% title-safe, 80% action-safe (toggle)

---

### 5. Camera Shot Strip

**Height:** 88px | **Border-top:** 1px | **Padding:** 8px

Horizontal scroll row of camera thumbnails:
- CAM 1 WIDE (default selected, green border)
- CAM 2 DESK … CAM 6 FLOOR RING
- Add Camera (+) button

Clicking a shot updates viewport label and inspector Camera tab context.

---

### 6. Bottom Timeline

**Default height:** 180px | **Resizable:** 120px–320px | **Border-top:** 1px

**Header row (28px):**
- Timecode `00:00:00:00` (mono)
- Horizontal ruler with tick marks
- Transition duration badge (e.g. "0.8s")

**Body:**
- Left: layer list (Presenter, News Desk, LED Wall Main, LED Wall Side, Pillar Lights, Floor Ring, Decor Plant)
- Center: color-coded tracks with keyframe diamonds
- Selected layer syncs with inspector

**Footer (28px):**
- Transport: Jump Start, Play/Pause, Next, Record Cue, Loop
- Zoom slider + fit buttons (right)

Minimize: double-click header collapses to 28px.

---

### 7. Right Inspector

**Width:** 280px (collapsible) | **Flex:** 1 within right column

**Tabs:** INSPECTOR | LAYERS (top segmented)

**Inspector sub-tabs (icon row):** Layout, Camera, Light, Presenter, Keying, Materials

Content changes based on `selectedObject` state. Default selection: News Desk.

Example Layout tab controls:
- Layout preset grid
- Environment Rotation slider
- Floor Reflection slider
- Desk Model dropdown, Desk Color, Desk Glow toggle, Desk Screen Text

All controls are wired to local React state in shell milestone.

---

### 8. Right Output Panel

**Height:** ~220px fixed | **Border-top:** 1px

**Sections:**
1. **Transitions** — Cut, Fade, Slide, Push, Zoom, Spin grid + duration slider
2. **Audio Mixer** — 5 channels (PGM, MIC 1, MIC 2, MUSIC, SFX) with meters, M/S
3. **Output & Stream** — REC timer, GO LIVE status, destination list (YouTube, Facebook, Custom RTMP) with LIVE badges

---

### 9. Bottom Status Bar

**Height:** 22px | **Background:** `--bg-rail` | **Border-top:** 1px

| Left | Center | Right |
|------|--------|-------|
| Project Status: Ready (green dot) | CPU/GPU/Memory/Disk mono stats | Auto Save: 2 min ago · Backup On · Live Chat |

---

## Responsive Breakpoints

| Width | Behavior |
|-------|----------|
| ≥1600px | Full layout |
| 1280–1599px | Asset panel 200px, inspector 240px |
| <1280px | Auto-enable compact mode; asset panel default collapsed |

---

## Z-Index Stack

| Layer | z-index |
|-------|---------|
| Status bar | 100 |
| Top bar | 90 |
| Panel resize handles | 80 |
| Viewport toolbar | 70 |
| Viewport overlays (LIVE, safe area) | 60 |
| Dropdowns / popovers | 200 |

---

## State Dependencies

```
activeModule → assetPanelVisible, centerContent variant
selectedCamera → viewport label, inspector Camera tab
selectedLayer → timeline highlight, inspector content
selectedObject → inspector sub-tab availability
qualityMode → viewport badge, performance warnings
leftPanelCollapsed / rightPanelCollapsed / timelineCollapsed → grid columns
compactMode / reducedMotion → CSS custom properties
```

See `UI_COMPONENT_MAP.md` for component ownership of each state slice.
