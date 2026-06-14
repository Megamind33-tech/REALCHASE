import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (file) => readFileSync(resolve(root, file), 'utf8');

const surfaces = {
  builder: ['src/components/shell/Viewport.tsx', 'src/components/shell/TopBar.tsx', 'src/components/shell/StatusBar.tsx'],
  switcher: ['src/components/shell/SwitcherPanel.tsx', 'src/components/shell/TopBar.tsx', 'src/components/shell/StatusBar.tsx'],
  outputs: ['src/components/shell/OutputPanel.tsx', 'src/components/shell/TopBar.tsx', 'src/components/shell/StatusBar.tsx'],
};

const forbiddenActivePhrases = [
  'excellent',
  'healthy',
  'stable',
  'online',
  'ready to stream',
  'good signal',
  'low latency',
  'broadcast ready',
  'destination connected',
  'output healthy',
];

const allowedDisabledFragments = [
  'disabled',
  'not wired',
  'not connected',
  'unavailable',
  'requires',
  'no real',
  'needs reconnect',
  'coming in next milestone',
  'until mediamtx/output pipeline is added',
  'until real output pipeline',
  'until persistent project service',
  'track live',
  'no live track',
];

function fail(message) {
  console.error(`anti-demo smoke failed: ${message}`);
  process.exitCode = 1;
}

function assertContains(file, needle) {
  const text = read(file);
  if (!text.includes(needle)) fail(`${file} is missing ${needle}`);
}

function visibleTextCandidates(source) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /[A-Za-z][^<>]*(excellent|healthy|connected|stable|online|ready|LIVE|REC|streaming|recording|signal|latency|broadcast|meter)/i.test(line));
}

function isAllowedDisabledLine(line) {
  const normalized = line.toLowerCase();
  return allowedDisabledFragments.some((fragment) => normalized.includes(fragment));
}

for (const [surface, files] of Object.entries(surfaces)) {
  for (const file of files) {
    const source = read(file);
    for (const phrase of forbiddenActivePhrases) {
      if (source.toLowerCase().includes(phrase)) {
        fail(`${surface} surface contains forbidden active confidence phrase "${phrase}" in ${file}`);
      }
    }

    for (const line of visibleTextCandidates(source)) {
      const normalized = line.toLowerCase();
      const mentionsLive = /\bLIVE\b/.test(line);
      const mentionsRec = /\bREC\b/.test(line);
      const mentionsStreaming = normalized.includes('streaming');
      const mentionsReady = /\bready\b/i.test(line);
      const mentionsRecording = normalized.includes('recording');
      const mentionsConnected = normalized.includes('connected');
      if ((mentionsLive || mentionsRec || mentionsStreaming || mentionsRecording || mentionsConnected || mentionsReady) && !isAllowedDisabledLine(line)) {
        fail(`${surface} surface has active-looking production text without disabled/runtime context in ${file}: ${line}`);
      }
    }
  }
}

assertContains('src/components/shell/Viewport.tsx', 'data-testid="builder-surface"');
assertContains('src/components/shell/SwitcherPanel.tsx', 'data-testid="switcher-surface"');
assertContains('src/components/shell/OutputPanel.tsx', 'data-testid="outputs-surface"');
assertContains('src/components/shell/OutputPanel.tsx', 'data-testid="stream-destination-panel"');
assertContains('src/components/shell/OutputPanel.tsx', 'data-testid="audio-meter-panel"');
assertContains('src/components/shell/SwitcherPanel.tsx', 'data-testid="source-health-panel"');
assertContains('src/components/shell/TopBar.tsx', 'data-testid="live-status"');
assertContains('src/components/shell/TopBar.tsx', 'data-testid="record-status"');

const outputPanel = read('src/components/shell/OutputPanel.tsx');
// Fake/animated/random meters are forbidden. Real metering is allowed only via
// the Web Audio AudioMeter component, and only driven by an actual audio track.
if (/rec-pulse|meter-fill|Math\.random|setInterval/i.test(outputPanel)) {
  fail('outputs surface contains an animated/random fake meter implementation');
}
if (/<AudioMeter\b/.test(outputPanel)) {
  if (!outputPanel.includes("from '@/components/audio/AudioMeter'")) {
    fail('outputs surface renders a meter that is not the real Web Audio AudioMeter');
  }
  if (!outputPanel.includes('getAudioTracks()')) {
    fail('outputs surface shows meters without gating on a real audio track');
  }
}
if (!outputPanel.includes('No real audio source connected')) {
  fail('outputs surface does not expose the honest no-audio-source fallback state');
}
// Output fans out for real to per-platform destinations via the local relay.
// Each station must take REAL credentials (no faked "connected" state): an
// ingest URL + a stream key, plus the public live-website (WHEP) page.
if (!outputPanel.includes('stream key')) {
  fail('stream destination panel does not collect real per-station stream keys');
}
if (!outputPanel.includes('live.html')) {
  fail('stream destination panel does not expose the real public live-website page');
}
if (!outputPanel.includes('data-testid="armed-target-count"')) {
  fail('stream destination panel does not surface the real armed-leg count');
}

const viewport = read('src/components/shell/Viewport.tsx');
if (/data-testid="live-status"|\bLIVE\b|rec-pulse/.test(viewport)) {
  fail('builder viewport contains an active/fake live indicator');
}

if (process.exitCode) process.exit(process.exitCode);
console.log('anti-demo smoke passed');
for (const [surface, files] of Object.entries(surfaces)) {
  console.log(`covered ${surface}: ${files.map((f) => relative(root, resolve(root, f))).join(', ')}`);
}
