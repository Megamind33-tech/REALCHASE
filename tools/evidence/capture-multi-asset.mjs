import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import { resolve } from 'node:path';

// End-to-end proof for PR #24: multi-asset studio scene + groups + external
// references. Imports 3 real GLBs, renames/duplicates, groups two and transforms
// the group, marks one asset as an external reference, saves, reloads (restoring
// exact transforms + group structure), then proves the honest missing-file state
// when the external file is absent. No fake placeholders.
const url = process.env.URL || 'http://localhost:4177';
const distDir = resolve('dist');
const out = 'docs/evidence/phase-4/multi-asset-scene';
fs.mkdirSync(out, { recursive: true });

const fixtures = {
  cube: resolve('tests/fixtures/chase-test-cube.glb'),
  pyramid: resolve('tests/fixtures/chase-test-pyramid.glb'),
  octa: resolve('tests/fixtures/chase-test-octa.glb'),
};
// Serve a copy of the cube as the external referenced asset (fetchable at /ext-test-asset.glb).
const extServed = resolve(distDir, 'ext-test-asset.glb');
fs.copyFileSync(fixtures.cube, extServed);

const log = [];
const note = (s) => { log.push(s); console.log(s); };
let crashed = false;

const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'];
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_EXECUTABLE, args });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => { try { delete window.showSaveFilePicker; } catch { /* ignore */ } });
page.on('pageerror', (e) => { crashed = true; log.push(`[pageerror] ${e.message}`); });

const vec = async (label) => parseFloat(await page.locator(`input[aria-label="${label}"]`).inputValue());
async function setVec(label, value) {
  const el = page.locator(`input[aria-label="${label}"]`);
  await el.fill(String(value)); await el.dispatchEvent('input'); await el.blur();
}
async function saveAndRead() {
  await page.getByRole('button', { name: 'Save Project' }).click();
  await sleep(500);
  return JSON.parse(await page.evaluate(() => localStorage.getItem('chase:lastProject')));
}
async function openProject(json) {
  await page.setInputFiles('input[accept=".chaseproj,application/json"]', {
    name: 'multi.chaseproj', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json), 'utf8'),
  });
  await sleep(2000);
}

await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('#chase-babylon-canvas');
await sleep(2500);

// 1) Import 3 real GLBs.
await page.setInputFiles('[data-testid="asset-file-input"]', [fixtures.cube, fixtures.pyramid, fixtures.octa]);
await page.getByTestId('scene-outliner').waitFor({ state: 'visible', timeout: 15000 });
await sleep(1500);
const importedCount = await page.locator('[data-testid^="outliner-asset-"]').count();
note(`imported assets: ${importedCount} (cube 8v, pyramid 4v, octa 6v)`);
await page.getByTestId('scene-outliner').screenshot({ path: `${out}/01-multi-import-panel.png` });

const outliner = page.getByTestId('scene-outliner');

// 2) Outliner selection.
await outliner.getByRole('button', { name: 'chase-test-octa', exact: true }).click();
await sleep(400);
await page.getByTestId('asset-inspector').waitFor({ state: 'visible', timeout: 8000 });
await outliner.screenshot({ path: `${out}/02-outliner-selection.png` });
note('selected chase-test-octa in the outliner (inspector shown)');

// 3) Rename one + duplicate one.
await outliner.getByRole('button', { name: 'Rename chase-test-cube' }).click();
const nameInput = page.locator('input[aria-label="Asset name"]');
await nameInput.fill('Anchor Desk Prop');
await nameInput.press('Enter');
await sleep(400);
note('renamed chase-test-cube -> "Anchor Desk Prop"');

await outliner.getByRole('button', { name: 'Duplicate chase-test-pyramid', exact: true }).click();
await sleep(1500);
const afterDup = await page.locator('[data-testid^="outliner-asset-"]').count();
note(`duplicated chase-test-pyramid -> total assets now ${afterDup}`);
await outliner.screenshot({ path: `${out}/03-duplicate-and-rename.png` });

// 4) Group two assets + transform the group.
await outliner.getByRole('checkbox', { name: 'Select chase-test-octa' }).check();
await outliner.getByRole('checkbox', { name: 'Select chase-test-pyramid copy' }).check();
await page.fill('input[aria-label="New group name"]', 'Set Group');
await page.getByTestId('create-group-button').click();
await sleep(1000);
const groupCount = await page.locator('[data-testid^="outliner-group-"]').count();
note(`created group "Set Group"; groups in outliner: ${groupCount}`);
// select the group and move it
await outliner.getByRole('button', { name: /^Set Group/ }).click();
await page.getByTestId('group-inspector').waitFor({ state: 'visible', timeout: 8000 });
await setVec('Position Y', 1.2);
await setVec('Position X', -0.8);
await sleep(600);
const groupY = await vec('Position Y');
note(`group transform set: posX=${await vec('Position X')} posY=${groupY}`);
await page.screenshot({ path: `${out}/04-group-transform.png` });

