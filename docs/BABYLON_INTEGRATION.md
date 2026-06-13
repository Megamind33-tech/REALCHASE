# CHASE Studio Pro — Babylon.js Integration

How CHASE embeds Babylon.js and consumes Babylon.js Editor project assets without adopting Editor chrome.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ CHASE AppShell (React) — authoritative UI                   │
│  TopBar · ModuleRail · AssetPanel · Inspector · Timeline    │
└──────────────────────────┬──────────────────────────────────┘
                           │ EditorBridge (React Context)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ StudioEngine (src/engine/StudioEngine.ts)                   │
│  Engine · Scene · Cameras · Gizmos · Pick · Quality tiers   │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌──────────────────┐            ┌──────────────────────────┐
│ @babylonjs/core  │            │ babylonjs-editor-tools   │
│ Canvas render    │            │ loadScene, pipeline,     │
│ Transform gizmos │            │ editorproject decorators │
└──────────────────┘            └──────────────────────────┘
```

## Mount Point

The Babylon canvas is created by `ViewportCanvas` and attached inside `#babylon-viewport`.

```tsx
// src/components/viewport/ViewportCanvas.tsx
<canvas ref={canvasRef} id="chase-babylon-canvas" />
```

`StudioEngine` receives the canvas element on mount and runs the render loop.

## State Bridge

| CHASE Shell State | Engine Action |
|-------------------|---------------|
| `qualityMode` | `applyQualityProfile()` — shadows, MSAA, pipeline FX |
| `activeCameraId` | Switch `ArcRotateCamera` by `metadata.chaseCameraId` |
| `selectedObjectId` | Select mesh + attach gizmo |
| `desk.*` | Update desk material, screen plane, floor reflection |
| `viewportMode` | 3D perspective vs 2D top orthographic |
| `showSafeArea` | CSS overlay (shell) — no engine cost |
| Asset panel object add | `addSceneObject()` |
| Studio pack select | `loadEditorProject()` (M2) |

Engine → Shell events:

| Engine Event | Shell Action |
|--------------|--------------|
| Mesh picked | `SET_OBJECT`, `SET_LAYER` |
| FPS sample | `UPDATE_ENGINE_FPS` (metrics) |
| Scene ready | `SET_ENGINE_READY` |

## Scene Sources

### M1 — Default Broadcast Studio

`defaultStudioScene.ts` builds a procedural newsroom matching CHASE layer names:

- `desk` — News Desk (selectable, gizmo target)
- `led-main`, `led-side` — LED walls
- `lights` — Pillar light rigs
- `floor` — Floor ring
- `plant` — Decor plant
- `chase_cam1` … `chase_cam6` — Camera strip shots

### M2+ — Editor Projects

Use `babylonjs-editor-tools` loader:

```typescript
import { loadScene } from 'babylonjs-editor-tools';

await loadScene('/scenes/apex/', 'scene.babylon', scene, scriptsMap, {
  quality: 'medium', // maps from CHASE qualityMode
});
```

Place exported Editor projects in `public/scenes/{pack-id}/`.

Workflow:

1. Author sets in Babylon.js Editor desktop app
2. Export to `public/scenes/`
3. CHASE Asset Panel pack button calls `StudioEngine.loadPack(packId)`

## Quality Mapping

| CHASE Mode | Editor Loader Quality | Engine Settings |
|------------|----------------------|-----------------|
| Low | `very-low` | No SSAO/SSR, 1 shadow, hardware scaling 0.75 |
| Balanced | `medium` | Default pipeline, 2 shadows |
| High | `high` | Full pipeline, MSAA 4x |

## Files

| File | Purpose |
|------|---------|
| `src/engine/StudioEngine.ts` | Engine lifecycle, cameras, gizmos, selection |
| `src/engine/defaultStudioScene.ts` | M1 starter broadcast set |
| `src/engine/qualityProfile.ts` | Tier configuration |
| `src/engine/sceneRegistry.ts` | Object ID ↔ mesh metadata |
| `src/context/EditorBridgeContext.tsx` | React bridge |
| `src/components/viewport/ViewportCanvas.tsx` | Canvas mount + resize |
| `vendor/babylon-editor/EDITOR_AUDIT.md` | Fork keep/remove audit |

## Fork Maintenance

```powershell
npm run setup:editor-fork
```

Track upstream `tools/` changes. Prefer npm `babylonjs-editor-tools` for runtime; fork only when patches are needed.

## Out of Scope (M1)

- Tauri file dialogs for Open/Save
- RTMP / recording
- Editor undo stack (shell undo is UI-only until M2)
- Full `project.editorproject` load (M2)

## Milestone 2

- Asset Panel packs call `StudioEngine.loadPack()` and append Editor exports with
  `babylonjs-editor-tools` `loadScene()`.
- `.glb` and `.gltf` files can be dropped on the Asset Panel or viewport. Related
  files in the same drop are registered with Babylon's file store.
- Timeline and Inspector layer lists subscribe to live scene-graph events instead
  of relying on the mock layer list.
