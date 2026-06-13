// Phase 1 evidence capture.
// Launches the built app (served by `vite preview`) in headless Chromium with
// software WebGL (SwiftShader) and captures screenshots + console logs proving
// the app boots, the Babylon viewport renders, and telemetry is real (FPS) with
// no fabricated CPU/GPU/RAM or random meters.
//
// Usage: URL=http://localhost:4173 node tools/evidence/capture-phase-1.mjs
import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

const url = process.env.URL || 'http://localhost:4173';
const outDir = 'docs/evidence/phase-1';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PW_EXECUTABLE || undefined,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
  ],
});

const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText ?? ''}`));

// Record every network request so we can prove there is no Google Fonts fetch.
const requests = [];
page.on('request', (r) => requests.push(r.url()));

await page.goto(url, { waitUntil: 'load', timeout: 30000 });

// Wait for the engine to report ready (viewport overlay stops saying "Initializing").
await page
  .waitForFunction(
    () => /\d+\s*fps/i.test(document.body.innerText) && !/Initializing scene/.test(document.body.innerText),
    { timeout: 30000 },
  )
  .catch(() => logs.push('[warn] engine-ready text not detected within timeout'));

await sleep(3500); // allow several FPS samples to flow through

await page.screenshot({ path: `${outDir}/01-app-launched.png` });

const vp = await page.$('#babylon-viewport');
if (vp) await vp.screenshot({ path: `${outDir}/02-viewport-rendered.png` });

const header = await page.$('header');
if (header) await header.screenshot({ path: `${outDir}/03-telemetry-topbar.png` });

const footer = await page.$('footer');
if (footer) await footer.screenshot({ path: `${outDir}/04-statusbar.png` });

// Output panel (bottom of the right column) — proves no animated fake meters,
// honest "not connected" REC/stream states.
await page.screenshot({ path: `${outDir}/05-output-panel.png`, clip: { x: 1320, y: 650, width: 280, height: 228 } });

const headerText = (await page.evaluate(() => document.querySelector('header')?.innerText || '')).trim();
const footerText = (await page.evaluate(() => document.querySelector('footer')?.innerText || '')).trim();
const googleFontReqs = requests.filter((u) => /googleapis|gstatic/.test(u));

fs.writeFileSync(
  `${outDir}/runtime-report.txt`,
  [
    `URL: ${url}`,
    `Captured: ${new Date().toISOString()}`,
    '',
    '--- Top bar text (telemetry) ---',
    headerText,
    '',
    '--- Status bar text ---',
    footerText,
    '',
    `--- Google Fonts network requests: ${googleFontReqs.length} ---`,
    ...googleFontReqs,
    '',
    '--- Console / page errors ---',
    ...(logs.length ? logs : ['(none)']),
    '',
  ].join('\n'),
);

await browser.close();
console.log('Evidence written to', outDir);
console.log('Header telemetry:', headerText.replace(/\n/g, ' | '));
console.log('Google Fonts requests:', googleFontReqs.length);
