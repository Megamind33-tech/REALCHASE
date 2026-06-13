import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
const url = process.env.URL || 'http://localhost:4177';
const out = 'docs/evidence/phase-2/perf-deeper';
fs.mkdirSync(out, { recursive: true });
const args = ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'];
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_EXECUTABLE, args });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.grantPermissions(['camera','microphone'], { origin: url });
const page = await ctx.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
const vp = async (n) => { const e = await page.$('#babylon-viewport'); if (e) await e.screenshot({ path: `${out}/${n}` }); };
await page.goto(url,{waitUntil:'load'}); await page.waitForSelector('#chase-babylon-canvas');
await sleep(4000); // sit idle: idle-throttle must still render the scene via heartbeat
await vp('01-idle-viewport-renders.png');
// interaction: switch camera (markInteraction) -> full rate
await page.selectOption('select[aria-label="Camera selector"]', 'cam2').catch(()=>{}); await sleep(1500);
await vp('02-after-camera-switch.png');
// live program: full-rate render path
await page.click('button[title="Switcher"]'); await sleep(400);
await page.getByRole('button',{name:'Add Webcam'}).click(); await page.waitForSelector('video'); await sleep(1000);
await page.getByRole('button',{name:'CUT'}).click(); await sleep(800);
await page.click('button[title="Builder"]'); await page.waitForSelector('#chase-babylon-canvas'); await sleep(4000);
await vp('03-live-program-full-rate.png');
const overlay = await page.evaluate(()=>document.querySelector('#babylon-viewport')?.textContent||'');
fs.writeFileSync(`${out}/perf-deeper.txt`, [`overlay: ${overlay}`, '', '--- console ---', ...logs].join('\n'));
await browser.close();
console.log('overlay:', overlay);
