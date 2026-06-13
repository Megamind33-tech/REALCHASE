# CHASE PRO — Fork and Source Foundation Audit

This document lists all audited open-source forks and sources collected for the CHASE PRO desktop application.

## Audited Repositories

| Repository / Source | Local Path | Remote URL | Branch | Commit | License | Status | Purpose in CHASE PRO | Notes |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **BabylonJS/Editor** | `/forks/3d/babylon-editor` | `https://github.com/BabylonJS/Editor.git` | `master` | `b1fc3616b27fe1e70e667c1ffedb552890bf1a02` | Apache-2.0 | Downloaded | Primary base for CHASE Studio Builder UI | Cloned upstream. Electron UI is discarded; only `babylonjs-editor-tools` runtime and scene layout/nodes concepts are utilized. |
| **BabylonJS/Babylon.js** | `/forks/3d/babylon-js` | `https://github.com/BabylonJS/Babylon.js.git` | `master` | `73999058f5defdca261c2f1e010bb15f6b197e68` | Apache-2.0 | Downloaded | Lightweight 3D web runtime | Core rendering engine for viewport, scene loaders, lights, cameras, and textures. |
| **playcanvas/engine** | `/forks/3d/playcanvas-engine` | `https://github.com/playcanvas/engine.git` | `main` | `0e2e3f3f45f2e8e751a29a387085d68ca67d956c` | MIT | Downloaded | Lightweight runtime comparison | Secondary WebGL/WebGPU runtime comparison for ultra-low-spec hardware. |
| **google/filament** | `/forks/3d/filament` | `https://github.com/google/filament.git` | `main` | `08a47f8d11ae82afb6ffbeb58a07b209700dcbd6` | Apache-2.0 | Downloaded | Native lightweight PBR renderer | Reference for future native mobile/desktop rendering; no current integration. |
| **bluenviron/mediamtx** | `/forks/media/mediamtx` | `https://github.com/bluenviron/mediamtx.git` | `main` | `e13e9660d19e6744c92d013d86a1257910f82a6d` | MIT | Downloaded | Media router and stream server | Handles local RTMP/SRT/WebRTC ingestion, routing, and recording proxy. |
| **gstreamer/gstreamer** | `/forks/media/gstreamer` | `https://github.com/gstreamer/gstreamer.git` | `main` | `457b297cf0405851736cf78bdb4cb07b46123b57` | LGPL-2.1 | Downloaded | Live media pipeline core | Captures, encodes, decodes, and routes media streams. |
| **datarhei/restreamer** | `/forks/media/restreamer` | `https://github.com/datarhei/restreamer.git` | `2.x` | `fd12aee2a289e9be4fbf45fc1dfa50838cfb149f` | Apache-2.0 | Downloaded | Streaming workflow reference | Used as reference for stream configuration UI and stream target management. |
| **CasparCG/server** | `/forks/graphics/casparcg-server` | `https://github.com/CasparCG/server.git` | `master` | `d603ee91fa568ca38199048d38005b886eba75ba` | GPL-3.0 | Downloaded | Broadcast playout engine | Optional external playout engine for lower thirds and CG overlays. Keep strictly external (GPL risk). |
| **Sofie-Automation/Sofie-TV-automation** | `/forks/automation/sofie-tv-automation` | `https://github.com/Sofie-Automation/Sofie-TV-automation.git` | `main` | `aad82863d37da6fc9b9a4ab3b94df27001be0990` | MIT | Downloaded | Automation & rundown UI reference | Reference for rundown control, cue sheet parsing, and timeline-based playout UI. |
| **Sofie-Automation/sofie-core** | `/forks/automation/sofie-core` | `https://github.com/Sofie-Automation/sofie-core.git` | `main` | `0d939461387606e6e58a5ba6845e81dcbf2b746f` | MIT | Downloaded | Automation core reference | Reference for timeline-state generation and logical device abstraction. |
| **obsproject/obs-studio** | `/forks/reference/obs-studio` | `https://github.com/obsproject/obs-studio.git` | `master` | `fe522d431e3f778808345776d46c1b3978db0399` | GPL-2.0 | Downloaded | Capture & mixer reference | Reference only for audio mixer, scene compositing, and plugin design. Keep strictly external (GPL risk). |

## Key Findings & License Implications

- **Permissive Licences (Apache-2.0 / MIT)**: `BabylonJS/Editor`, `BabylonJS/Babylon.js`, `playcanvas/engine`, `filament`, `mediamtx`, `restreamer`, and `Sofie-Automation` repositories are under MIT or Apache 2.0. They are safe to fork, modify, and integrate directly into the CHASE proprietary application structure.
- **Lesser Copyleft (LGPL-2.1)**: `gstreamer` is licensed under LGPL-2.1. It is safe to use as a dynamically linked dependency (via system packages or precompiled bindings) but its source code should not be statically linked or merged directly into proprietary CHASE modules to avoid licensing complications.
- **Strong Copyleft (GPL-2.0 / GPL-3.0)**: `CasparCG/server` and `obs-studio` are under GPL. They **must remain external processes**. Under no circumstances should any GPL code be copy-pasted or linked directly into proprietary modules of CHASE PRO. They must only be controlled via IPC (Inter-Process Communication) or networking protocols (e.g. WebSocket, OSC, TCP).
