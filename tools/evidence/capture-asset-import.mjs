import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import { resolve } from 'node:path';

// End-to-end proof for PR #23: a real external GLB enters CHASE, appears on the
// studio stage, is transformed, saved into a CHASE project, and restored after a
// full reload. The fixture is a genuine glTF 2.0 binary (tools/make-test-glb.mjs).
const url = process.env.URL || 'http://localhost:4177';
const out = 'docs/evidence/phase-3/asset-import';
fs.mkdirSync(out, { recursive: true });
const fixture = resolve('tests/fixtures/chase-test-cube.glb');
const fixtureBytes = fs.readFileSync(fixture);
const log = [];
const note = (s) => { log.push(s); console.log(s); };

const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'];
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_EXECUTABLE, args });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
// Force the localStorage save path (simulate a browser without the File System
// Access API) so the project JSON is deterministically readable in this test.
await page.addInitScript(() => { try { delete window.showSaveFilePicker; } catch { /* ignore */ } });
page.on('console', (m) => { if (m.type() === 'error') log.push(`[console.error] ${m.text()}`); });
page.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));

note(`fixture: ${fixture} (${fixtureBytes.length} bytes, GLB magic ${fixtureBytes.toString('ascii', 0, 4)})`);

await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('#chase-babylon-canvas');
await sleep(2500);

// 01 — the real import panel.
await page.getByTestId('asset-import-panel').scrollIntoViewIfNeeded();
await page.getByTestId('asset-import-panel').screenshot({ path: `${out}/01-import-panel.png` });
note('01-import-panel.png captured');

