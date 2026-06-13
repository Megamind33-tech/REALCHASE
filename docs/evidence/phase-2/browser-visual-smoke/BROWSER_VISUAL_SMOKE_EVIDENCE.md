# Browser Visual Smoke Evidence

## Browser/test runner
- Test runner: Playwright Chromium via `tests/browser-visual-smoke.mjs` and `npm run test:visual-smoke`.
- Current container status: browser support is **not complete** because Playwright's Chromium executable is not installed and browser CDN installation was previously blocked with HTTP 403.

## App launch
- The app is launched with `npm run dev -- --host 127.0.0.1`.
- The visual smoke test reads `CHASE_VISUAL_BASE_URL`, defaulting to `http://127.0.0.1:1420`.
- The evidence directory can be overridden with `CHASE_VISUAL_EVIDENCE_DIR`; by default screenshots are written to this folder.

## Surfaces captured when a browser is available
The browser smoke path captures:
- `builder-surface.png` from `data-testid="builder-surface"`.
- `switcher-surface.png` from `data-testid="switcher-surface"`.
- `outputs-surface.png` from `data-testid="outputs-surface"`.

## Test IDs used
- `builder-surface`
- `switcher-surface`
- `outputs-surface`
- `stream-destination-panel`
- `audio-meter-panel`
- `live-status`
- `record-status`

## Fake-production states blocked
The test fails visible runtime state containing fake active terms such as:
- `excellent`, `healthy`, `stable`, `online`
- `ready to stream`, active `ready`
- active `LIVE`, active `REC`
- active `streaming`, active `recording`
- `destination connected`, `output healthy`
- active meter/live animation classes in the Outputs surface

## Honest disabled wording allowed
Production terms are allowed only when the same visible line includes disabled/runtime context such as:
- `disabled`
- `not wired`
- `not connected`
- `unavailable`
- `requires`
- `no real`
- `needs reconnect`
- `until MediaMTX/output pipeline is added`
- `until real output pipeline`

## How visible runtime state is checked
The test launches the running Vite app in Playwright, waits for each `data-testid` marker, reads visible `innerText()` from the active surface, validates disabled REC/GO LIVE buttons, checks stream destination and audio panels, rejects active meter/live animation classes, and writes screenshots after each surface passes.

## Current blocker
Screenshots were **not captured in this container** because Playwright could not launch Chromium: the executable is missing. This patch adds the browser-capable path, but it must not be merged to `main` until Chromium/browser support is installed and the command below passes with real PNG screenshots present:

```bash
npm run dev -- --host 127.0.0.1
CHASE_VISUAL_BASE_URL=http://127.0.0.1:1420 npm run test:visual-smoke
# or with a system browser:
CHASE_CHROMIUM_EXECUTABLE=/path/to/chrome CHASE_VISUAL_BASE_URL=http://127.0.0.1:1420 npm run test:visual-smoke
```

Additional install attempt:
- `apt-get update && apt-get install -y chromium` was attempted and failed because the apt proxy returned HTTP 403 for Ubuntu repositories; see `browser-install-attempt.log`.

Required environment fix:
- install Playwright browsers with network access to the Playwright CDN, or
- provide a system Chromium/Chrome executable and set `CHASE_CHROMIUM_EXECUTABLE=/path/to/chrome`, or
- run the command locally in a developer browser-capable environment and commit the real screenshots.

## Remaining gaps
- This visual path is ready but blocked by missing browser support in the container.
- It does not exercise real camera permission flows or real output/audio engines.
- Future real LIVE/REC/connected states must extend the test to verify encoder/egress/source backing before allowing those words.
