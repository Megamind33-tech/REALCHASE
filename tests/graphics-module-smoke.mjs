// Graphics module browser smoke test (ADDITIVE — new file).
//
// Drives the real Broadcast Graphics workspace and asserts REAL behavior using
// the existing data-testids (src/components/shell/GraphicsPanel.tsx):
//   1. Add a lower third via `add-graphic-lowerThird`; assert a row
//      (`graphic-row-<id>`) renders and is NOT already on air.
//   2. Play it on air via the detail-panel `editor-air-toggle`; assert the row
//      shows the red "ON AIR" badge and the toggle flips to "Take Off Air".
//   3. Take it back off air and assert the ON AIR badge disappears (the toggle
//      is a real two-way control, not a fake latch).
//
// Booting + Chromium launch are handled by tests/_smoke-harness.mjs. Exits
// non-zero on any failure.

import { gotoModule, openApp, runSmoke } from './_smoke-harness.mjs';

await runSmoke('graphics module smoke', async ({ browser }) => {
  const { page, pageErrors } = await openApp(browser);

  await gotoModule(page, 'Graphics', 'graphics-surface');

  // 1. Add a lower third.
  await page.getByTestId('add-graphic-lowerThird').click();
  const row = page.locator('[data-testid^="graphic-row-"]').first();
  await row.waitFor({ state: 'visible', timeout: 15_000 });
  const rowTestId = await row.getAttribute('data-testid');
  if (!rowTestId) throw new Error('graphic row did not expose a data-testid after adding a lower third');
  if ((await row.getByText('ON AIR', { exact: true }).count()) > 0) {
    throw new Error('newly added graphic is already showing ON AIR before being played');
  }

  const airToggle = page.getByTestId('editor-air-toggle');
  await airToggle.waitFor({ state: 'visible', timeout: 15_000 });
  if (!/Play On Air/i.test(await airToggle.innerText())) {
    throw new Error(`editor-air-toggle should read "Play On Air" at idle, got "${await airToggle.innerText()}"`);
  }

  // 2. Play it on air and assert the row reflects the ON AIR state.
  await airToggle.click();
  await row.getByText('ON AIR', { exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
  if (!/Take Off Air/i.test(await airToggle.innerText())) {
    throw new Error(`editor-air-toggle should read "Take Off Air" once on air, got "${await airToggle.innerText()}"`);
  }

  // 3. Take it off air again — the badge must clear (real two-way toggle).
  await airToggle.click();
  await row.getByText('ON AIR', { exact: true }).waitFor({ state: 'detached', timeout: 15_000 });
  if (!/Play On Air/i.test(await airToggle.innerText())) {
    throw new Error(`editor-air-toggle should return to "Play On Air" after taking off air, got "${await airToggle.innerText()}"`);
  }

  if (pageErrors.length) throw new Error(`Browser page errors: ${pageErrors.join(' | ')}`);
  console.log(`[graphics module smoke] added ${rowTestId}, played ON AIR and back off`);
});
