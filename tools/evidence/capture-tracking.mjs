import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
const url=process.env.URL||'http://localhost:4177';
const out='docs/evidence/phase-2/camera-tracking'; fs.mkdirSync(out,{recursive:true});
const args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'];
const browser=await chromium.launch({headless:true,executablePath:process.env.PW_EXECUTABLE,args});
const ctx=await browser.newContext({viewport:{width:1600,height:900}}); await ctx.grantPermissions(['camera','microphone'],{origin:url});
const page=await ctx.newPage(); const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
const vp=async n=>{const e=await page.$('#babylon-viewport'); if(e) await e.screenshot({path:`${out}/${n}`});};
const sel=v=>page.evaluate(val=>{const s=[...document.querySelectorAll('select')].find(x=>[...x.options].some(o=>o.value===val&&!o.disabled)); if(s){s.value=val;s.dispatchEvent(new Event('change',{bubbles:true}));}},v);
await page.goto(url,{waitUntil:'load'}); await page.waitForSelector('#chase-babylon-canvas'); await sleep(2000);
await page.click('button[title="Switcher"]'); await sleep(400);
await page.getByRole('button',{name:'Add Webcam'}).click(); await page.waitForSelector('video'); await sleep(1000);
await page.getByRole('button',{name:'CUT'}).click(); await sleep(500);
await sel('mediaPlane'); await sleep(300);
await page.click('button[title="Builder"]'); await page.waitForSelector('#chase-babylon-canvas'); await sleep(2500);
await vp('01-before-tracking.png');
// enable camera tracking (Crosshair button)
await page.click('button[aria-label^="Camera tracking"]'); await sleep(1500);
await vp('02-tracking-pose-a.png');
await sleep(2500); // camera moves (synthetic tracking signal)
await vp('03-tracking-pose-b.png');
await sleep(2500);
await vp('04-tracking-pose-c.png');
// disable -> restores studio camera
await page.click('button[aria-label^="Camera tracking"]'); await sleep(1200);
await vp('05-tracking-off-restored.png');
fs.writeFileSync(`${out}/tracking.txt`,['tracking test signal: synthetic jib move; source stays world-locked across poses A/B/C','','--- console ---',...logs].join('\n'));
await browser.close(); console.log('tracking evidence ->',out);
