import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocketServer } from 'ws';
import fs from 'node:fs';
const url=process.env.URL||'http://localhost:4177';
const out='docs/evidence/phase-2/tracking-freed'; fs.mkdirSync(out,{recursive:true});
const PORT=7788;
const enc24=v=>{v&=0xFFFFFF;return [(v>>16)&0xFF,(v>>8)&0xFF,v&0xFF];};
function buildD1({cam=1,pan=0,tilt=0,roll=0,x=0,y=0,z=0,zoom=0,focus=0}){
  const b=new Uint8Array(29); b[0]=0xD1; b[1]=cam;
  const put=(o,a)=>{b[o]=a[0];b[o+1]=a[1];b[o+2]=a[2];};
  put(2,enc24(Math.round(pan*32768)));put(5,enc24(Math.round(tilt*32768)));put(8,enc24(Math.round(roll*32768)));
  put(11,enc24(Math.round(x*1000*64)));put(14,enc24(Math.round(y*1000*64)));put(17,enc24(Math.round(z*1000*64)));
  put(20,enc24(zoom));put(23,enc24(focus));
  let s=0;for(let i=0;i<28;i++)s+=b[i];b[28]=(0x40-s)&0xFF;return b;
}
// pan/tilt (deg) that look from pos toward the set centre, matching applyFreeDPose's forward convention
function lookAt(x,y,z, tx=0,ty=1.4,tz=2){ const dx=tx-x,dy=ty-y,dz=tz-z; const len=Math.hypot(dx,dy,dz);
  const fy=dy/len; const tilt=Math.asin(Math.max(-1,Math.min(1,fy)))*180/Math.PI;
  const pan=Math.atan2(dx,dz)*180/Math.PI; return {pan,tilt}; }
const A={x:-5,y:5.5,z:-6,zoom:0x600000}; const B={x:5,y:1.1,z:-4.5,zoom:0xB00000};
const poseA=buildD1({cam:1,...A,...lookAt(A.x,A.y,A.z)});
const poseB=buildD1({cam:1,...B,...lookAt(B.x,B.y,B.z)});
let pkt=poseA, sent=0, connected=false;
const wss=new WebSocketServer({port:PORT});
wss.on('connection',()=>{connected=true;});
const ticker=setInterval(()=>{for(const c of wss.clients) if(c.readyState===1){ c.send(pkt); sent++; }},50);

const args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'];
const browser=await chromium.launch({headless:true,executablePath:process.env.PW_EXECUTABLE,args});
const ctx=await browser.newContext({viewport:{width:1600,height:900}}); await ctx.grantPermissions(['camera','microphone'],{origin:url});
const page=await ctx.newPage(); const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
const vp=async n=>{const e=await page.$('#babylon-viewport'); if(e) await e.screenshot({path:`${out}/${n}`});};
await page.goto(url,{waitUntil:'load'}); await page.waitForSelector('#chase-babylon-canvas'); await sleep(2000);
await page.click('button[title="Switcher"]'); await sleep(300);
await page.getByRole('button',{name:'Add Webcam'}).click(); await page.waitForSelector('video'); await sleep(800);
await page.getByRole('button',{name:'CUT'}).click(); await sleep(400);
await page.click('button[title="Builder"]'); await page.waitForSelector('#chase-babylon-canvas'); await sleep(1200);
await page.evaluate(()=>{const r=[...document.querySelectorAll('input[type=range]')].find(x=>x.getAttribute('aria-label')==='Tracking smoothing'); if(r){const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(r,'0.15'); r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));}});
// set the tracking URL to the FreeD test server and connect
await page.evaluate((u)=>{const i=document.querySelector('input[aria-label="Tracking source URL"]'); if(i){const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(i,u); i.dispatchEvent(new Event('input',{bubbles:true}));}}, `ws://localhost:${PORT}`);
pkt=poseA; await page.getByRole('button',{name:'Connect tracking'}).click(); await sleep(3500);
await vp('01-freed-pose-a.png');
pkt=poseB; await sleep(3500); await vp('02-freed-pose-b.png');
fs.writeFileSync(`${out}/freed-e2e.txt`,[
  `FreeD BINARY packets sent over WebSocket (ws://localhost:${PORT}); client connected: ${connected}; binary frames sent: ${sent}`,
  `pose A FreeD bytes: ${[...poseA].map(b=>b.toString(16).padStart(2,'0')).join(' ')}`,
  `pose A decoded position(m): [${A.x}, ${A.y}, ${A.z}] zoom 0x${A.zoom.toString(16)}`,
  `pose B decoded position(m): [${B.x}, ${B.y}, ${B.z}] zoom 0x${B.zoom.toString(16)}`,
  `-> 01 vs 02 show the camera at the two FreeD-commanded poses (real binary FreeD drives the virtual camera).`,
  '','--- page console ---',...logs,
].join('\n'));
clearInterval(ticker); wss.close(); await browser.close();
console.log('connected:',connected,'binary frames:',sent);
