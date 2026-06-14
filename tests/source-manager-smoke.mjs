import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baseUrl = process.env.CHASE_VISUAL_BASE_URL ?? 'http://127.0.0.1:1420';
const imageFixture = resolve(root, 'docs/evidence/phase-2/source-placement/01-empty-virtual-set.png');
const videoFixture = resolve(root, 'docs/evidence/phase-2/rec-pipeline/chase-program-2026-06-14T02-58-41-952Z.webm');

async function openSwitcher(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByTestId('builder-surface').waitFor({ state: 'visible', timeout: 120_000 });
  await page.getByRole('button', { name: 'Switcher', exact: true }).click();
  await page.getByTestId('switcher-surface').waitFor({ state: 'visible', timeout: 30_000 });
}

async function verifyFileSource(page, { type, inputTestId, file, initialName, renamed }) {
  await page.getByTestId(inputTestId).setInputFiles(file);
  const row = page.locator(`[data-testid="source-row"][data-source-type="${type}"]`);
  await row.waitFor({ state: 'visible', timeout: 30_000 });
  await row.getByText('TRACK LIVE', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByTestId('preview-monitor').getByText(initialName, { exact: true }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('video')).some((video) => video.videoWidth > 0), undefined, { timeout: 30_000 });

  await page.getByRole('button', { name: 'CUT', exact: true }).click();
  await page.getByTestId('program-monitor').getByText(initialName, { exact: true }).waitFor({ state: 'visible' });

  const nameInput = row.getByLabel(`Rename ${initialName}`, { exact: true });
  await nameInput.fill(renamed);
  await nameInput.press('Enter');
  await page.getByTestId('program-monitor').getByText(renamed, { exact: true }).waitFor({ state: 'visible' });

  await row.getByRole('button', { name: `Remove ${renamed}`, exact: true }).click();
  await row.waitFor({ state: 'detached', timeout: 30_000 });
  await page.getByTestId('program-monitor').getByText('Program empty', { exact: true }).waitFor({ state: 'visible' });
}

async function main() {
  const launchOptions = { headless: true };
  if (process.env.CHASE_CHROMIUM_EXECUTABLE) launchOptions.executablePath = process.env.CHASE_CHROMIUM_EXECUTABLE;
  const browser = await chromium.launch(launchOptions);

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await openSwitcher(page);
  await verifyFileSource(page, {
    type: 'image',
    inputTestId: 'image-source-input',
    file: imageFixture,
    initialName: '01-empty-virtual-set',
    renamed: 'Studio Still',
  });
  await verifyFileSource(page, {
    type: 'video',
    inputTestId: 'video-source-input',
    file: videoFixture,
    initialName: 'chase-program-2026-06-14T02-58-41-952Z',
    renamed: 'Recorded Program',
  });
  await page.waitForFunction(() => document.querySelectorAll('video').length === 0, undefined, { timeout: 30_000 });

  const unsupported = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await unsupported.addInitScript(() => {
    if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: undefined, configurable: true });
    Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', { value: undefined, configurable: true });
  });
  await openSwitcher(unsupported);
  await unsupported.getByTestId('add-webcam-source').click();
  await unsupported.getByText('getUserMedia is not available in this environment.', { exact: true }).waitFor({ state: 'visible' });
  await unsupported.getByTestId('add-screen-source').click();
  await unsupported.getByText('Screen capture is not available in this environment.', { exact: true }).waitFor({ state: 'visible' });
  if (pageErrors.length) throw new Error(`Browser page errors: ${pageErrors.join(' | ')}`);

  await browser.close();
  console.log('source manager smoke passed');
}

main().catch((error) => {
  console.error('source manager smoke failed');
  console.error(error);
  process.exit(1);
});
