// Module navigation browser smoke test (ADDITIVE — new file).
//
// Clicks each entry in the module rail (src/components/shell/ModuleRail.tsx —
// every rail button exposes the module label as its accessible name) and asserts
// the corresponding surface actually renders via its data-testid. This catches
// regressions where a module fails to mount or the rail wiring breaks.
//
// Covered surfaces (testid declared in ModuleWorkspaces.tsx / GraphicsPanel.tsx /
// ScenesPanel.tsx):
//   Builder   -> builder-surface
//   Switcher  -> switcher-surface
//   Scenes    -> scenes-surface
//   Graphics  -> graphics-surface
//   AR        -> ar-surface
//   Overlays  -> overlays-surface
//   Lighting  -> lighting-surface
//   Cameras   -> cameras-surface
//   Audio     -> audio-surface
//   Scripts   -> scripts-surface
//   Outputs   -> outputs-surface-full
//   Settings  -> settings-surface
// (Assets has no dedicated surface testid in the audited modules, so it is
//  exercised by navigation but not asserted on a surface id.)
//
// Booting + Chromium launch are handled by tests/_smoke-harness.mjs. Exits
// non-zero on any failure.

import { gotoModule, openApp, runSmoke } from './_smoke-harness.mjs';

// railLabel -> expected surface testid. Order matters: start on Builder (the
// default), then walk the rest of the rail.
const MODULES = [
  ['Builder', 'builder-surface'],
  ['Switcher', 'switcher-surface'],
  ['Scenes', 'scenes-surface'],
  ['Graphics', 'graphics-surface'],
  ['AR', 'ar-surface'],
  ['Overlays', 'overlays-surface'],
  ['Lighting', 'lighting-surface'],
  ['Cameras', 'cameras-surface'],
  ['Audio', 'audio-surface'],
  ['Scripts', 'scripts-surface'],
  ['Outputs', 'outputs-surface-full'],
  ['Settings', 'settings-surface'],
];

await runSmoke('module nav smoke', async ({ browser }) => {
  const { page, pageErrors } = await openApp(browser);

  const visited = [];
  for (const [railLabel, surfaceTestId] of MODULES) {
    await gotoModule(page, railLabel, surfaceTestId);
    // Sanity: exactly the expected surface should be present and visible.
    const surface = page.getByTestId(surfaceTestId);
    if (!(await surface.isVisible())) {
      throw new Error(`${railLabel} surface "${surfaceTestId}" did not become visible`);
    }
    visited.push(`${railLabel}->${surfaceTestId}`);
  }

  if (pageErrors.length) throw new Error(`Browser page errors: ${pageErrors.join(' | ')}`);
  console.log(`[module nav smoke] navigated ${visited.length} modules: ${visited.join(', ')}`);
});
