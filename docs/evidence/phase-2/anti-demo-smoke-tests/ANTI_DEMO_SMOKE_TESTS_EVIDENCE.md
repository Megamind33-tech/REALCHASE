# Anti-Demo Smoke Tests Evidence

## Test framework used
- A small Node-based smoke test was added at `tests/anti-demo-smoke.mjs` and exposed as `npm run test:anti-demo`.
- This avoids browser install requirements in the current container while still guarding user-visible shell copy and required surface/test-id coverage.

## Surfaces covered
- Builder surface: `Viewport`, `TopBar`, and `StatusBar`.
- Switcher surface: `SwitcherPanel`, `TopBar`, and `StatusBar`.
- Outputs surface: `OutputPanel`, `TopBar`, and `StatusBar`.

## Forbidden words/states checked
The smoke test blocks active-looking confidence terms including:
- `excellent`
- `healthy`
- `stable`
- `online`
- `ready to stream`
- active `ready`
- active `LIVE`
- active `REC`
- active `streaming`
- active `recording`
- `good signal`
- `low latency`
- `broadcast ready`
- `destination connected`
- `output healthy`

## Honest disabled wording allowed
The test allows production-related words only when the same visible line includes honest disabled/runtime context such as:
- `disabled`
- `not wired`
- `not connected`
- `unavailable`
- `requires`
- `no real`
- `needs reconnect`
- `until MediaMTX/output pipeline is added`
- `until real output pipeline`

`TRACK LIVE` and `NO LIVE TRACK` are allowed because source health is derived from real MediaStream track state rather than hardcoded output confidence.

## Fake active state vs honest disabled state
The test scans the shell source files for visible text candidates containing production terms, then fails when those terms appear without disabled/runtime context. It also asserts stable surface test IDs exist:
- `builder-surface`
- `switcher-surface`
- `outputs-surface`
- `stream-destination-panel`
- `audio-meter-panel`
- `source-health-panel`
- `live-status`
- `record-status`

## Random meter guard
The Outputs surface is checked for forbidden meter implementation markers such as `Meter`, `rec-pulse`, `meter-fill`, or `random`, and it must retain the honest `No real audio source connected` text.

## Future real-state exception
Future real `LIVE`, `REC`, `connected`, or `healthy` states should only be allowed after the UI exposes a verifiable runtime source such as encoder/egress state, real output connection state, or computed health state. The smoke test should then be extended to verify that state source before allowing those words.

## Remaining gaps
- This is a content/static smoke test, not a browser visual test, because Playwright browser installation is blocked in this container.
- It does not replace future end-to-end tests once browser execution is available.
- It focuses on Builder/Switcher/Outputs shared chrome and should be expanded when real output/audio engines land.
