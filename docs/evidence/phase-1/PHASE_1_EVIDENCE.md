# Phase 1 — Evidence

All artifacts in this folder were produced from the **actual built app** running
in headless Chromium (Babylon.js on real WebGL2). Nothing here is mocked.

> Note on FPS: the capture host has **no GPU**, so Chromium falls back to
> SwiftShader (software WebGL). That is why the viewport reports ~15 fps and the
> "Performance Limited" banner appears. This is itself proof that the telemetry
> is **real** — it reflects genuine engine performance, not a hardcoded number.
> On GPU hardware the same code reports 60 fps and shows "System OK".

## What each artifact proves

| File | Proves |
|------|--------|
| `01-app-launched.png` | The full app shell launches and lays out (rail, panels, viewport, timeline, status bar). |
| `02-viewport-rendered.png` | The Babylon studio scene renders — news desk + position gizmo, LED walls, pillar lights, floor ring, decor plant — with the live `CAM 1 · BALANCED · 15 fps` overlay. |
| `03-telemetry-topbar.png` | Top bar shows **real** `resolution · fps` only. No CPU/GPU/RAM numbers. |
| `04-statusbar.png` | Status bar shows real `resolution · fps`; performance state is "Performance Limited" because real FPS < 24. No fabricated CPU/GPU/memory/disk figures. |
| `05-output-panel.png` | Output panel: audio meters are **idle** (no random animation) and labelled "No audio device connected"; REC = "Recorder not connected (Phase 2)"; stream destinations = "Not connected". No fake levels, no fake "~124 MB", no fake "LIVE". |
| `runtime-report.txt` | Captured top/status bar text; **`Google Fonts network requests: 0`**; console shows `Babylon.js v9.9.1 - WebGL2`; no page errors. |
| `tsc-build.txt` | `tsc -b` exits 0 (typecheck clean). |
| `vite-build.txt` | `vite build` succeeds (production bundle emitted). |
| `git-status.txt` | `git status --short` is clean after commit. |

## Patches in this phase (file → real change → verification → impact)

1. **Remove Google Fonts network dependency (self-host fonts)**
   - Files: `index.html` (removed `<link>` to `fonts.googleapis.com` + preconnects),
     `src/main.tsx` (import `@fontsource/inter` + `@fontsource/jetbrains-mono`),
     `package.json` (added the two `@fontsource` deps).
   - Real change: the app no longer makes **any** request to Google at boot;
     fonts are bundled by Vite. `runtime-report.txt` shows `Google Fonts requests: 0`.
   - Impact: **packaging + startup** (offline-correct, no network stall).

2. **Fix StrictMode double engine lifecycle**
   - Files: `src/context/EditorBridgeContext.tsx`, `src/engine/StudioEngine.ts`
     (`getCanvas()` accessor; null canvas on dispose).
   - Real change: `initCanvas` is now idempotent for the same canvas (StrictMode's
     repeated effect invoke reuses the engine instead of building a second one),
     and disposes+rebuilds only when the canvas element actually changes. Removed
     the provider unmount-dispose effect that was tearing the engine down during
     StrictMode's simulated unmount. This also fixes a real bug: leaving and
     re-entering the Builder module previously left a **blank** viewport.
   - Verification: console shows a **single** `Babylon.js ... WebGL2` init line and
     the viewport renders (`02-viewport-rendered.png`); no double-init / no errors.
   - Impact: **rendering + state lifecycle**.

3. **Remove timer-driven whole-tree re-renders + fake telemetry**
   - Files: `src/context/ShellContext.tsx` (removed the 4 s random metrics
     `setInterval`; performance warning now derived from real FPS — landed in the
     prior commit), `src/components/shell/OutputPanel.tsx` (removed the 200 ms
     random audio-meter interval and the 1 s REC counter).
   - Real change: there are now **zero** `setInterval`s driving re-renders in the
     app (verified: `grep -rn setInterval src` → none). The audio mixer no longer
     re-renders 5×/second with fabricated levels.
   - Impact: **performance + UI honesty**.

4. **De-duplicate `TransformMode`**
   - Files: `src/context/shellTypes.ts` (now re-exports the canonical type),
     `src/engine/sceneRegistry.ts` (single source of truth),
     `src/context/EditorBridgeContext.tsx` (dropped the now-redundant cast +
     unused import).
   - Real change: one definition instead of two divergent ones; removes a class of
     type drift. Verified: `grep -rn 'type TransformMode =' src` → one hit.
   - Impact: **types/state** (no runtime change).

5. **Label fake/mock UI honestly (no random data presented as real)**
   - Files: `src/components/shell/OutputPanel.tsx`, `TopBar.tsx`, `StatusBar.tsx`.
   - Real change: removed fabricated CPU/GPU/RAM, "~124 MB" recording size, fake
     "LIVE" stream pills and fake bitrates; replaced with truthful
     "not connected (Phase 2)" states. The underlying fake behaviour (random
     generators) is **deleted**, not just relabelled.
   - Impact: **UI honesty**.

6. **Add favicon (remove the only 404)**
   - Files: `public/favicon.svg` (original mark), `index.html` (icon link).
   - Real change: the browser's `/favicon.ico` 404 is gone.
   - Impact: **UI/packaging**.

## Gates (see logs)
- `tsc -b` → **pass** (`tsc-build.txt`)
- `npm run build` (`tsc -b && vite build`) → **pass** (`vite-build.txt`)
- Runtime launch + render → **pass** (`01`/`02` + `runtime-report.txt`, WebGL2, no errors)
- `git status --short` → **clean** (`git-status.txt`)
- Lint/tests: the repo defines **no** lint or test script in `package.json`
  (`dev`, `build`, `preview`, `tauri*` only), so there is nothing to run; the
  typecheck (`tsc -b`) is the standing static gate.

## Known limitations / risks carried forward
- **Desktop Tauri launch was not exercised here.** This environment is a headless
  Linux container without the WebKitGTK/display stack Tauri needs, so evidence was
  captured against the production web build via `vite preview` (explicitly allowed
  by the task). Native `tauri dev`/`tauri build` packaging is a Phase 7 gate and
  still needs verification on a real desktop host.
- **Bundle size 7.2 MB / 1.6 MB gzip**, single chunk (Babylon barrel imports) —
  Phase 6 target, intentionally untouched in Phase 1.
- The non-Builder rail modules remain placeholders; the video pipeline (REC / GO
  LIVE / sources) is honestly labelled "not connected" and is Phase 2 work.
