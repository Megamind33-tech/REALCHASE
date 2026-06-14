import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
const url=process.env.URL||'http://localhost:4177';
const out='docs/evidence/phase-2/keying-colormatch'; fs.mkdirSync(out,{recursive:true});
const args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'];
const browser=await chromium.launch({headless:true,executablePath:process.env.PW_EXECUTABLE,args});
const ctx=await browser.newContext({viewport:{width:1600,height:900}}); await ctx.grantPermissions(['camera','microphone'],{origin:url});
const page=await ctx.newPage(); const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
const vp=async n=>{const e=await page.$('#babylon-viewport'); if(e) await e.screenshot({path:`${out}/${n}`});};
const sel=v=>page.evaluate(val=>{const s=[...document.querySelectorAll('select')].find(x=>[...x.options].some(o=>o.value===val&&!o.disabled)); if(s){s.value=val;s.dispatchEvent(new Event('change',{bubbles:true}));}},v);
const rng=(l,v)=>page.evaluate(({l,v})=>{const r=[...document.querySelectorAll('input[type=range]')].find(x=>x.getAttribute('aria-label')===l); if(r){const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(r,String(v));r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));}},{l,v});
const col=(label,hex)=>page.evaluate(({label,hex})=>{const c=[...document.querySelectorAll('input[type=color]')].find(x=>x.getAttribute('aria-label')===label); if(c){c.value=hex;c.dispatchEvent(new Event('input',{bubbles:true}));c.dispatchEvent(new Event('change',{bubbles:true}));}},{label,hex});
await page.goto(url,{waitUntil:'load'}); await page.waitForSelector('#chase-babylon-canvas'); await sleep(2000);
await page.click('button[title="Switcher"]'); await sleep(400);
await page.getByRole('button',{name:'Add Webcam'}).click(); await page.waitForSelector('video'); await sleep(1000);
await page.getByRole('button',{name:'CUT'}).click(); await sleep(500);
await sel('presenterPlate'); await sleep(200); await sel('chromaKey'); await sleep(300);
await rng('Similarity',0.03); await sleep(150); // keep most of the frame so the grade is visible
// match OFF baseline
await rng('Match amount',0); await sleep(250);
await page.click('button[title="Builder"]'); await page.waitForSelector('#chase-babylon-canvas'); await sleep(2500);
await vp('01-colormatch-off.png');
// match ON: warm set light, full amount, slight exposure
await page.click('button[title="Switcher"]'); await sleep(250);
await col('Set light colour','#ff7a33'); await rng('Match amount',1); await rng('Exposure',1.25); await sleep(300);
await page.screenshot({path:`${out}/00-colormatch-controls.png`});
await page.click('button[title="Builder"]'); await page.waitForSelector('#chase-babylon-canvas'); await sleep(2500);
await vp('02-colormatch-on-warm.png');
fs.writeFileSync(`${out}/colormatch.txt`,['off: matchAmount 0 (neutral). on: set light #ff7a33, amount 1.0, exposure 1.25 -> subject graded warm','','--- console ---',...logs].join('\n'));
await browser.close(); console.log('colormatch evidence ->',out);
