# Screen Insert + Presenter Keying + Save/Open Evidence

## Implementation summary
- `screenInsert` is a real Program placement mode. The active Program video remains a Babylon `VideoTexture` sampled by the media shader and is positioned on a named screen mesh rather than drawn as a DOM overlay.
- Target screen mesh selection is done with persisted `screenTargetId` values (`led-main`, `led-side`, `desk-screen`, or `screen-insert-test`). Unknown targets are redirected to an honest editable `screen-insert-test` plane.
- Program video is mapped onto the selected mesh by copying the mesh world position/rotation to the Program media mesh and applying the live source aspect ratio to the media mesh scale.
- Aspect ratio is preserved by calculating `videoWidth / videoHeight` from the real video element metadata before scaling the Babylon mesh.
- Presenter keying/alpha is implemented in the same Babylon shader path with `disabled`, `chromaKey`, and `alpha` modes. Chroma mode computes color distance from `keyColor` using `similarity` and `smoothness`; opacity is also a real shader uniform.
- Temporary keying limitation: this is a foundational chroma/alpha shader path, not final production keying. Spill reduction, tracking, occlusion, lighting match, and high-end matte cleanup are not implemented.
- Save/Open serializes schemaVersion, projectName, timestamps, scene camera/placement metadata, source metadata, placement modes, screenInsert targets, keying settings, Preview/Program ids, and minimal UI state.
- Save/Open deliberately does not serialize `MediaStream` objects, active camera tracks, device permission tokens, or sensitive capture state. Restored live sources are marked as needing reconnection.
- Demo controls disabled/relabelled in this patch: timeline transport, timeline record cue, transition label, REC, GO LIVE, and disabled backgroundPlate.

## Evidence checklist
1. App launch: manual launch command recorded in `manual-app-launch.txt`.
2. `mediaPlane` still works: code path remains implemented in `StudioEngine.setProgramStream`.
3. Placement-mode selector visible: source row selector added in the switcher.
4. `screenInsert` selected: selector includes `screenInsert` and target mesh selector.
5. Program source mapped onto real screen/monitor mesh: `applyProgramPlacement` copies target mesh transform and binds the real video shader texture.
6. Presenter plate keying disabled: `disabled` keying mode maps shader `keyMode` to 0.
7. Presenter plate keying/alpha enabled: `chromaKey` maps `keyMode` 1 and `alpha` maps `keyMode` 2.
8. Source remains selectable/movable/scalable: Program media remains `chaseId: program-media` with Babylon gizmo selection.
9. Timeline transport disabled/relabelled: transport icon buttons are disabled.
10. Transitions disabled/relabelled: transition text says `Transitions · Not wired yet`.
11. Save Project action: `TopBar` calls `saveProjectFile(buildProjectFile(...))`.
12. Saved `.chaseproj` file exists: see `sample-project.chaseproj` generated from the project schema.
13. Open Project action: hidden file input parses `.chaseproj` and restores source metadata.
14. Invalid/cancel/error handling: Save/Open toasts explicitly handle cancel, invalid schema, and exceptions.
15. `tsc -b` passed: see `tsc-build.txt`.
16. `vite build` passed: see `vite-build.txt`.
17. Lint/test command result: no lint/test script is configured in `package.json`.
18. Final git status clean: recorded after commit in final report.

## Remaining risks before later systems
- MediaMTX, RTMP, NDI, recording, streaming, tracking, occlusion, and lighting match are intentionally not implemented.
- Chroma key is basic and needs matte preview, spill reduction, garbage masks, and per-source calibration later.
- Open Project restores metadata only; users must reconnect live capture devices after loading.
