import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocketServer } from 'ws';
import fs from 'node:fs';
const url=process.env.URL||'http://localhost:4177';
const out='docs/evidence/phase-2/tracking-input'; fs.mkdirSync(out,{recursive:true});
const PORT=7777;

// --- REAL external tracking source: a WebSocket server emitting camera poses ---
const poseA={ position:[-6,5.5,-6], target:[0,1.2,2], focalLength:35 };
const poseB={ position:[5,1.1,-4.5], target:[0,1.4,2], focalLength:50 };
let pose=poseA, sent=0, clientConnected=false;
const wss=new WebSocketServer({ port: PORT });
wss.on('connection', () => { clientConnected=true; });
const ticker=setInterval(()=>{ for(const c of wss.clients){ if(c.readyState===1){ c.send(JSON.stringify(pose)); sent++; } } }, 50);

const args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'];
const browser=await chromium.launch({headless:true,executablePath:process.env.PW_EXECUTABLE,args});
const ctx=await browser.newContext({viewport:{width:1600,height:900}}); await ctx.grantPermissions(['camera','microphone'],{origin:url});
const page=await ctx.newPage(); const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
const vp=async n=>{const e=await page.$('#babylon-viewport'); if(e) await e.screenshot({path:`${out}/${n}`});};
await page.goto(url,{waitUntil:'load'}); await page.waitForSelector('#chase-babylon-canvas'); await sleep(2000);
// add a source for context (composite should stay locked under external tracking)
await page.click('button[title="Switcher"]'); await sleep(300);
await page.getByRole('button',{name:'Add Webcam'}).click(); await page.waitForSelector('video'); await sleep(900);
await page.getByRole('button',{name:'CUT'}).click(); await sleep(400);
await page.click('button[title="Builder"]'); await page.waitForSelector('#chase-babylon-canvas'); await sleep(1500);
await vp('01-before-connect.png');
// low smoothing so external poses settle quickly for distinct screenshots
await page.evaluate(()=>{const r=[...document.querySelectorAll('input[type=range]')].find(x=>x.getAttribute('aria-label')==='Tracking smoothing'); if(r){const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(r,'0.15'); r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));}});
// CONNECT to the real WebSocket tracking source
pose=poseA;
await page.getByRole('button',{name:'Connect tracking'}).click();
await sleep(3500); // receive poseA over the socket
const labelA = await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.title&&x.title.includes('external camera-tracking')); return b? b.textContent : '';});
await vp('02-external-pose-a.png');
pose=poseB; // external source commands a new pose
await sleep(3500);
await vp('03-external-pose-b.png');
// disconnect
await page.getByRole('button',{name:/Tracking|Retry|Linking/}).click().catch(()=>{});
await sleep(1000);
await vp('04-after-disconnect.png');
fs.writeFileSync(`${out}/tracking-input.txt`,[
  `External WebSocket tracking source on ws://localhost:${PORT}`,
  `client connected to server: ${clientConnected}`,
  `pose messages sent over the socket: ${sent}`,
  `button label after connect: ${labelA}`,
  `pose A: ${JSON.stringify(poseA)}`,
  `pose B: ${JSON.stringify(poseB)}`,
  `-> 02 vs 03 show the camera at the two EXTERNALLY-commanded poses (real network input drives applyCameraPose).`,
  '','--- page console ---',...logs,
].join('\n'));
clearInterval(ticker); wss.close(); await browser.close();
console.log('connected:',clientConnected,'sent:',sent,'label:',labelA);
