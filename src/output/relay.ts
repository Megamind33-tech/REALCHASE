// Relay control: programs the local MediaMTX relay to fan the Program output out
// to every enabled RTMP destination. The browser studio publishes ONE WebRTC
// (WHIP) stream; the relay re-encodes once and pushes to all legs via a single
// ffmpeg `tee`, triggered server-side by MediaMTX `runOnReady`. The public live
// website plays the same path over WHEP/HLS with no extra push.
//
// Browsers can't speak RTMP — this relay is exactly how a browser-based encoder
// reaches YouTube / Facebook / Twitch for real.

import type { ResolvedTarget } from './destinations';

export interface RelayEndpoints {
  /** MediaMTX REST API base, e.g. http://localhost:9997 */
  apiBase: string;
  /** Path name being published, e.g. "chase" */
  path: string;
  /** Internal pull URL the relay reads to feed ffmpeg. */
  rtspUrl: string;
  /** Public low-latency WebRTC playback (WHEP) URL for the live website. */
  whepUrl: string;
  /** Public HLS playlist URL for the live website. */
  hlsUrl: string;
}

/**
 * Derive every relay endpoint from the single WHIP URL the operator enters.
 * WHIP URL shape: http(s)://host:8889/<path>/whip
 * API defaults to the same host on MediaMTX's standard control port (9997).
 */
export function deriveRelay(whipUrl: string, apiPort = 9997, rtspPort = 8554): RelayEndpoints | null {
  let u: URL;
  try { u = new URL(whipUrl.trim()); } catch { return null; }
  const segments = u.pathname.split('/').filter(Boolean);
  // Drop a trailing "whip" segment to recover the path name.
  if (segments.length && segments[segments.length - 1].toLowerCase() === 'whip') segments.pop();
  const path = segments.join('/');
  if (!path) return null;
  const host = u.hostname;
  const apiBase = `${u.protocol}//${host}:${apiPort}`;
  return {
    apiBase,
    path,
    rtspUrl: `rtsp://${host}:${rtspPort}/${path}`,
    whepUrl: `${u.protocol}//${u.host}/${path}/whep`,
    hlsUrl: `${u.protocol}//${host}:8888/${path}/index.m3u8`,
  };
}

/**
 * One ffmpeg encode per leg. The relay pulls the published path over RTSP,
 * normalises it (WebRTC sources are variable-fps and can have odd dimensions
 * like 682x361 — libx264/yuv420p needs even dimensions and a defined rate), and
 * pushes H.264/AAC FLV to the leg's RTMP(S) ingest.
 *
 * Each leg is its own process rather than a shared `tee`: the flv H.264 sequence
 * header is then emitted correctly per connection, and one failing destination
 * (a bad key, a platform hiccup) can never take the others down.
 */
export function legCommand(rtspUrl: string, targetUrl: string): string {
  return [
    'ffmpeg', '-nostdin', '-loglevel', 'warning',
    '-rtsp_transport', 'tcp', '-fflags', '+genpts', '-probesize', '5M', '-analyzeduration', '5M',
    '-i', rtspUrl,
    '-map', '0:v', '-map', '0:a',
    '-vf', 'scale=-2:720,format=yuv420p', '-r', '30',
    '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-profile:v', 'main',
    '-pix_fmt', 'yuv420p', '-g', '60', '-b:v', '4500k', '-maxrate', '4500k', '-bufsize', '9000k',
    '-c:a', 'aac', '-ar', '44100', '-b:a', '160k',
    '-f', 'flv', targetUrl,
  ].join(' ');
}

/**
 * Build the runOnReady command MediaMTX launches when the stream goes ready:
 * one ffmpeg per target. A single target runs ffmpeg directly; multiple targets
 * are launched concurrently under `sh -c "... & ... & wait"`.
 */
export function buildFanoutCommand(rtspUrl: string, targets: ResolvedTarget[]): string {
  if (targets.length === 1) return legCommand(rtspUrl, targets[0].url);
  const script = targets.map((t) => legCommand(rtspUrl, t.url)).join(' & ') + ' & wait';
  return `sh -c "${script}"`;
}

async function api(method: string, url: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Install the fan-out on the relay BEFORE publishing, so the runOnReady hook
 * fires the moment the WHIP stream becomes ready. Idempotent: replaces any
 * existing config for the path.
 */
export async function configureFanout(ep: RelayEndpoints, targets: ResolvedTarget[]): Promise<void> {
  const config = targets.length
    ? { runOnReady: buildFanoutCommand(ep.rtspUrl, targets), runOnReadyRestart: true }
    : {}; // website-only / no RTMP legs: relay still serves WHEP+HLS natively.
  // Replace any stale config: add, and if it already exists, patch.
  const add = await api('POST', `${ep.apiBase}/v3/config/paths/add/${encodeURIComponent(ep.path)}`, config);
  if (add.ok) return;
  const patch = await api('PATCH', `${ep.apiBase}/v3/config/paths/patch/${encodeURIComponent(ep.path)}`, config);
  if (!patch.ok) {
    const detail = await patch.text().catch(() => '');
    throw new Error(`Relay fan-out config failed: ${patch.status}${detail ? ` — ${detail.slice(0, 160)}` : ''}`);
  }
}

/** Remove the path's fan-out config on stop so no relay process lingers. */
export async function clearFanout(ep: RelayEndpoints): Promise<void> {
  try { await api('DELETE', `${ep.apiBase}/v3/config/paths/delete/${encodeURIComponent(ep.path)}`); }
  catch { /* relay may already be gone */ }
}
