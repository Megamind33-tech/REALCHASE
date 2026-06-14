import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

// Proves real multi-destination fan-out + the public live website.
//  - The browser publishes the Program once over WHIP to MediaMTX (path "chase").
//  - The app arms the relay; MediaMTX runs ffmpeg to push to each enabled leg.
//  - We point YouTube/Twitch/Facebook at LOCAL RTMP sinks (same mechanism as the
//    real ingest URLs, no secrets) and confirm SERVER-SIDE that each sink path
//    actually receives H.264/AAC media.
//  - The public /live.html page plays the program over WHEP; we pixel-check a
//    real, non-black frame.
const url = process.env.URL || 'http://localhost:4177';
const api = process.env.MTX_API_URL || 'http://localhost:9997';
const whip = process.env.WHIP_URL || 'http://localhost:8889/chase/whip';
const out = 'docs/evidence/phase-2/multi-destination';
fs.mkdirSync(out, { recursive: true });

// Local sinks standing in for the real platform RTMP ingests.
const sinks = {
  youtube: 'rtmp://localhost:1935/yt-normal',
  twitch: 'rtmp://localhost:1935/tw-normal',
  facebook: 'rtmp://localhost:1935/fb-sat',
};

const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_EXECUTABLE, args });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.grantPermissions(['camera', 'microphone'], { origin: url });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[err] ${e.message}`));

async function paths() {
  try { const r = await fetch(`${api}/v3/paths/list`); return r.ok ? (await r.json()).items : []; }
  catch { return []; }
}
const pathInfo = (items, name) => items.find((p) => p.name === name);

await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('#chase-babylon-canvas'); await sleep(2000);
await page.click('button[title="Switcher"]'); await sleep(300);
await page.getByRole('button', { name: 'Add Webcam' }).click();
await page.waitForSelector('video'); await sleep(900);
await page.getByRole('button', { name: 'CUT' }).click(); await sleep(400);
await page.click('button[title="Builder"]');
await page.waitForSelector('#chase-babylon-canvas'); await sleep(1500);

// Configure destinations in the Output panel (real inputs).
async function arm(station, legLabel, sinkUrl) {
  await page.getByLabel(`${station} enabled`, { exact: true }).check();
  await page.getByLabel(`${station} ${legLabel} URL`).fill(sinkUrl);
  await page.getByLabel(`${station} ${legLabel} enabled`).check();
}
await page.locator('[data-testid="stream-destination-panel"]').scrollIntoViewIfNeeded();
await arm('YouTube Live', 'Normal', sinks.youtube);
await arm('Twitch', 'Normal', sinks.twitch);
await arm('Facebook Live', 'Satellite', sinks.facebook);
// Website leg is enabled by default.
await sleep(300);
const armedText = await page.locator('[data-testid="armed-target-count"]').textContent();
await page.locator('[data-testid="stream-destination-panel"]').screenshot({ path: `${out}/01-destinations-armed.png` });

// Go on air.
await page.fill('input[aria-label="WHIP endpoint URL"]', whip);
await page.click('[data-testid="live-status"]');

// Wait for each sink path to come online server-side.
const want = ['yt-normal', 'tw-normal', 'fb-sat'];
let got = {};
for (let i = 0; i < 40; i++) {
  await sleep(500);
  const items = await paths();
  got = Object.fromEntries(want.map((n) => {
    const p = pathInfo(items, n);
    return [n, p ? { ready: p.ready, src: p.source?.type, bytes: p.bytesReceived, tracks: p.tracks } : null];
  }));
  if (want.every((n) => got[n]?.ready && got[n].bytes > 0)) break;
}
await sleep(1500);
const itemsNow = await paths();
got = Object.fromEntries(want.map((n) => {
  const p = pathInfo(itemsNow, n);
  return [n, p ? { ready: p.ready, src: p.source?.type, bytes: p.bytesReceived, tracks: p.tracks } : null];
}));
await page.locator('[data-testid="stream-destination-panel"]').screenshot({ path: `${out}/02-destinations-onair.png` });

// --- Public live website: open /live.html and prove it plays a real frame ---
const viewer = await ctx.newPage();
await viewer.goto(`${url}/live.html?src=${encodeURIComponent('http://localhost:8889/chase/whep')}`, { waitUntil: 'load' });
let frame = { w: 0, h: 0, nonBlack: 0, state: 'n/a' };
for (let i = 0; i < 30; i++) {
  await sleep(500);
  frame = await viewer.evaluate(() => {
    const v = document.querySelector('video');
    const pill = document.getElementById('pillText')?.textContent || 'n/a';
    if (!v || !v.videoWidth) return { w: 0, h: 0, nonBlack: 0, state: pill };
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    const g = c.getContext('2d');
    g.drawImage(v, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let nb = 0;
    for (let p = 0; p < d.length; p += 4) if (d[p] + d[p + 1] + d[p + 2] > 24) nb++;
    return { w: v.videoWidth, h: v.videoHeight, nonBlack: nb, state: pill };
  });
  if (frame.w > 0 && frame.nonBlack > 1000) break;
}
await sleep(500);
await viewer.screenshot({ path: `${out}/03-live-website.png` });

// Stop and confirm fan-out drains.
await page.click('[data-testid="live-status"]'); await sleep(2000);
const afterItems = await paths();
const stillUp = want.filter((n) => { const p = pathInfo(afterItems, n); return p && p.ready; });

fs.writeFileSync(`${out}/multidest.txt`, [
  'REAL multi-destination fan-out (local RTMP sinks stand in for YouTube/Twitch/Facebook ingests):',
  `armed-count label: ${armedText}`,
  '',
  ...want.map((n) => `  sink ${n}: ${got[n] ? `ready=${got[n].ready} src=${got[n].src} tracks=${JSON.stringify(got[n].tracks)} bytesReceived=${got[n].bytes}` : 'NOT PRESENT'}`),
  '',
  'Public live website (/live.html, WHEP playback):',
  `  player state: ${frame.state}`,
  `  video frame: ${frame.w}x${frame.h}, non-black pixels: ${frame.nonBlack}`,
  '',
  `paths still up after stop: ${JSON.stringify(stillUp)}`,
  '',
  (want.every((n) => got[n]?.ready && got[n].bytes > 0))
    ? '-> All three stations received forwarded media server-side; this is the exact mechanism that reaches YouTube/Twitch/Facebook (swap the local sink URL for the platform ingest + key).'
    : '-> Not all stations received media — see per-sink detail above.',
  (frame.w > 0 && frame.nonBlack > 1000)
    ? '-> The public live website played a real, non-black program frame over WHEP.'
    : '-> The live website did not render a frame.',
  '', '--- studio page console ---', ...logs,
].join('\n'));

await browser.close();
console.log('armed:', armedText, '| sinks:', JSON.stringify(Object.fromEntries(want.map((n) => [n, got[n]?.bytes ?? null]))), '| website:', `${frame.w}x${frame.h} nb=${frame.nonBlack} (${frame.state})`, '| drained:', stillUp.length === 0);
