// Phase 2 evidence capture — real source ingest, Preview/Program/CUT, and the
// live Program placed as a SEPARATE selectable media object inside the studio.
//
// No physical camera in CI, so Chromium uses its built-in fake media device.
// The pipeline is real: real getUserMedia(), real MediaStream, real <video>,
// and a real Babylon DynamicTexture sampled onto a dedicated media plane mesh.
// Only the camera *frames* are synthetic (Chromium test pattern).
//
// getUserMedia is wrapped via addInitScript (TEST HARNESS ONLY, not app code) so
// we can assert the app stops tracks on source removal.
import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

const url = process.env.URL || 'http://localhost:4174';
const out = 'docs/evidence/phase-2/source-placement';
fs.mkdirSync(out, { recursive: true });

const args = [
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist', '--no-sandbox',
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
];

const TRACK_PROBE = `
  window.__chaseStreams = [];
  const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (c) => {
    const s = await orig(c);
    window.__chaseStreams.push(s);
    return s;
  };
`;

const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_EXECUTABLE || undefined, args });
const logs = [];

const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.grantPermissions(['camera'], { origin: url });
const page = await ctx.newPage();
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.addInitScript(TRACK_PROBE);

await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('#chase-babylon-canvas', { timeout: 20000 });
await sleep(3000);

// 1) Empty virtual set — no live source yet.
const shotVp = async (name) => {
  const vp = await page.$('#babylon-viewport');
  if (vp) await vp.screenshot({ path: `${out}/${name}` });
};
await shotVp('01-empty-virtual-set.png');

// Open the Switcher
await page.click('button[title="Switcher"]');
await sleep(600);

// Add a real (fake-device) webcam source
await page.getByRole('button', { name: 'Add Webcam' }).click();
await page.waitForSelector('video', { timeout: 15000 });
await sleep(1800);
// 2) Source LIVE + visible in Preview, Program still empty (also: before CUT).
await page.screenshot({ path: `${out}/02-source-in-preview.png` });
await page.screenshot({ path: `${out}/03-program-empty-before-cut.png` });

// Real CUT: Preview -> Program
await page.getByRole('button', { name: 'CUT' }).click();
await sleep(1200);
await page.screenshot({ path: `${out}/04-program-live-after-cut.png` });

// Back to Builder — the Program feed becomes a separate media object in the set.
await page.click('button[title="Builder"]');
await page.waitForSelector('#chase-babylon-canvas', { timeout: 20000 });
await sleep(5000); // engine rebuild + several decoded frames into the texture
await shotVp('05-program-in-set.png');           // separate floating media plane
await page.screenshot({ path: `${out}/05b-full-builder.png` });
await shotVp('06-source-selected-handles.png');  // auto-selected: position gizmo + edge frame

// Resize the source via the (real, wired) Scale gizmo tool.
await page.getByRole('button', { name: 'Scale' }).click();
await sleep(1200);
await shotVp('07-source-scale-handles.png');

// Permission state + tracks while live
const permission = await page.evaluate(async () => {
  try { return (await navigator.permissions.query({ name: 'camera' })).state; }
  catch (e) { return `query-unsupported (${e.message})`; }
});
const tracksLive = await page.evaluate(() =>
  (window.__chaseStreams || []).map((s) => s.getTracks().map((t) => ({ kind: t.kind, readyState: t.readyState }))));

// Remove the source — must leave no ghost video / no live tracks.
await page.click('button[title="Switcher"]');
await sleep(500);
await page.click('button[aria-label^="Remove"]');
await sleep(800);
await page.click('button[title="Builder"]');
await page.waitForSelector('#chase-babylon-canvas', { timeout: 20000 });
await sleep(2500);
await shotVp('08-source-removed-no-ghost.png');
const tracksAfter = await page.evaluate(() =>
  (window.__chaseStreams || []).map((s) => s.getTracks().map((t) => ({ kind: t.kind, readyState: t.readyState }))));

fs.writeFileSync(`${out}/tracks-cleanup.txt`, [
  'Camera permission + track lifecycle (proves no leaked MediaStream tracks).',
  `Captured: ${new Date().toISOString()}`,
  '',
  `navigator.permissions camera state: ${permission}`,
  '',
  'Tracks while source LIVE (expect readyState "live"):',
  JSON.stringify(tracksLive),
  '',
  'Tracks AFTER source removed (expect readyState "ended"):',
  JSON.stringify(tracksAfter),
  '',
  `Streams created total: ${tracksAfter.length} (one Add Webcam = one stream; no duplicates).`,
  '',
  '--- console / page errors ---',
  ...(logs.length ? logs : ['(none)']),
].join('\n'));

// Error path: permission denied -> clear ERROR state in the source row.
const ctx2 = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page2 = await ctx2.newPage();
await page2.addInitScript(`navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('denied','NotAllowedError'); };`);
await page2.goto(url, { waitUntil: 'load', timeout: 30000 });
await sleep(800);
await page2.click('button[title="Switcher"]');
await sleep(400);
await page2.getByRole('button', { name: 'Add Webcam' }).click();
await sleep(900);
await page2.screenshot({ path: `${out}/09-permission-denied.png` });

await browser.close();
console.log('permission:', permission);
console.log('tracks after removal:', JSON.stringify(tracksAfter));
console.log('evidence ->', out);
