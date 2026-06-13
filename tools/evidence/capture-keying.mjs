// Evidence for hardened chroma keying: matte preview, similarity tuning, spill.
// Real getUserMedia (fake device green pattern) -> presenterPlate -> chromaKey,
// driving the real shader uniforms via the new calibration controls.
import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

const url = process.env.URL || 'http://localhost:4177';
const out = 'docs/evidence/phase-2/keying-hardening';
fs.mkdirSync(out, { recursive: true });
const args = ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'];

const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_EXECUTABLE, args });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.grantPermissions(['camera'], { origin: url });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const vp = async (n) => { const e = await page.$('#babylon-viewport'); if (e) await e.screenshot({ path: `${out}/${n}` }); };
const setSelect = (val) => page.evaluate((v) => { const s=[...document.querySelectorAll('select')].find(x=>[...x.options].some(o=>o.value===v && !o.disabled)); if(s){s.value=v; s.dispatchEvent(new Event('change',{bubbles:true}));} }, val);
const setRange = (label, v) => page.evaluate(({ label, v }) => { const r=[...document.querySelectorAll('input[type=range]')].find(x=>x.getAttribute('aria-label')===label); if(r){ const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(r,String(v)); r.dispatchEvent(new Event('input',{bubbles:true})); r.dispatchEvent(new Event('change',{bubbles:true})); } }, { label, v });

await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('#chase-babylon-canvas'); await sleep(2500);

await page.click('button[title="Switcher"]'); await sleep(500);
await page.getByRole('button', { name: 'Add Webcam' }).click();
await page.waitForSelector('video', { timeout: 15000 }); await sleep(1500);
await page.getByRole('button', { name: 'CUT' }).click(); await sleep(800);

// presenterPlate + chromaKey -> calibration controls appear
await setSelect('presenterPlate'); await sleep(300);
await setSelect('chromaKey'); await sleep(500);
await page.screenshot({ path: `${out}/01-keying-calibration-controls.png` });

// Default key in the 3D viewport
await page.click('button[title="Builder"]'); await page.waitForSelector('#chase-babylon-canvas'); await sleep(3500);
await vp('02-chromakey-default.png');

// Show the alpha matte for calibration
await page.click('button[title="Switcher"]'); await sleep(300);
await page.getByRole('button', { name: 'Show matte' }).click(); await sleep(300);
await page.click('button[title="Builder"]'); await page.waitForSelector('#chase-babylon-canvas'); await sleep(3000);
await vp('03-matte-preview.png');

// Turn matte off, raise similarity to key more of the green, raise spill
await page.click('button[title="Switcher"]'); await sleep(300);
await page.getByRole('button', { name: 'Matte: ON' }).click().catch(() => {});
await setRange('Similarity', 0.55); await sleep(200);
await setRange('Spill', 0.9); await sleep(200);
await page.screenshot({ path: `${out}/04-tuned-controls.png` });
await page.click('button[title="Builder"]'); await page.waitForSelector('#chase-babylon-canvas'); await sleep(3500);
await vp('05-chromakey-tuned-similarity-spill.png');

fs.writeFileSync(`${out}/console.txt`, logs.join('\n') || '(none)');
await browser.close();
console.log('keying evidence ->', out);
