// AR module browser smoke test (ADDITIVE — new file).
//
// Drives the real Broadcast AR workspace and asserts REAL behavior using the
// existing data-testids (src/components/shell/ModuleWorkspaces.tsx):
//   1. Add an AR card element via `add-ar-card`; assert a row (`ar-row-<id>`)
//      renders.
//   2. Toggle it on air via the detail-panel `ar-air-toggle`; assert the row
//      reflects the ON AIR state (the red "ON AIR" badge appears in the row and
//      the detail toggle now reads "Take Off Air").
//   3. Switch the card's data template to "stat" via the "AR template" select
//      and confirm the stat fields ("value" / "caption") appear as editable
//      inputs (aria-label "AR field value" / "AR field caption").
//
// Booting + Chromium launch are handled by tests/_smoke-harness.mjs (mirrors the
// perf-stress self-contained server boot: builds + `vite preview` if nothing is
// already serving CHASE_VISUAL_BASE_URL). Exits non-zero on any failure.

import { gotoModule, openApp, runSmoke } from './_smoke-harness.mjs';

await runSmoke('ar module smoke', async ({ browser }) => {
  const { page, pageErrors } = await openApp(browser);

  await gotoModule(page, 'AR', 'ar-surface');

  // 1. Add a "card" AR element. Capture the new row's testid (it is keyed by
  // the element's generated id, so we discover it after the add).
  await page.getByTestId('add-ar-card').click();
  const row = page.locator('[data-testid^="ar-row-"]').first();
  await row.waitFor({ state: 'visible', timeout: 15_000 });
  const rowTestId = await row.getAttribute('data-testid');
  if (!rowTestId) throw new Error('AR row did not expose a data-testid after adding a card');

  // The fresh row must NOT already be on air (no fake active state).
  if ((await row.getByText('ON AIR', { exact: true }).count()) > 0) {
    throw new Error('newly added AR element is already showing ON AIR before being toggled');
  }
  const airToggle = page.getByTestId('ar-air-toggle');
  await airToggle.waitFor({ state: 'visible', timeout: 15_000 });
  if (!/Put On Air/i.test(await airToggle.innerText())) {
    throw new Error(`ar-air-toggle should read "Put On Air" at idle, got "${await airToggle.innerText()}"`);
  }

  // 2. Put it on air and assert the row reflects the ON AIR state.
  await airToggle.click();
  await row.getByText('ON AIR', { exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
  if (!/Take Off Air/i.test(await airToggle.innerText())) {
    throw new Error(`ar-air-toggle should read "Take Off Air" once on air, got "${await airToggle.innerText()}"`);
  }

  // 3. Switch the data template to "stat" and confirm stat fields appear.
  const template = page.getByLabel('AR template', { exact: true });
  await template.waitFor({ state: 'visible', timeout: 15_000 });
  await template.selectOption('stat');
  await page.getByLabel('AR field value', { exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByLabel('AR field caption', { exact: true }).waitFor({ state: 'visible', timeout: 15_000 });

  // The on-air state must survive the template switch (real, persistent state).
  await row.getByText('ON AIR', { exact: true }).waitFor({ state: 'visible', timeout: 15_000 });

  if (pageErrors.length) throw new Error(`Browser page errors: ${pageErrors.join(' | ')}`);
  console.log(`[ar module smoke] added ${rowTestId}, toggled ON AIR, stat fields rendered`);
});
