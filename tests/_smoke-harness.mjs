// Shared boot/scaffold helpers for the module smoke tests (ADDITIVE — new file).
//
// Mirrors the self-contained server boot pattern used by
// tests/perf-stress-smoke.mjs: if nothing is listening at CHASE_VISUAL_BASE_URL
// (default http://127.0.0.1:1420) it builds the app (`npm run build`) and starts
// `vite preview` on port 1420, then waits for it to come up. Set
// CHASE_SMOKE_NO_SERVER=1 to require an externally provided URL instead.
//
// Chromium is launched headless with the same software-WebGL (swiftshader via
// ANGLE) args the perf test uses so Babylon.js renders without a real GPU.
// Override with CHASE_CHROMIUM_ARGS (comma-separated) or point at a specific
// binary with CHASE_CHROMIUM_EXECUTABLE.

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const baseUrl = process.env.CHASE_VISUAL_BASE_URL ?? 'http://127.0.0.1:1420';

function runCommand(cmd, args, options) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...options });
    child.on('error', rejectPromise);
    child.on('exit', (code) => (code === 0 ? resolvePromise() : rejectPromise(new Error(`${cmd} ${args.join(' ')} exited ${code}`))));
  });
}

async function isServerUp(url) {
  try {
    const res = await fetch(url, { method: 'GET' });
    return res.ok || res.status === 200;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isServerUp(url)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

// If nothing is listening at baseUrl, build the app and boot `vite preview`.
// Returns the child process (or null if reusing an existing server).
export async function maybeStartServer(log = () => {}) {
  if (process.env.CHASE_SMOKE_NO_SERVER === '1') {
    if (!(await isServerUp(baseUrl))) throw new Error(`CHASE_SMOKE_NO_SERVER=1 but no server reachable at ${baseUrl}`);
    return null;
  }
  if (await isServerUp(baseUrl)) {
    log(`reusing already-running server at ${baseUrl}`);
    return null;
  }
  log('no server reachable — building app (npm run build)…');
  await runCommand('npm', ['run', 'build'], { cwd: root });
  log('starting `vite preview` on port 1420…');
  const server = spawn('npm', ['run', 'preview', '--', '--port', '1420', '--strictPort'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env },
  });
  const ok = await waitForServer(baseUrl, 120_000);
  if (!ok) {
    server.kill('SIGTERM');
    throw new Error(`vite preview did not come up at ${baseUrl} within 120s`);
  }
  log(`preview server is up at ${baseUrl}`);
  return server;
}

export async function launchBrowser() {
  const launchOptions = {
    headless: true,
    args: process.env.CHASE_CHROMIUM_ARGS
      ? process.env.CHASE_CHROMIUM_ARGS.split(',')
      : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  };
  if (process.env.CHASE_CHROMIUM_EXECUTABLE) launchOptions.executablePath = process.env.CHASE_CHROMIUM_EXECUTABLE;
  return chromium.launch(launchOptions);
}

// Open the app and wait for the builder surface (the default module) to render.
export async function openApp(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(baseUrl, { waitUntil: 'commit', timeout: 120_000 });
  await page.getByTestId('builder-surface').waitFor({ state: 'visible', timeout: 240_000 });
  return { page, pageErrors };
}

// Click a module-rail button (each rail button shows the module label as both
// its accessible name and title) and wait for the given surface testid. Scoped
// to the rail's <nav aria-label="Module navigation"> so labels like "AR" do not
// collide with same-named controls elsewhere on the page (e.g. "enter-ar").
export async function gotoModule(page, railLabel, surfaceTestId) {
  const rail = page.getByRole('navigation', { name: 'Module navigation' });
  await rail.getByRole('button', { name: railLabel, exact: true }).click({ force: true, noWaitAfter: true });
  await page.getByTestId(surfaceTestId).waitFor({ state: 'visible', timeout: 30_000 });
}

// Wrap a smoke test body with consistent boot/teardown + a clear pass/fail line.
export async function runSmoke(name, body) {
  const log = (m) => console.log(`[${name}] ${m}`);
  const server = await maybeStartServer(log);
  const browser = await launchBrowser();
  try {
    await body({ browser, log });
    console.log(`${name} passed`);
  } catch (error) {
    console.error(`${name} failed`);
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
    if (server) server.kill('SIGTERM');
  }
  if (process.exitCode) process.exit(process.exitCode);
}
