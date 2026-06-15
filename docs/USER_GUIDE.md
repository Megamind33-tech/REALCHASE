# Chase Studio Pro — User Guide

Chase Studio Pro is a virtual broadcasting studio built on React 19 and Babylon.js.
You build a 3D set, route live sources into it, layer graphics and AR, cue the show
on a timeline, and send the composite to recording / streaming outputs.

This guide reflects what is actually implemented. Where a feature depends on a
real output pipeline or device capability that is not yet wired, the UI says so
plainly and this guide does too.

You can open an in-app version of this reference at any time with the **?** button
in the status bar (bottom right), or by pressing **?** / **F1**.

---

## Quick start

1. **Add a source.** Open **Switcher** and add a webcam, screen capture, video file,
   or image. Each source appears in the list with a live status badge (TRACK LIVE /
   NO LIVE TRACK / NEEDS RECONNECT) derived from the real MediaStream track state.
2. **Stage and CUT.** Click **To Preview** on a source to stage it, then press **CUT**
   to send Preview to Program. The Program source is placed in the Babylon scene as a
   real object (mediaPlane, screenInsert, or presenterPlate placement).
3. **Build the set.** Open **Builder**. Drag-and-drop glTF / GLB files onto the
   viewport to import them. Select an asset and press **Delete** or **Backspace** to
   remove it from the scene.
4. **Add graphics and AR.** Use **Graphics** for lower-thirds, logos, and tickers.
   Use **AR** to wire a data-endpoint URL that drives AR elements.
5. **Cue the show.** On the Builder **timeline**, move the playhead and add camera or
   graphic cues with the toolbar buttons. Cues fire automatically during playback and
   scrubbing.
6. **Light and mix.** Adjust lights in **Lighting**, switch cameras in **Cameras**,
   and balance levels in the **Audio** mixer.
7. **Output.** Open **Outputs** to see the composite Program preview, recording
   controls, and stream-destination fields.

---

## Keyboard and pointer interactions

These are the interactions that genuinely exist in the app today:

| Interaction | Behavior |
| --- | --- |
| `?` or `F1` | Toggle the in-app Help overlay (ignored while typing in a field) |
| `Esc` | Close the Help overlay |
| `Delete` / `Backspace` | In the Builder viewport, remove the selected imported asset or group (ignored while typing in a field) |
| Drag + drop | Drop glTF / GLB files onto the viewport (or the Assets panel) to import them |
| Double-click | Double-click the timeline header to collapse / expand the timeline |
| Click / drag | Click or drag the timeline ruler to scrub the playhead |
| `Enter` | Commit an inline rename in Scenes, Scene Outliner, or a Switcher source name |
| `Esc` | Cancel an inline rename in Scenes / Scene Outliner |

Transport (jump-to-start, step ±1s, play/pause, stop, loop), cue authoring, and the
Switcher CUT are all on-screen buttons rather than keyboard shortcuts.

---

## Modules

The left rail switches between modules.

### Builder
The 3D set editor. A Babylon viewport renders the live set. Import meshes by
drag-and-drop, select and remove them, and use the **timeline** at the bottom to
author and play back cues.

- **Timeline transport:** jump-to-start, step back/forward one second, play/pause,
  stop (returns to start), and loop toggle — all as buttons under the cue list.
- **Cues:** add a camera-cut cue (uses the current active camera) or a graphic
  show/hide cue at the playhead. Cue markers appear on the ruler; cues fire live
  during playback and while you scrub.
- **Scrubbing:** click or drag the ruler to move the playhead.

### Switcher
Routes live video sources to Preview and Program.

- Add webcam, screen-capture, video-file, or image sources.
- Each source shows a status badge based on the real MediaStream track state.
- Stage a source **To Preview**, then **CUT** to send Preview to Program.
- The Program source is composited into the 3D scene as a real Babylon object using
  the implemented placement modes (mediaPlane, screenInsert, presenterPlate).
- Per-source keying (chroma key) and placement settings are adjustable.

### Scenes
Manage scenes/layouts. Create, select, and rename scenes (rename commits with
`Enter`, cancels with `Esc`).

### Assets
The asset library. Import files (including via drag-and-drop) for use in the set.

### Graphics
Author broadcast graphics — lower-thirds, logos, tickers, and similar overlays.
The selected graphic is the target for timeline graphic-on / graphic-off cues.

### AR
Wire a data-endpoint URL (commit with `Enter`) to drive AR elements from live data.

### Overlays
Manage overlay layers composited over the program.

### Lighting
Adjust the set lighting in the Babylon scene.

### Cameras
Manage virtual cameras and the active camera used for camera-cut cues. The camera
strip provides quick camera selection.

### Audio
The audio mixer. Live audio sources expose per-source meters driven by the real
audio tracks.

### Scripts
The rundown / script module for organizing show segments.

### Outputs
Recording and streaming surface.

- **Composite preview** of the Program output.
- **Recording** via the browser MediaRecorder, with a selectable recording format
  gated by what the browser actually supports, plus live telemetry (bytes, bitrate,
  MIME type).
- **Stream destinations** with server / stream-key fields. Live streaming is gated on
  a real output pipeline; the UI states clearly when a capability is not yet wired.

### Settings
App preferences, including **Compact** mode and **Reduced Motion** toggles (also
surfaced in the status bar while the Settings module is active).

---

## WebXR preview

The viewport offers a **headset/device WebXR preview** for viewing the virtual set in
VR or AR. The Enter VR / Enter AR buttons are capability-gated and enabled only when
`navigator.xr` reports support over HTTPS (a headset for VR, an AR-capable device for
AR). This is a headset/device preview, not broadcast AR.

---

## Recording and streaming

- **Recording** uses the browser's MediaRecorder against the composite output. The
  available recording formats are limited to what the browser reports as supported,
  and recording telemetry reflects the real encoder state.
- **Streaming** destination fields exist, but live streaming depends on a real output
  pipeline. Until that pipeline is connected, the relevant controls are disabled and
  labeled accordingly rather than faking a connected state.

---

## Status bar

The status bar (bottom of the window) shows engine status, resolution and FPS, and a
performance-limited warning when applicable. The **?** button opens the Help overlay.
