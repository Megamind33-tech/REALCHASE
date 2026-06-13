# Outputs / Audio / Settings Demo-Removal Evidence

## What changed
- Stream destination UI now says streaming is disabled until MediaMTX/output pipeline is added; destination management is disabled.
- GO LIVE and REC remain disabled in the TopBar, and reducer actions no longer set fake active recording/streaming state.
- Audio meters and mock routing controls were removed from the active output panel and replaced with an honest no-audio-engine empty state.
- Source health badges are derived from actual source/reconnect/error/MediaStream track state.
- 3D camera strip entries are labelled as Viewpoints and no longer use fake video thumbnails or broadcast source language.
- Studio pack cards are disabled because `public/scenes/<pack-id>/scene.babylon` files are absent; glTF/glb drag/drop import remains real.
- Presenter beautify controls are not exposed as active controls; presenter work remains source placement/keying foundation only.
- Settings/status bar no longer shows fake autosave recency or active backup workflow controls.

## Evidence files
- `app-launch.png` — not captured because browser installation was blocked in this container; see `app-launch-screenshot-blocked.txt` and `playwright-install.txt`. No screenshot was fabricated.
- `app-launch-http.txt` — dev server returned HTTP 200.
- `tsc-build.txt` — TypeScript check output.
- `vite-build.txt` — production build output.
- `lint-test.txt` — lint/test script status.
- `git-status-before-commit.txt` — dirty status before commit for traceability.

## Manual checks recorded
1. Stream destination UI no fake connected states: Output panel labels destinations as disabled until MediaMTX/output pipeline.
2. GO LIVE/streaming controls disabled: TopBar buttons are disabled with engine requirement labels.
3. Fake audio meters removed: Output panel uses no-audio-engine empty state.
4. Fake source health removed: switcher source badge derives from MediaStream track/reconnect/error state.
5. 3D camera thumbnails are viewpoints: camera strip uses Viewpoint labels and disabled Add Viewpoint.
6. Pack loading honest: pack cards are disabled and document expected `scene.babylon` path.
7. Presenter beautify controls absent: inspector presenter/keying tabs do not expose skin/teeth/beauty controls.
8. Settings honesty: status bar autosave/backup/live chat no longer appear as active production systems.
