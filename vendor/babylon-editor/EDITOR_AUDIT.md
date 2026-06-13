# Babylon.js Editor Fork — CHASE Integration Audit

Reference: [BabylonJS/Editor](https://github.com/BabylonJS/Editor) v5.3.x (master, Babylon.js 9.9.1)

Clone locally:

```powershell
npm run setup:editor-fork
# or: git clone --depth 1 https://github.com/BabylonJS/Editor.git vendor/babylon-editor
```

## Monorepo Layout

| Package | Path | Role |
|---------|------|------|
| `babylonjs-editor` | `editor/` | Electron app + React UI (discarded chrome) |
| `babylonjs-editor-tools` | `tools/` | **Runtime library** — scene load, rendering pipeline, decorators |
| `babylonjs-editor-cli` | `cli/` | Project scaffolding, export |
| Plugins | `plugins/` | Quixel, Fab — **remove for CHASE** |
| Templates | `templates/` | Next.js/Nuxt game templates — reference only |

## Keep (via npm `babylonjs-editor-tools` or forked `tools/`)

| Module | Editor path | CHASE usage |
|--------|-------------|-------------|
| Scene loader | `tools/src/loading/loader.ts` | Load `.babylon` + `project.editorproject` (M2) |
| Default pipeline | `tools/src/rendering/default-pipeline.ts` | Quality-tier post-FX |
| SSAO / SSR / TAA | `tools/src/rendering/*` | High quality only |
| Mesh / light tools | `tools/src/tools/*` | Inspector sync |
| Cinematic | `tools/src/cinematic/*` | Timeline keyframes (M3) |
| Decorators | `tools/src/decorators/*` | Scene metadata |

## Keep (fork `editor/src/editor/` — extract later)

| Module | Path | Notes |
|--------|------|-------|
| Viewport rendering | `editor/src/editor/rendering/` | Adapt pipeline wiring |
| Scene nodes | `editor/src/editor/nodes/` | Graph model for Layers panel |
| Gizmo / pick | embedded in editor layout windows | Replaced by `StudioEngine` gizmo for M1 |

## Remove (do not port)

| Module | Reason |
|--------|--------|
| `editor/src/dashboard/` | Project dashboard — CHASE TopBar |
| `editor/src/ui/` | Editor chrome — CHASE AppShell |
| `editor/src/electron/` | Electron shell — CHASE uses Tauri |
| `editor/src/splash/` | Splash — CHASE boot |
| `plugins/quixel`, `plugins/fab` | Game asset stores |
| Game templates | Not broadcast workflow |
| Physics debug, particle labs | Operator clutter |

## M1 Integration Decision

**CHASE does not embed the Electron Editor UI.** Instead:

1. **Runtime:** `@babylonjs/core` + `babylonjs-editor-tools` for Editor-compatible scene load/save.
2. **Viewport:** `StudioEngine` in `src/engine/` mounts canvas at `#babylon-viewport`.
3. **Chrome:** CHASE `AppShell` remains the only UI — inspector/asset panel drive the engine via `EditorBridge`.

This matches the plan: *"Replace Editor chrome with CHASE AppShell — embed editor canvas in ViewportCanvas."*

## Version Pin

| Package | Version |
|---------|---------|
| `@babylonjs/core` | 9.9.1 |
| `babylonjs-editor-tools` | 5.4.2-alpha.2 |

When the fork is cloned, diff `tools/` against npm to track upstream changes.
