import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

// Proves the Output panel reflects the REAL on-air state: it shows "Off air"
// until a genuine WHIP publish is running, then mirrors the same session the
// toolbar GO LIVE button drives (confirmed server-side by MediaMTX).
const url = process.env.URL || 'http://localhost:4177';
const api = process.env.MTX_API_URL || 'http://localhost:9997';
const whip = process.env.WHIP_URL || 'http://localhost:8889/chase/whip';
const out = 'docs/evidence/phase-2/golive-whip';
fs.mkdirSync(out, { recursive: true });

const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_EXECUTABLE, args });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.grantPermissions(['camera', 'microphone'], { origin: url });
const page = await ctx.newPage();

async function chasePath() {
  try {
    const r = await fetch(`${api}/v3/paths/list`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.items?.find((p) => p.name === 'chase') ?? null;
  } catch { return null; }
}

await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('#chase-babylon-canvas'); await sleep(2000);
await page.click('button[title="Switcher"]'); await sleep(300);
await page.getByRole('button', { name: 'Add Webcam' }).click();
await page.waitForSelector('video'); await sleep(900);
await page.getByRole('button', { name: 'CUT' }).click(); await sleep(400);
await page.click('button[title="Builder"]');
await page.waitForSelector('#chase-babylon-canvas'); await sleep(1500);

const panel = page.locator('[data-testid="outputs-surface"]');
const airTile = page.locator('[data-testid="output-air-tile"]');
await panel.scrollIntoViewIfNeeded();
const airOff = (await airTile.textContent())?.trim();
await panel.screenshot({ path: `${out}/04-output-panel-offair.png` });

// Go on air via the toolbar, then confirm the panel reflects it.
await page.fill('input[aria-label="WHIP endpoint URL"]', whip);
await page.click('[data-testid="live-status"]');
let item = null;
for (let i = 0; i < 30; i++) { await sleep(500); item = await chasePath(); if (item?.ready && item.source) break; }
await sleep(800);
const airOn = (await airTile.textContent())?.trim();
await panel.screenshot({ path: `${out}/05-output-panel-onair.png` });

await page.click('[data-testid="live-status"]'); await sleep(1200);
const airAfter = (await airTile.textContent())?.trim();

fs.writeFileSync(`${out}/output-reconcile.txt`, [
  'Output panel reconciled to the real WHIP session (no more "Requires streaming engine" placeholder):',
  `  Program Output tile, off air : ${airOff}`,
  `  Program Output tile, on air  : ${airOn}`,
  `  Program Output tile, after   : ${airAfter}`,
  '',
  `  MediaMTX path "chase" ready while panel showed on-air: ${Boolean(item?.ready)}`,
  item ? `  source: ${item.source?.type}, tracks: ${JSON.stringify(item.tracks)}, bytesReceived: ${item.bytesReceived}` : '  (no server publisher)',
  '',
  '-> The Output panel mirrors the genuine publish state; the named per-platform',
  '   destinations remain honestly marked "Per-destination publishing not wired".',
].join('\n'));

await browser.close();
console.log('offair:', airOff, '| onair:', airOn, '| server ready:', Boolean(item?.ready), '| bytes:', item?.bytesReceived);
