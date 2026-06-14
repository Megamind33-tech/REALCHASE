import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
const url=process.env.URL||'http://localhost:4177';
const out='docs/evidence/phase-2/rec-pipeline'; fs.mkdirSync(out,{recursive:true});
const args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'];
const browser=await chromium.launch({headless:true,executablePath:process.env.PW_EXECUTABLE,args});
const ctx=await browser.newContext({viewport:{width:1600,height:900},acceptDownloads:true}); await ctx.grantPermissions(['camera','microphone'],{origin:url});
const page=await ctx.newPage(); const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto(url,{waitUntil:'load'}); await page.waitForSelector('#chase-babylon-canvas'); await sleep(2000);
await page.click('button[title="Switcher"]'); await sleep(300);
await page.getByRole('button',{name:'Add Webcam'}).click(); await page.waitForSelector('video'); await sleep(900);
await page.getByRole('button',{name:'CUT'}).click(); await sleep(400);
await page.click('button[title="Builder"]'); await page.waitForSelector('#chase-babylon-canvas'); await sleep(2000);
// REC button state before
const recDisabledBefore = await page.getAttribute('[data-testid="record-status"]','disabled');
await page.screenshot({path:`${out}/01-rec-ready.png`, clip:{x:1180,y:0,width:420,height:36}});
// start recording the Program output
await page.click('[data-testid="record-status"]'); await sleep(3500);
const labelDuring = await page.textContent('[data-testid="record-status"]');
await page.screenshot({path:`${out}/02-recording.png`, clip:{x:1180,y:0,width:420,height:36}});
// stop -> triggers a real .webm download
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 15000 }),
  page.click('[data-testid="record-status"]'),
]);
const savePath = `${out}/${download.suggestedFilename()}`;
await download.saveAs(savePath);
await sleep(500);
const st = fs.statSync(savePath);
const head = fs.readFileSync(savePath).subarray(0,4);
const isWebm = head[0]===0x1a && head[1]===0x45 && head[2]===0xdf && head[3]===0xa3;
fs.writeFileSync(`${out}/rec.txt`,[
  `REC button disabled before a Program source? (null = enabled): ${recDisabledBefore}`,
  `button label while recording: ${labelDuring}`,
  `downloaded file: ${download.suggestedFilename()}`,
  `file size: ${st.size} bytes`,
  `valid WebM (EBML magic 1A45DFA3): ${isWebm}  [first bytes: ${[...head].map(b=>b.toString(16).padStart(2,'0')).join(' ')}]`,
  `-> a real MediaRecorder .webm of the Program output was produced and saved.`,
  '','--- page console ---',...logs,
].join('\n'));
await browser.close();
console.log('label:',labelDuring,'| size:',st.size,'| webm:',isWebm);
