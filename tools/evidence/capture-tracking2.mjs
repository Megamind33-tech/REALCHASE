import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import { PNG } from 'pngjs';
const url=process.env.URL||'http://localhost:4177';
const out='docs/evidence/phase-2/tracking-smooth-lens'; fs.mkdirSync(out,{recursive:true});
const args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'];
const browser=await chromium.launch({headless:true,executablePath:process.env.PW_EXECUTABLE,args});
const ctx=await browser.newContext({viewport:{width:1600,height:900}}); await ctx.grantPermissions(['camera','microphone'],{origin:url});
const page=await ctx.newPage(); const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
const vpEl=async()=>page.$('#babylon-viewport');
const vp=async n=>{const e=await vpEl(); if(e) await e.screenshot({path:`${out}/${n}`});};
const shot=async()=>{const e=await vpEl(); return e? await e.screenshot():null;};
const rng=(l,v)=>page.evaluate(({l,v})=>{const r=[...document.querySelectorAll('input[type=range]')].find(x=>x.getAttribute('aria-label')===l); if(r){const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(r,String(v));r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true})); return true;} return false;},{l,v});
await page.goto(url,{waitUntil:'load'}); await page.waitForSelector('#chase-babylon-canvas'); await sleep(2000);
// add a source for context
await page.click('button[title="Switcher"]'); await sleep(300);
await page.getByRole('button',{name:'Add Webcam'}).click(); await page.waitForSelector('video'); await sleep(900);
await page.getByRole('button',{name:'CUT'}).click(); await sleep(400);
await page.click('button[title="Builder"]'); await page.waitForSelector('#chase-babylon-canvas'); await sleep(1500);
// enable tracking
await page.click('button[aria-label^="Camera tracking"]'); await sleep(800);
// LENS MATCH: stabilise (high smoothing) then compare focal lengths
await rng('Tracking smoothing',0.95); await sleep(1500);
// open Inspector camera sub-tab
await page.click('button[aria-label="Camera"]').catch(()=>{}); await sleep(400);
const okFocal = await rng('Focal Length',24); await sleep(1500); await vp('01-lens-wide-24mm.png');
await rng('Focal Length',85); await sleep(1500); await vp('02-lens-tele-85mm.png');
// SMOOTHING: jitter test — consecutive-frame difference is the jitter proxy
const diffSeries = async () => {
  const frames=[]; for(let i=0;i<6;i++){ frames.push(PNG.sync.read(await shot())); await sleep(170); }
  let tot=0,n=0;
  for(let i=1;i<frames.length;i++){ const a=frames[i-1].data,b=frames[i].data; let d=0,c=0; for(let j=0;j<a.length;j+=160){ d+=Math.abs(a[j]-b[j]); c++; } tot+=d/c; n++; }
  return tot/n; // mean per-pixel abs change between consecutive frames (0..255)
};
await rng('Focal Length',35); await sleep(800);
await rng('Tracking smoothing',0); await sleep(700); const jittery = await diffSeries(); await vp('03-smoothing-off.png');
await rng('Tracking smoothing',0.95); await sleep(900); const smooth = await diffSeries(); await vp('04-smoothing-high.png');
fs.writeFileSync(`${out}/tracking2.txt`,[
  `lens match: focal 24mm (wide) vs 85mm (tele) -> see 01/02 (FOV change). focal slider hit: ${okFocal}`,
  '',
  `smoothing jitter proxy (mean per-pixel abs change (0..255) between consecutive viewport frames, 6-frame run):`,
  `  smoothing 0    (raw noisy signal): ${jittery.toFixed(4)}`,
  `  smoothing 0.95 (low-pass):         ${smooth.toFixed(4)}`,
  `  -> lower with smoothing means the low-pass rejects the tracking jitter.`,
  '','--- console ---',...logs,
].join('\n'));
await browser.close(); console.log('jittery',jittery.toFixed(4),'smooth',smooth.toFixed(4),'focalHit',okFocal);
