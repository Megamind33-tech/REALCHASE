import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
const url = process.env.URL || 'http://localhost:4177';
const out = 'docs/evidence/phase-2/perf-optimization';
fs.mkdirSync(out, { recursive: true });
const args = ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'];
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_EXECUTABLE, args });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.grantPermissions(['camera','microphone'], { origin: url });
const page = await ctx.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto(url, { waitUntil: 'load' }); await page.waitForSelector('#chase-babylon-canvas'); await sleep(2500);
// regression: program video still renders on the mesh
await page.click('button[title="Switcher"]'); await sleep(400);
await page.getByRole('button', { name: 'Add Webcam' }).click(); await page.waitForSelector('video'); await sleep(1200);
await page.getByRole('button', { name: 'CUT' }).click(); await sleep(800);
await page.click('button[title="Builder"]'); await page.waitForSelector('#chase-babylon-canvas'); await sleep(4000);
const vp = await page.$('#babylon-viewport'); await vp.screenshot({ path: `${out}/01-viewport-after-perf.png` });
// FPS readout from the overlay
const overlay = await page.evaluate(() => document.querySelector('#babylon-viewport')?.textContent || '');
// pause check: go to switcher (viewport unmounts -> engine paused), come back
await page.click('button[title="Switcher"]'); await sleep(800);
await page.click('button[title="Builder"]'); await page.waitForSelector('#chase-babylon-canvas'); await sleep(3000);
const vp2 = await page.$('#babylon-viewport'); await vp2.screenshot({ path: `${out}/02-viewport-after-module-roundtrip.png` });
fs.writeFileSync(`${out}/perf-runtime.txt`, [`overlay: ${overlay}`, '', '--- console ---', ...logs].join('\n'));
await browser.close();
console.log('overlay:', overlay);
