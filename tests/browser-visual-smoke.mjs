import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.CHASE_VISUAL_BASE_URL ?? 'http://127.0.0.1:1420';
const evidenceDir = resolve(process.env.CHASE_VISUAL_EVIDENCE_DIR ?? 'docs/evidence/phase-2/browser-visual-smoke');
mkdirSync(evidenceDir, { recursive: true });

const forbiddenTerms = [
  /\bexcellent\b/i,
  /\bhealthy\b/i,
  /\bstable\b/i,
  /\bonline\b/i,
  /ready to stream/i,
  /good signal/i,
  /low latency/i,
  /broadcast ready/i,
  /destination connected/i,
  /output healthy/i,
];

const honestContext = /(disabled|not wired|not connected|unavailable|requires|no real|needs reconnect|until mediamtx\/output pipeline is added|until real output pipeline|requires streaming engine|requires recording engine)/i;

async function assertNoFakeProductionText(page, surfaceTestId) {
  const surface = page.getByTestId(surfaceTestId);
  await surface.waitFor({ state: 'visible', timeout: 15_000 });
  const text = await surface.innerText();
  for (const term of forbiddenTerms) {
    if (term.test(text)) throw new Error(`${surfaceTestId} shows forbidden fake-production text matching ${term}:\n${text}`);
  }
  for (const line of text.split(/\n+/).map((value) => value.trim()).filter(Boolean)) {
    // Mirror the authoritative anti-demo gate: the acronyms LIVE/REC are
    // case-sensitive (so "live input" as an adjective is fine), while
    // streaming/recording/connected/ready are matched case-insensitively.
    const activeProduction = /\bLIVE\b|\bREC\b/.test(line) || /\bready\b|streaming|recording|connected/i.test(line);
    const realSourceTrackState = /TRACK LIVE|NO LIVE TRACK/i.test(line);
    if (activeProduction && !realSourceTrackState && !honestContext.test(line)) {
      throw new Error(`${surfaceTestId} has active-looking production copy without honest disabled context: "${line}"`);
    }
  }
}

// REC and GO LIVE are real controls (PR #18–#22). At load, with no Program
// source, they must be a genuine toggle sitting idle: off (aria-pressed=false),
// showing the idle label — never a fake active state ("● ON AIR", a timer) — and
// when disabled they must explain why in the title.
const idleReason = /put a source on program|requires|disabled|not wired|reconnect|to publish|to capture/i;

async function assertRealIdleToggle(page, testId) {
  const element = page.getByTestId(testId);
  await element.waitFor({ state: 'visible', timeout: 15_000 });
  const info = await element.evaluate((node) => ({
    disabled: node instanceof HTMLButtonElement ? node.disabled : node.getAttribute('aria-disabled') === 'true',
    pressed: node.getAttribute('aria-pressed'),
    text: node.innerText,
    title: node.getAttribute('title') || '',
  }));
  if (info.pressed === 'true') throw new Error(`${testId} is reporting an active (pressed) state at idle`);
  if (/●|ON AIR|\d:\d\d/.test(info.text)) throw new Error(`${testId} shows a fake active label at idle: "${info.text}"`);
  if (info.disabled && !idleReason.test(info.title)) throw new Error(`${testId} is disabled without an honest reason: "${info.title}"`);
}

async function main() {
  const launchOptions = { headless: true };
  if (process.env.CHASE_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.CHASE_CHROMIUM_EXECUTABLE;
  }
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByTestId('builder-surface').waitFor({ state: 'visible', timeout: 15_000 });
  await assertNoFakeProductionText(page, 'builder-surface');
  await assertRealIdleToggle(page, 'record-status');
  await assertRealIdleToggle(page, 'live-status');
  // The 3D asset import panel is a real, present control in the builder.
  await page.getByTestId('asset-import-panel').waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByTestId('import-asset-button').waitFor({ state: 'visible', timeout: 15_000 });
  await page.screenshot({ path: resolve(evidenceDir, 'builder-surface.png'), fullPage: true });

  await page.getByRole('button', { name: /switcher/i }).click();
  await page.getByTestId('switcher-surface').waitFor({ state: 'visible', timeout: 15_000 });
  await assertNoFakeProductionText(page, 'switcher-surface');
  await page.screenshot({ path: resolve(evidenceDir, 'switcher-surface.png'), fullPage: true });

  await page.getByRole('button', { name: /outputs/i }).click();
  await page.getByTestId('outputs-surface').waitFor({ state: 'visible', timeout: 15_000 });
  await assertNoFakeProductionText(page, 'outputs-surface');
  await page.getByTestId('stream-destination-panel').waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByTestId('audio-meter-panel').waitFor({ state: 'visible', timeout: 15_000 });
  const audioText = await page.getByTestId('audio-meter-panel').innerText();
  if (!/No real audio source connected/i.test(audioText)) throw new Error('audio panel does not show the honest no-source state');
  const meterLike = await page.locator('[data-testid="outputs-surface"] .rec-pulse, [data-testid="outputs-surface"] .meter-fill').count();
  if (meterLike > 0) throw new Error('outputs surface contains active meter/live animation classes');
  await page.screenshot({ path: resolve(evidenceDir, 'outputs-surface.png'), fullPage: true });

  await browser.close();
  console.log('browser visual smoke passed');
  console.log(`screenshots written to ${evidenceDir}`);
}

main().catch((error) => {
  console.error('browser visual smoke failed');
  console.error(error);
  process.exit(1);
});
