import { mkdirSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baseUrl = process.env.CHASE_VISUAL_BASE_URL ?? 'http://127.0.0.1:1420';
const imageFixture = resolve(root, 'docs/evidence/phase-2/source-placement/01-empty-virtual-set.png');
const evidenceDir = resolve(root, 'docs/evidence/phase-7/output-preview');
mkdirSync(evidenceDir, { recursive: true });

async function assertPlayable(browser, recordingPath, mediaType) {
  const playbackPage = await browser.newPage();
  const recordingBytes = await readFile(recordingPath);
  await playbackPage.setContent(`<video id="recording" muted autoplay src="data:${mediaType};base64,${recordingBytes.toString('base64')}"></video>`);
  await playbackPage.waitForFunction(() => {
    const video = document.querySelector('#recording');
    return video instanceof HTMLVideoElement && video.videoWidth > 0 && video.duration > 0;
  }, undefined, { timeout: 30_000 });
  await playbackPage.close();
}

async function main() {
  const launchOptions = { headless: true };
  if (process.env.CHASE_CHROMIUM_EXECUTABLE) launchOptions.executablePath = process.env.CHASE_CHROMIUM_EXECUTABLE;
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: 'commit', timeout: 120_000 });
  await page.getByTestId('builder-surface').waitFor({ state: 'visible', timeout: 240_000 });
  await page.getByRole('button', { name: 'Switcher', exact: true }).click({ force: true, noWaitAfter: true });
  await page.getByTestId('image-source-input').setInputFiles(imageFixture);
  await page.locator('[data-testid="source-row"][data-source-type="image"]').getByText('TRACK LIVE', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByRole('button', { name: 'CUT', exact: true }).click({ force: true, noWaitAfter: true });
  await page.getByTestId('program-monitor').getByText('01-empty-virtual-set', { exact: true }).waitFor({ state: 'visible' });

  await page.getByRole('button', { name: 'Builder', exact: true }).click({ force: true, noWaitAfter: true });
  await page.getByTestId('composite-output-preview').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForFunction(() => {
    const video = document.querySelector('[data-testid="composite-output-video"]');
    return video instanceof HTMLVideoElement && video.videoWidth > 0 && video.videoHeight > 0;
  }, undefined, { timeout: 30_000 });
  await page.screenshot({ path: resolve(evidenceDir, '01-composite-preview.png'), fullPage: true });

  const formatSelect = page.getByTestId('recording-format');
  const capabilities = await formatSelect.locator('option').evaluateAll((options) => options.map((option) => ({
    value: option.value,
    disabled: option.disabled,
    text: option.textContent,
  })));
  const prores = capabilities.find((item) => item.value === 'prores');
  if (!prores?.disabled) throw new Error('ProRes must remain disabled until a native ffmpeg bridge is available.');
  const h264 = capabilities.find((item) => item.value === 'h264');
  await formatSelect.selectOption('webm');

  const recordButton = page.getByTestId('record-status');
  if (!(await recordButton.isEnabled())) throw new Error('Record control did not enable after Program received a real source.');
  await recordButton.click({ force: true, noWaitAfter: true });
  await page.waitForFunction(() => {
    const text = document.querySelector('[data-testid="recording-telemetry"]')?.textContent ?? '';
    return !text.trim().startsWith('0 B');
  }, undefined, { timeout: 30_000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await recordButton.click({ force: true, noWaitAfter: true });
  const download = await downloadPromise;
  const filename = download.suggestedFilename();
  if (!filename.endsWith('.webm')) throw new Error(`Expected .webm recording, got ${filename}`);
  const recordingPath = resolve(evidenceDir, 'recorded-output.webm');
  await download.saveAs(recordingPath);
  if ((await stat(recordingPath)).size === 0) throw new Error('Recorded output file is empty.');
  await assertPlayable(browser, recordingPath, 'video/webm');

  let h264Filename = null;
  if (h264 && !h264.disabled) {
    await formatSelect.selectOption('h264');
    await recordButton.click({ force: true, noWaitAfter: true });
    await page.waitForTimeout(1500);
    const h264DownloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await recordButton.click({ force: true, noWaitAfter: true });
    const h264Download = await h264DownloadPromise;
    h264Filename = h264Download.suggestedFilename();
    if (!h264Filename.endsWith('.mp4')) throw new Error(`Expected .mp4 recording, got ${h264Filename}`);
    const h264Path = resolve(evidenceDir, 'recorded-output.mp4');
    await h264Download.saveAs(h264Path);
    if ((await stat(h264Path)).size === 0) throw new Error('H.264 output file is empty.');
    await assertPlayable(browser, h264Path, 'video/mp4');
  }
  if (pageErrors.length) throw new Error(`Browser page errors: ${pageErrors.join(' | ')}`);

  await browser.close();
  console.log(`output preview smoke passed (${filename})`);
  if (h264Filename) console.log(`native H.264 playback passed (${h264Filename})`);
  console.log(`evidence written to ${evidenceDir}`);
}

main().catch((error) => {
  console.error('output preview smoke failed');
  console.error(error);
  process.exit(1);
});