// 5) Mark the renamed cube as an external reference.
await outliner.getByRole('button', { name: 'Anchor Desk Prop', exact: true }).click();
await page.getByTestId('asset-inspector').waitFor({ state: 'visible', timeout: 8000 });
await setVec('Position X', -1.5);
await page.getByRole('checkbox', { name: 'External reference' }).check();
await sleep(300);
await page.fill('input[aria-label="Reference path"]', '/ext-test-asset.glb');
await sleep(400);
note('marked "Anchor Desk Prop" as external reference -> /ext-test-asset.glb');

// 6) Save and inspect embed/reference status.
const save1 = await saveAndRead();
const a1 = save1.assetScene.assets;
const embedded = a1.filter((a) => a.embedded);
const referenced = a1.filter((a) => !a.embedded);
note('');
note(`saved scene: ${a1.length} assets, ${save1.assetScene.groups.length} group(s)`);
note(`embedded=true assets: ${embedded.map((a) => a.name).join(', ')}`);
note(`embedded=false (external) assets: ${referenced.map((a) => `${a.name}@${a.referencePath}`).join(', ')}`);
const grp = save1.assetScene.groups[0];
note(`group "${grp?.name}" childIds: ${JSON.stringify(grp?.childIds)} transform.posY=${grp?.transform.position[1]}`);

// 7) Reload (external file PRESENT) and reopen -> everything restored.
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('#chase-babylon-canvas');
await sleep(2500);
const beforeReopen = await page.locator('[data-testid^="outliner-asset-"]').count();
note('');
note(`assets after reload before reopen: ${beforeReopen}`);
await openProject(save1);
await page.getByTestId('scene-outliner').waitFor({ state: 'visible', timeout: 20000 });
await sleep(1000);
const restoredCount = await page.locator('[data-testid^="outliner-asset-"]').count();
const restoredGroups = await page.locator('[data-testid^="outliner-group-"]').count();
note(`reopened: ${restoredCount} assets, ${restoredGroups} group(s) restored (external file present)`);

// Save again and compare transforms id-by-id for exact restore.
const save2 = await saveAndRead();
const byId = (snap) => Object.fromEntries(snap.assetScene.assets.map((a) => [a.id, a.transform]));
const t1 = byId(save1); const t2 = byId(save2);
const eq = (x, y) => x && y && ['position', 'rotation', 'scaling'].every((k) => x[k].every((v, i) => Math.abs(v - y[k][i]) < 1e-3));
const ids = Object.keys(t1);
const exact = ids.every((id) => eq(t1[id], t2[id]));
const g1 = save1.assetScene.groups[0]?.transform; const g2 = save2.assetScene.groups[0]?.transform;
const groupExact = eq(g1, g2);
note(`exact transform restore across reload: assets=${exact} (${ids.length} compared), group=${groupExact}`);
await page.screenshot({ path: `${out}/06-reloaded-multi-asset-scene.png` });

// 8) Missing-file case: remove the external file, reopen the same project.
fs.rmSync(extServed, { force: true });
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('#chase-babylon-canvas');
await sleep(2500);
await openProject(save1);
await page.getByTestId('scene-outliner').waitFor({ state: 'visible', timeout: 20000 });
await sleep(800);
const stillListed = await page.locator('[data-testid^="outliner-asset-"]').count();
const outlinerNames = await page.getByTestId('scene-outliner').getByRole('button').allInnerTexts();
note(`outliner buttons after missing reopen: ${JSON.stringify(outlinerNames)}`);
// select the external (now missing) asset and confirm the honest missing state.
await page.getByTestId('scene-outliner').getByRole('button', { name: 'Anchor Desk Prop', exact: true }).click();
await sleep(400);
const missingVisible = await page.getByTestId('missing-asset-warning').count();
note('');
note(`missing-file reopen: assets still listed in outliner: ${stillListed}`);
note(`missing-asset warning shown for the unresolved external asset: ${missingVisible > 0}`);
const save3 = await saveAndRead();
const missingAsset = save3.assetScene.assets.find((a) => a.name === 'Anchor Desk Prop');
note(`"Anchor Desk Prop" after missing reopen -> missing=${missingAsset?.missing}, transform preserved posX=${missingAsset?.transform.position[0]}`);
await page.screenshot({ path: `${out}/05-external-reference-warning.png` });

note('');
const pass = importedCount >= 3 && afterDup === importedCount + 1 && groupCount === 1 && embedded.length >= 1 && referenced.length === 1
  && exact && groupExact && restoredCount === a1.length && missingVisible > 0 && missingAsset?.missing === true && !crashed;
note(pass
  ? '-> PASS: multi-asset scene imported, renamed, duplicated, grouped + transformed, saved (embedded + external), reloaded with exact transforms, and missing external file shown honestly. No crash.'
  : '-> CHECK: see values above.');

fs.writeFileSync(`${out}/multi-asset-scene-log.txt`, log.join('\n') + '\n');
await browser.close();
if (!pass) process.exit(1);
