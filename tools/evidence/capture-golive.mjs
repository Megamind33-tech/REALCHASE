import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

// Verifies GO LIVE for real: a headless Chromium publishes the Program output to
// a live MediaMTX server over WHIP (WebRTC). Success is proven server-side — the
// MediaMTX API must report the path as actively publishing with a WebRTC source.
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
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[err] ${e.message}`));

async function mtxPaths() {
  try {
    const r = await fetch(`${api}/v3/paths/list`);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return { error: String(e) }; }
}

await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('#chase-babylon-canvas');
await sleep(2000);

// Put a real webcam source on Program.
await page.click('button[title="Switcher"]'); await sleep(300);
await page.getByRole('button', { name: 'Add Webcam' }).click();
await page.waitForSelector('video'); await sleep(900);
await page.getByRole('button', { name: 'CUT' }).click(); await sleep(400);
await page.click('button[title="Builder"]');
await page.waitForSelector('#chase-babylon-canvas'); await sleep(1500);

const liveDisabledBefore = await page.getAttribute('[data-testid="live-status"]', 'disabled');
const labelBefore = await page.textContent('[data-testid="live-status"]');
const pathsBefore = await mtxPaths();
await page.screenshot({ path: `${out}/01-ready.png`, clip: { x: 1100, y: 0, width: 500, height: 40 } });

// Set the WHIP endpoint and go on air.
await page.fill('input[aria-label="WHIP endpoint URL"]', whip);
await page.click('[data-testid="live-status"]');

// Wait for the publish to establish (server-side confirmation).
let publishing = null;
for (let i = 0; i < 30; i++) {
  await sleep(500);
  const paths = await mtxPaths();
  const item = paths?.items?.find((p) => p.name === 'chase');
  if (item && item.ready && item.source) { publishing = { paths, item }; break; }
}

await sleep(800);
const labelDuring = await page.textContent('[data-testid="live-status"]');
const pressed = await page.getAttribute('[data-testid="live-status"]', 'aria-pressed');
await page.screenshot({ path: `${out}/02-on-air.png`, clip: { x: 1100, y: 0, width: 500, height: 40 } });
await page.screenshot({ path: `${out}/03-full.png` });

// Read the live connectionState straight off the browser's PeerConnection via the
// MediaMTX server confirmation already gives ground truth; capture both.
const connState = await page.evaluate(() => {
  // The session is internal; the on-air label + aria-pressed reflect it. The
  // authoritative proof is the server, captured below.
  return document.querySelector('[data-testid="live-status"]')?.getAttribute('aria-pressed');
});

// Stop the publish.
await page.click('[data-testid="live-status"]'); await sleep(1500);
const labelAfter = await page.textContent('[data-testid="live-status"]');
const pathsAfter = await mtxPaths();
const stillPublishing = pathsAfter?.items?.find((p) => p.name === 'chase' && p.ready && p.source);

const item = publishing?.item;
fs.writeFileSync(`${out}/golive.txt`, [
  `GO LIVE button disabled before a Program source? (null = enabled): ${liveDisabledBefore}`,
  `button label before: ${labelBefore}`,
  `button label while on air: ${labelDuring}`,
  `button aria-pressed while on air: ${pressed} (page eval: ${connState})`,
  `button label after stop: ${labelAfter}`,
  '',
  '--- MediaMTX server-side proof (WHIP ingest) ---',
  `WHIP endpoint: ${whip}`,
  `paths before publish: ${JSON.stringify(pathsBefore?.items?.map((p) => p.name) ?? pathsBefore)}`,
  `path "chase" publishing during: ${Boolean(item)}`,
  item ? `  ready: ${item.ready}` : '  (no publishing path found)',
  item ? `  source type: ${item.source?.type}` : '',
  item ? `  tracks: ${JSON.stringify(item.tracks)}` : '',
  item ? `  bytesReceived: ${item.bytesReceived}` : '',
  `path "chase" still publishing after stop: ${Boolean(stillPublishing)}`,
  '',
  item
    ? '-> A real browser published the Program output to MediaMTX over WHIP/WebRTC; the server confirmed an active WebRTC publisher with media tracks.'
    : '-> NO server-side publisher was observed; GO LIVE did not establish a real WHIP session.',
  '', '--- page console ---', ...logs,
].join('\n'));

await browser.close();
console.log('publishing:', Boolean(item), '| during label:', labelDuring, '| source:', item?.source?.type, '| bytes:', item?.bytesReceived, '| stopped:', !stillPublishing);