// Failure states first (no asset should be added). Read the toast message each.
async function importAndReadToast(file) {
  await page.setInputFiles('[data-testid="asset-file-input"]', file);
  await page.locator('.toast').waitFor({ state: 'visible', timeout: 8000 });
  await sleep(150);
  return (await page.locator('.toast').first().innerText()).trim();
}
const unsupportedMsg = await importAndReadToast({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a model') });
note(`unsupported import -> "${unsupportedMsg}"`);
const corruptMsg = await importAndReadToast({ name: 'broken.glb', mimeType: 'model/gltf-binary', buffer: Buffer.from('this is not a valid glb header') });
note(`corrupt import -> "${corruptMsg}"`);
const failuresOk = /unsupported/i.test(unsupportedMsg) && /valid glb|glTF/i.test(corruptMsg);
note(`failure states honest & precise: ${failuresOk}`);
const listAfterFailures = await page.getByTestId('imported-asset-list').count();
note(`assets after rejected imports (must be 0): ${listAfterFailures}`);
await sleep(1500); // let the toast clear

// Import the GLB through the real file input.
await page.setInputFiles('[data-testid="asset-file-input"]', fixture);
await page.getByTestId('imported-asset-list').waitFor({ state: 'visible', timeout: 15000 });
await page.getByTestId('asset-inspector').waitFor({ state: 'visible', timeout: 15000 });
await sleep(800);

const info = await page.evaluate(() => {
  const get = (label) => document.querySelector(`input[aria-label="${label}"]`)?.value ?? null;
  const insp = document.querySelector('[data-testid="asset-inspector"]');
  return {
    inspectorText: insp ? insp.innerText.replace(/\n+/g, ' | ') : null,
    posX: get('Position X'), posY: get('Position Y'), posZ: get('Position Z'),
    rotY: get('Rotation Y'), scaleX: get('Scale X'),
  };
});
note(`imported asset inspector: ${info.inspectorText}`);
note(`transform after import: pos=(${info.posX}, ${info.posY}, ${info.posZ}) rotY=${info.rotY} scaleX=${info.scaleX}`);

// Place it clearly on stage (real transform via the inspector numeric fields).
async function setVec(label, value) {
  const el = page.locator(`input[aria-label="${label}"]`);
  await el.fill(String(value));
  await el.dispatchEvent('input');
  await el.blur();
}
await setVec('Position Y', 1.6);
await setVec('Scale X', 1.6);
await setVec('Scale Y', 1.6);
await setVec('Scale Z', 1.6);
await sleep(700);
await page.getByTestId('builder-surface').screenshot({ path: `${out}/02-asset-on-stage.png` });
note('02-asset-on-stage.png captured (asset lifted + scaled onto the stage)');

// 03 — transform controls: engage the Rotate tool and rotate the asset.
await page.getByRole('button', { name: 'Rotate tool' }).click();
await setVec('Rotation Y', 35);
await sleep(700);
const transformed = await page.evaluate(() => {
  const get = (label) => document.querySelector(`input[aria-label="${label}"]`)?.value ?? null;
  return { posY: get('Position Y'), rotY: get('Rotation Y'), scaleX: get('Scale X') };
});
note(`transform after edit: posY=${transformed.posY} rotY=${transformed.rotY} scaleX=${transformed.scaleX}`);
// capture the inspector (transform controls) and the stage together
await page.screenshot({ path: `${out}/03-transform-controls.png`, clip: { x: 980, y: 60, width: 620, height: 700 } });
note('03-transform-controls.png captured');

// Save the project (localStorage path), then read the serialized project.
await page.getByRole('button', { name: 'Save Project' }).click();
await sleep(600);
const projectJson = await page.evaluate(() => localStorage.getItem('chase:lastProject'));
if (!projectJson) throw new Error('project was not saved to localStorage');
const project = JSON.parse(projectJson);
const savedAsset = project.assets?.[0];
note(`saved project: ${project.assets?.length ?? 0} asset(s); embedded=${savedAsset?.embedded}; bytes=${savedAsset?.fileBytes}; transform=${JSON.stringify(savedAsset?.transform)}`);

// Full reload — fresh app, no assets — then reopen the project file.
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('#chase-babylon-canvas');
await sleep(2500);
const beforeReopen = await page.getByTestId('imported-asset-list').count();
note(`assets in scene immediately after reload (before reopen): ${beforeReopen}`);

await page.setInputFiles('input[accept=".chaseproj,application/json"]', {
  name: `${project.projectName || 'project'}.chaseproj`,
  mimeType: 'application/json',
  buffer: Buffer.from(projectJson, 'utf8'),
});
await page.getByTestId('imported-asset-list').waitFor({ state: 'visible', timeout: 20000 });
await page.getByTestId('asset-inspector').waitFor({ state: 'visible', timeout: 20000 });
await sleep(1000);
const restored = await page.evaluate(() => {
  const get = (label) => document.querySelector(`input[aria-label="${label}"]`)?.value ?? null;
  const insp = document.querySelector('[data-testid="asset-inspector"]');
  return {
    inspectorText: insp ? insp.innerText.replace(/\n+/g, ' | ') : null,
    posY: get('Position Y'), rotY: get('Rotation Y'), scaleX: get('Scale X'),
  };
});
note(`restored asset inspector: ${restored.inspectorText}`);
note(`restored transform: posY=${restored.posY} rotY=${restored.rotY} scaleX=${restored.scaleX}`);
await page.getByTestId('builder-surface').screenshot({ path: `${out}/04-reloaded-scene.png` });
note('04-reloaded-scene.png captured');

const placementOk = Math.abs(parseFloat(restored.posY) - 1.6) < 0.05 && Math.abs(parseFloat(restored.rotY) - 35) < 1 && Math.abs(parseFloat(restored.scaleX) - 1.6) < 0.05;
note('');
note(placementOk
  ? '-> PASS: the imported GLB was placed, transformed, saved, reloaded, and restored with its exact placement.'
  : `-> CHECK: restored placement did not match (expected posY~1.6 rotY~35 scaleX~1.6, got posY=${restored.posY} rotY=${restored.rotY} scaleX=${restored.scaleX}).`);

fs.writeFileSync(`${out}/asset-import-log.txt`, log.join('\n') + '\n');
await browser.close();
if (!placementOk || !failuresOk || listAfterFailures !== 0) process.exit(1);
