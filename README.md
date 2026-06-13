# CHASE Studio Pro

Professional virtual broadcast studio builder — desktop shell (Milestone 0).

## UI Direction

Design locked in:

- `UI_DESIGN_SYSTEM.md` — tokens, typography, component rules
- `UI_LAYOUT_SPEC.md` — 9-region grid layout
- `UI_COMPONENT_MAP.md` — component inventory and state
- `CHASE_STUDIO_BUILDER_UI_PLAN.md` — phased implementation plan

## Quick Start

**Requirements:** Node.js 20+, Rust (for Tauri desktop)

```bash
npm install
npm run dev          # Browser at http://localhost:1420
npm run tauri:dev    # Native desktop window
```

## Shell Milestone (M0)

Interactive layout only — Babylon viewport added in M1.

## Milestone 1 (current)

Babylon.js scene renders inside CHASE viewport. CHASE shell drives cameras, selection, transforms, and desk properties.

```bash
npm install
npm run dev          # Browser at http://localhost:1420
npm run tauri:dev    # Native desktop window
npm run setup:editor-fork   # Optional: clone Editor for upstream diff
```

See `docs/BABYLON_INTEGRATION.md` for architecture.

## Next Step

Milestone 2: Wire Asset Panel studio packs to `babylonjs-editor-tools` `loadScene()`.
