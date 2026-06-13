import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
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
if (/\bMeter\b/.test(outputPanel) || /rec-pulse|meter-fill|random/i.test(outputPanel)) {
  fail('outputs surface contains a meter/animated/random-meter implementation without real audio state');
}
if (!outputPanel.includes('No real audio source connected')) {
  fail('outputs surface does not expose the honest no-audio-source state');
}
if (!outputPanel.includes('Streaming disabled until MediaMTX/output pipeline is added')) {
  fail('stream destination panel does not explain disabled streaming state');
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
