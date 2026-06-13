# CHASE PRO — Next Implementation Step Plan

This document outlines the immediate next implementation stage for CHASE PRO.

---

## Recommended Stage: CHASE Studio Builder Shell Integration

The primary objective of the next stage is to establish the 3D editor viewport and browser framework using Babylon.js and its editor tools runtime, while embedding it within the proprietary CHASE AppShell.

### Key Focus Areas
1. **Convert BabylonJS/Editor into CHASE Studio Builder Shell**:
   - Establish the main viewport inside CHASE `ViewportCanvas` component (located at `src/components/viewport/ViewportCanvas.tsx`).
   - Integrate `StudioEngine` (located at `src/engine/StudioEngine.ts`) with `@babylonjs/core` and `babylonjs-editor-tools` to enable:
     - Viewport rendering.
     - Scene node loading and serialization (saving/loading `.babylon` and `.editorproject` structures).
     - Camera navigation, lights, and mesh transforms (Gizmos).
2. **Preserve Editor Viewport and Inspector Mechanics**:
   - Bind the asset panel to `StudioEngine.loadPack()` to support drag-and-drop loading of 3D assets into the viewport.
   - Sync the Scene Graph (layers list) and Inspector properties (mesh properties, transforms, camera options) between React components and the Babylon scene node tree using the `EditorBridgeContext`.
3. **AppShell Layout Polish**:
   - Mount the viewport canvas at `#babylon-viewport` while ensuring all other panels (CameraStrip, Timeline, OutputPanel, Inspector) wrap correctly around it.

---

## What to Avoid in the Next Stage
> [!WARNING]
> Do not jump straight to streaming, MediaMTX routing, OBS controls, CasparCG templates, or TV automation before the Studio Builder core viewport is fully working and stable. The 3D viewport and scene editor are the structural foundations of CHASE PRO.
