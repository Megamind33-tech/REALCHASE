# CHASE PRO — Engine Boundaries and Integration Strategy

This document defines how each external project or fork connects to CHASE PRO, classifying them by architectural integration boundaries and license safety limits.

---

## Integration Classification

### 1. Direct Fork Candidate
These projects are directly adapted, customized, and embedded within the CHASE PRO application codebase or structured as modified forks.
* **BabylonJS/Editor**
  * *Path*: `/forks/3d/babylon-editor`
  * *License*: Apache-2.0 (Safe to modify)
  * *Integration Plan*:
    * The Electron packaging, splash, dashboard, and templates are discarded.
    * Only `babylonjs-editor-tools` runtime logic and editor-compatible scene load/save structures are used.
    * The UI panels (layers list, viewport wiring, inspector bindings) are built directly inside CHASE PRO using React components, communicating with the editor viewport via `EditorBridge`.

### 2. Runtime / Dependency
These projects are used as-is from standard distributions (e.g. npm packages, native library dynamic links) without modifying their source code inside the CHASE repo.
* **BabylonJS/Babylon.js**
  * *Path*: `/forks/3d/babylon-js`
  * *License*: Apache-2.0
  * *Integration Plan*: Loaded as `@babylonjs/core` and related packages from standard npm packages pinned to version 9.9.1. The source repo remains in `/forks/3d/babylon-js` for reference and diff checks.
* **playcanvas/engine**
  * *Path*: `/forks/3d/playcanvas-engine`
  * *License*: MIT
  * *Integration Plan*: Kept for performance benchmarking and runtime comparisons. If selected as an alternative viewport engine, it will be loaded as a runtime dependency.
* **gstreamer/gstreamer**
  * *Path*: `/forks/media/gstreamer`
  * *License*: LGPL-2.1
  * *Integration Plan*: Integrated via GStreamer system libraries and dynamically loaded Rust/JavaScript bindings. Do not compile GStreamer source inside the CHASE PRO app; consume it as a standard package.

### 3. External Process Only
These engines must run as separate, isolated OS processes. Interaction is restricted to networking (WebSocket, OSC, HTTP) or IPC (Inter-Process Communication) to avoid license infection.
* **CasparCG/server**
  * *Path*: `/forks/graphics/casparcg-server`
  * *License*: GPL-3.0 (Copyleft Risk)
  * *Integration Plan*: Must run as an external graphic/playout process. CHASE PRO will communicate with it via AMCP (Advanced Media Control Protocol) commands over TCP. No CasparCG source code may be compiled or statically linked with proprietary CHASE modules.
* **bluenviron/mediamtx**
  * *Path*: `/forks/media/mediamtx`
  * *License*: MIT (Permissive, but run as process)
  * *Integration Plan*: MediaMTX is a Go-based media server. It runs as a background process packaged with the desktop installer. Interaction is done via its REST API (config changes, active streams listing) and media ingestion (RTSP/RTMP/SRT).

### 4. Reference Only
These sources are strictly used as design references, code samples, or workflow ideas. Their code is never cloned or imported into the active CHASE PRO source.
* **obsproject/obs-studio**
  * *Path*: `/forks/reference/obs-studio`
  * *License*: GPL-2.0 (Copyleft Risk)
  * *Integration Plan*: Reference only for audio mixer design, source capture abstractions, and plugin models.
* **Sofie-Automation/Sofie-TV-automation** & **sofie-core**
  * *Path*: `/forks/automation/*`
  * *License*: MIT
  * *Integration Plan*: Reference only for rundown UI layouts, cue list triggering, and state timeline calculation algorithms.
* **datarhei/restreamer**
  * *Path*: `/forks/media/restreamer`
  * *License*: Apache-2.0
  * *Integration Plan*: Reference only for designing user-friendly streaming management UIs.
* **google/filament**
  * *Path*: `/forks/3d/filament`
  * *License*: Apache-2.0
  * *Integration Plan*: Future native rendering investigation only. Avoid integrating at this stage.

---

## Summary Matrix

| Repository | License | Boundary | Communication | Code Merging |
|:---|:---|:---|:---|:---|
| **BabylonJS/Editor** | Apache-2.0 | **Internal Fork** | Direct Import / Bridge | Allowed (Extracted components) |
| **BabylonJS/Babylon.js** | Apache-2.0 | **Dependency** | npm package imports | Not Allowed (Use npm) |
| **playcanvas/engine** | MIT | **Dependency** | npm package imports | Not Allowed (Use npm) |
| **google/filament** | Apache-2.0 | **Reference** | None | Not Allowed |
| **bluenviron/mediamtx** | MIT | **Process / Service** | REST API / IPC / RTMP | Not Allowed (Executable package) |
| **gstreamer/gstreamer** | LGPL-2.1 | **Library / Bindings** | C-bindings / FFI | Not Allowed (Dynamic link only) |
| **datarhei/restreamer** | Apache-2.0 | **Reference** | None | Not Allowed |
| **CasparCG/server** | GPL-3.0 | **Process Only** | TCP (AMCP Protocol) | **STRICTLY FORBIDDEN** |
| **Sofie TV / Core** | MIT | **Reference** | None | Not Allowed |
| **obs-studio** | GPL-2.0 | **Reference** | None | **STRICTLY FORBIDDEN** |
