# CHASE Studio Pro — UI Design System

Visual direction lock for the CHASE PRO desktop broadcast interface. This document defines tokens, typography, interaction patterns, and constraints. It is the source of truth for all UI work until explicitly revised.

## Design Intent

CHASE Studio Pro must read as **professional virtual broadcast software** — the same seriousness as a switcher, NLE, or studio control surface. Operators work under time pressure; every pixel earns its place.

**Feel:** dark, compact, broadcast-ready, technical but legible, fast, modular, operator-friendly.

**Avoid:** generic AI dashboards, SaaS admin panels, oversized cards, marketing gradients, childish icons, fake/dead controls, pixel-for-pixel copies of OBS/vMix/Zero Density.

---

## Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-app` | `#0a0a0c` | Root application background |
| `--bg-panel` | `#111114` | Primary panel surfaces |
| `--bg-panel-raised` | `#18181c` | Elevated panels, inputs |
| `--bg-rail` | `#0d0d10` | Module rail |
| `--bg-viewport` | `#060608` | Viewport canvas area |
| `--border-subtle` | `#252529` | Panel dividers, inactive borders |
| `--border-active` | `#3a3a42` | Hover/focus borders |
| `--text-primary` | `#e8e8ec` | Primary labels |
| `--text-secondary` | `#9898a4` | Secondary labels, metadata |
| `--text-muted` | `#5c5c68` | Disabled, placeholders |
| `--accent-blue` | `#3b82f6` | Active module, selection, links |
| `--accent-blue-dim` | `#1e3a5f` | Active module background tint |
| `--status-ok` | `#22c55e` | System OK, live-ready |
| `--status-warn` | `#eab308` | Performance warning |
| `--status-error` | `#ef4444` | REC, GO LIVE, critical |
| `--status-rec` | `#dc2626` | Recording indicator |
| `--track-presenter` | `#8b5cf6` | Timeline track color |
| `--track-desk` | `#3b82f6` | Timeline track color |
| `--track-led` | `#06b6d4` | Timeline track color |
| `--track-graphics` | `#f97316` | Timeline track color |
| `--track-lights` | `#eab308` | Timeline track color |
| `--track-floor` | `#22c55e` | Timeline track color |

No decorative gradients. Solid fills only. Subtle 1px borders for separation.

---

## Typography

**Font stack:** `"Inter", "Segoe UI", system-ui, sans-serif`  
**Monospace (timecode, metrics):** `"JetBrains Mono", "Cascadia Code", monospace`

| Role | Size | Weight | Line height |
|------|------|--------|-------------|
| App title | 13px | 600 | 1.2 |
| Panel title | 11px | 600 | 1.3 |
| Body / label | 11px | 400 | 1.35 |
| Caption / meta | 10px | 400 | 1.3 |
| Timecode | 12px | 500 | 1 (mono) |
| Metric | 10px | 500 | 1 (mono) |

Uppercase only for section headers ≤10px with `letter-spacing: 0.06em`. Never shout with all-caps body text.

---

## Spacing & Density

Base unit: **4px**.

| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 6px |
| `--space-md` | 8px |
| `--space-lg` | 12px |
| `--space-xl` | 16px |

**Compact mode** reduces vertical padding by 25% and font sizes by 1px.  
**Panel widths:** Asset panel 240px (compact: 200px), Inspector 280px (compact: 240px), Module rail 56px (icons + 9px labels).

---

## Iconography

- 16px default, 14px in compact mode
- 1.5px stroke, no fill-heavy cartoon shapes
- Lucide-style line icons (via inline SVG or lucide-react)
- Module rail: icon above 9px label, max 2 lines truncated

---

## Component Primitives

### Buttons

| Variant | Style |
|---------|-------|
| `ghost` | Transparent, hover `--bg-panel-raised` |
| `secondary` | `--bg-panel-raised`, border `--border-subtle` |
| `primary` | `--accent-blue` text on dim blue bg |
| `danger` | `--status-error` bg, white text — REC / GO LIVE only |

Height: 24px default, 20px compact. No pill shapes; 3px radius max.

### Toggles & Tabs

- Segmented tabs: 1px border container, active tab gets `--accent-blue-dim` fill + blue bottom 2px bar
- Toggle switches: 28×14px track, no animation in reduced-motion mode

### Sliders

- 3px track, 10px thumb
- Value label right-aligned, mono font

### Meters (audio)

- Vertical bars, 4px wide, 48px tall
- Green → yellow → red zones; peak hold 1px white line

### Thumbnails

- Camera strip: 16:9, 72px wide (compact: 60px)
- Asset grid: 64px cells, 1px border, hover `--border-active`

---

## Layout Chrome

- **Top bar:** 36px (compact: 32px)
- **Status bar:** 22px (compact: 20px)
- **Module rail:** full height between top bar and status bar
- **Resize handles:** 3px hit area, `--border-subtle` visual

All panels use `border-right` / `border-left` / `border-top` — never floating cards with drop shadows.

---

## Motion

| Mode | Behavior |
|------|----------|
| Default | 120ms ease panel collapse/expand |
| `--reduced-motion` | Instant transitions, no pulsing REC dot animation |

---

## Quality & Performance UI

### Quality Modes

| Mode | Label | Viewport behavior |
|------|-------|-------------------|
| Low | Low | No post-FX, reduced shadow quality, 720p internal render |
| Balanced | Balanced | Standard PBR, 1080p internal |
| High | High | Full effects, MSAA, reflections |

Selector lives in viewport toolbar. Changing mode shows brief toast in status bar.

### Performance Warning

When CPU > 85% or GPU > 90% for 3s:
- Status bar `--status-warn` pulse (unless reduced motion)
- Banner in viewport: "Performance limited — consider Low quality mode"
- Dismiss persists for session

### Collapsible Regions

- Left asset panel: chevron on rail edge
- Right inspector + output: single collapse control
- Timeline: drag handle to minimize to 28px strip

---

## Accessibility

- Minimum 4.5:1 contrast on primary text
- Focus ring: 1px `--accent-blue` outline, 1px offset
- All interactive controls keyboard-reachable in logical tab order
- `aria-label` on icon-only buttons

---

## Naming & Copy

Use broadcast terminology: **Program**, **Preview**, **PGM**, **Rundown**, **Shot**, **Take**, **Destination**.  
No "AI-powered", "Smart", "Magic", or "Generate" unless the feature genuinely uses ML and is labeled accurately.

---

## File References

- Layout structure: `UI_LAYOUT_SPEC.md`
- Component inventory: `UI_COMPONENT_MAP.md`
- Implementation plan: `CHASE_STUDIO_BUILDER_UI_PLAN.md`
