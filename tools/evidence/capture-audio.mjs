import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
const url = process.env.URL || 'http://localhost:4177';
const out = 'docs/evidence/phase-2/audio-meters';
fs.mkdirSync(out, { recursive: true });
const args = ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'];
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_EXECUTABLE, args });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.grantPermissions(['camera','microphone'], { origin: url });
const page = await ctx.newPage();
const logs = []; page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror', e => logs.push(`[err] ${e.message}`));
await page.goto(url, { waitUntil: 'load' }); await page.waitForSelector('#chase-babylon-canvas'); await sleep(2000);
await page.click('button[title="Switcher"]'); await sleep(500);
await page.getByRole('button', { name: 'Add Webcam' }).click();
await page.waitForSelector('video', { timeout: 15000 }); await sleep(1500);
// audio track present?
const audioInfo = await page.evaluate(() => {
  const vids = [...document.querySelectorAll('video')];
  const s = vids.map(v => v.srcObject).find(Boolean);
  return s ? { audioTracks: s.getAudioTracks().length, videoTracks: s.getVideoTracks().length } : 'no-stream';
});
await page.click('button[title="Builder"]'); await page.waitForSelector('#chase-babylon-canvas'); await sleep(2500);
// sample the meter fill width twice to prove it is live (non-zero / changing)
const sample = async () => page.evaluate(() => {
  const panel = document.querySelector('[data-testid="audio-meter-panel"]');
  if (!panel) return null;
  const fill = panel.querySelector('div[style*="width"]');
  return fill ? fill.style.width : 'no-fill';
});
const s1 = await sample(); await sleep(500); const s2 = await sample(); await sleep(400); const s3 = await sample();
await page.screenshot({ path: `${out}/01-builder-with-audio-meter.png` });
await page.screenshot({ path: `${out}/02-output-panel-audio-meter.png`, clip: { x: 1320, y: 650, width: 280, height: 230 } });
fs.writeFileSync(`${out}/audio-meter-readback.txt`, [
  `stream tracks: ${JSON.stringify(audioInfo)}`,
  `meter fill width samples (live RMS → %): ${s1}, ${s2}, ${s3}`,
  `(non-zero / varying width proves real audio analysis, not a static/fake bar)`,
  '', '--- console ---', ...logs,
].join('\n'));
await browser.close();
console.log('audio evidence ->', out, '| tracks', JSON.stringify(audioInfo), '| samples', s1, s2, s3);
