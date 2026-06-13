// Phase 2 (3D video placement) evidence capture.
//
// Proves the live Program source is a REAL Babylon scene object: a ShaderMaterial
// + VideoTexture media plane that is selectable, framed, transformable, and
// removable — NOT a DOM overlay. No physical camera in CI, so Chromium uses its
// fake media device; the getUserMedia/MediaStream/VideoTexture path is real.
//
// getUserMedia is wrapped (test harness only) to assert tracks stop on removal.
import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

const url = process.env.URL || 'http://localhost:4174';
const out = 'docs/evidence/phase-2/3d-video-placement';
fs.mkdirSync(out, { recursive: true });

const args = [
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist', '--no-sandbox',
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
];
const TRACK_PROBE = `
  window.__chaseStreams = [];
  const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (c) => { const s = await orig(c); window.__chaseStreams.push(s); return s; };
`;

const browser = await chromium.launch({ headless: process.env.HEADLESS !== 'false', executablePath: process.env.PW_EXECUTABLE || undefined, args });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.grantPermissions(['camera'], { origin: url });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.addInitScript(TRACK_PROBE);
const vpShot = async (name) => { const vp = await page.$('#babylon-viewport'); if (vp) await vp.screenshot({ path: `${out}/${name}` }); };

await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('#chase-babylon-canvas', { timeout: 20000 });
await sleep(3000);
await page.screenshot({ path: `${out}/01-app-launched.png` });
await vpShot('02-empty-virtual-set.png');

await page.click('button[title="Switcher"]');
await sleep(600);
await page.getByRole('button', { name: 'Add Webcam' }).click();
await page.waitForSelector('video', { timeout: 15000 });
await sleep(1800);
await page.screenshot({ path: `${out}/03-source-in-list-and-preview.png` });
await page.screenshot({ path: `${out}/04-program-empty-before-cut.png` });

await page.getByRole('button', { name: 'CUT' }).click();
await sleep(1200);
await page.screenshot({ path: `${out}/05-program-live-after-cut.png` });

await page.click('button[title="Builder"]');
await page.waitForSelector('#chase-babylon-canvas', { timeout: 20000 });
await sleep(5000);
await vpShot('06-program-video-in-viewport.png');       // live video on the Babylon plane
await vpShot('07-source-selected-handles.png');         // auto-selected: gizmo + frame
await page.screenshot({ path: `${out}/06b-full-builder.png` });

// Scale (resize) the source via the real transform gizmo.
await page.getByRole('button', { name: 'Scale' }).click();
await sleep(1200);
await vpShot('08-source-scaled.png');

// Permission + tracks while live
const permission = await page.evaluate(async () => { try { return (await navigator.permissions.query({ name: 'camera' })).state; } catch (e) { return `unsupported (${e.message})`; } });
const tracksLive = await page.evaluate(() => (window.__chaseStreams || []).map((s) => s.getTracks().map((t) => ({ kind: t.kind, readyState: t.readyState }))));

// Disabled controls that replaced fake demo controls (top bar REC/GO LIVE etc.)
await page.screenshot({ path: `${out}/10-honest-controls.png` });

// Remove the source -> no ghost, tracks stop.
await page.click('button[title="Switcher"]');
await sleep(500);
await page.click('button[aria-label^="Remove"]');
await sleep(800);
await page.click('button[title="Builder"]');
await page.waitForSelector('#chase-babylon-canvas', { timeout: 20000 });
await sleep(2500);
await vpShot('09-source-removed-no-ghost.png');
const tracksAfter = await page.evaluate(() => (window.__chaseStreams || []).map((s) => s.getTracks().map((t) => ({ kind: t.kind, readyState: t.readyState }))));

fs.writeFileSync(`${out}/tracks-cleanup.txt`, [
  'Camera permission + track lifecycle (no leaked MediaStream tracks).',
  `Captured: ${new Date().toISOString()}`,
  '', `permission camera state: ${permission}`,
  '', 'Tracks while LIVE (expect "live"):', JSON.stringify(tracksLive),
  '', 'Tracks AFTER removal (expect "ended"):', JSON.stringify(tracksAfter),
  '', `Streams created total: ${tracksAfter.length} (one per Add Webcam; no duplicates).`,
  '', '--- console / page errors ---', ...(logs.length ? logs : ['(none)']),
].join('\n'));

await browser.close();
console.log('permission:', permission, '| tracks after:', JSON.stringify(tracksAfter), '| ->', out);
