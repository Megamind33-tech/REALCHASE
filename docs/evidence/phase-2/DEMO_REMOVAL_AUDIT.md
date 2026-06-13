# Phase 2 Demo Removal Audit

## Real and wired controls
- Add Webcam requests a real `getUserMedia` video stream.
- Preview, Program, and CUT are wired to real source state; CUT routes Preview to Program.
- Placement mode selector is wired for `mediaPlane`, `screenInsert`, and `presenterPlate`.
- Screen target selection is wired to Babylon screen mesh identifiers.
- Save Project writes a `.chaseproj` JSON project file through Tauri dialog/fs APIs when available, with a browser file-system fallback.
- Open Project reads a `.chaseproj` JSON file, validates schema version, restores source metadata, and marks live sources as needing reconnection.

## Disabled because not wired
- Timeline transport controls are disabled and labelled as not wired until real playback/editing exists.
- Timeline record cue is disabled and labelled as requiring a recording engine.
- Transitions are labelled “Not wired yet” because no real transition compositor affects Program output.
- REC is disabled and labelled as requiring a recording engine.
- GO LIVE is disabled and labelled as requiring a streaming engine.
- `backgroundPlate` is visible only as a disabled placement option until a real output/background pipeline is implemented.

## Removed because they were fake
- Active-looking project service toast for Save/Open was replaced by real Save/Open handlers.
- Timeline play/pause, skip, loop, and record cue actions no longer mutate fake playback/recording state.
- Fake production-ready REC/LIVE wording was replaced with explicit engine requirements.

## Remaining demo-looking areas
- Some modules still exist as navigation shells before their engines are implemented.
- Imported studio pack progress depends on real loader state, but packaged set libraries still need production curation.
- Audio meters and stream destinations require further audit in the outputs/audio modules before enabling.

## Next safest cleanup patch
- Continue through outputs/audio/settings modules and disable any active-looking meters, destinations, or health badges that are not backed by real devices or services.
