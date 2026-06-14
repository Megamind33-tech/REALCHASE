// Real multi-destination model. A "station" (destination) carries up to two
// independent output legs, mirroring how a broadcast station actually reaches
// air: a SATELLITE uplink feed and a NORMAL (terrestrial / IP) output. Each leg
// is a real RTMP(S) ingest target; the relay fans the Program output out to
// every enabled leg of every enabled station via a single ffmpeg process.
//
// The public "live website" is a separate, always-available leg: whenever the
// studio is on air the Program is playable over WebRTC (WHEP) and HLS straight
// from the local relay — no RTMP push, no extra encode.

export type DestinationPlatform = 'youtube' | 'facebook' | 'twitch' | 'website' | 'custom';

export type LegKind = 'satellite' | 'normal';

export interface OutputLeg {
  /** RTMP(S) ingest base, e.g. rtmp://a.rtmp.youtube.com/live2 (no key). */
  url: string;
  /** Stream key / secret. Appended to the URL at publish time; never logged. */
  key: string;
  /** Whether this leg is pushed when the station goes on air. */
  enabled: boolean;
}

export interface StreamDestination {
  id: string;
  platform: DestinationPlatform;
  name: string;
  /** Master enable for the whole station. */
  enabled: boolean;
  /** Satellite uplink feed (primary/redundant high-reliability path). */
  satellite: OutputLeg;
  /** Normal output feed (standard terrestrial / web ingest). */
  normal: OutputLeg;
}

/** A single resolved push target handed to the relay. */
export interface ResolvedTarget {
  /** Human label, e.g. "YouTube · satellite". */
  label: string;
  /** Full RTMP(S) URL including the stream key. Treat as a secret. */
  url: string;
}

const emptyLeg = (url = ''): OutputLeg => ({ url, key: '', enabled: false });

/** Platform presets: real ingest endpoints. Satellite = redundant/backup leg. */
export function presetDestination(platform: DestinationPlatform): StreamDestination {
  const id = `dest-${platform}-${Math.random().toString(36).slice(2, 8)}`;
  switch (platform) {
    case 'youtube':
      return {
        id, platform, name: 'YouTube Live', enabled: false,
        satellite: emptyLeg('rtmp://b.rtmp.youtube.com/live2?backup=1'),
        normal: emptyLeg('rtmp://a.rtmp.youtube.com/live2'),
      };
    case 'facebook':
      return {
        id, platform, name: 'Facebook Live', enabled: false,
        satellite: emptyLeg('rtmps://live-api-s.facebook.com:443/rtmp'),
        normal: emptyLeg('rtmps://live-api-s.facebook.com:443/rtmp'),
      };
    case 'twitch':
      return {
        id, platform, name: 'Twitch', enabled: false,
        satellite: emptyLeg('rtmp://hkg.contribute.live-video.net/app'),
        normal: emptyLeg('rtmp://live.twitch.tv/app'),
      };
    case 'website':
      return {
        id, platform, name: 'Live Website', enabled: true,
        satellite: emptyLeg(), normal: emptyLeg(),
      };
    default:
      return {
        id, platform: 'custom', name: 'Custom RTMP', enabled: false,
        satellite: emptyLeg(), normal: emptyLeg(),
      };
  }
}

export const DEFAULT_DESTINATIONS: StreamDestination[] = [
  presetDestination('youtube'),
  presetDestination('facebook'),
  presetDestination('twitch'),
  presetDestination('website'),
];

/** Join an ingest base and a stream key into one RTMP URL. */
export function joinRtmp(url: string, key: string): string {
  const base = url.trim().replace(/\/+$/, '');
  const k = key.trim();
  if (!k) return base;
  // Facebook/YouTube want the key as the final path segment.
  return `${base}/${k}`;
}

function legReady(leg: OutputLeg): boolean {
  return leg.enabled && leg.url.trim().length > 0;
}

/** Flatten the enabled RTMP legs across all enabled stations into push targets. */
export function resolveTargets(destinations: StreamDestination[]): ResolvedTarget[] {
  const targets: ResolvedTarget[] = [];
  for (const d of destinations) {
    if (!d.enabled || d.platform === 'website') continue;
    if (legReady(d.satellite)) targets.push({ label: `${d.name} · satellite`, url: joinRtmp(d.satellite.url, d.satellite.key) });
    if (legReady(d.normal)) targets.push({ label: `${d.name} · normal`, url: joinRtmp(d.normal.url, d.normal.key) });
  }
  return targets;
}

/** Is the public live-website leg switched on? */
export function websiteEnabled(destinations: StreamDestination[]): boolean {
  return destinations.some((d) => d.platform === 'website' && d.enabled);
}

/** Short status word for a station, derived from its legs (no fake state). */
export function legSummary(d: StreamDestination): string {
  if (d.platform === 'website') return d.enabled ? 'WHEP + HLS' : 'off';
  const on: string[] = [];
  if (legReady(d.satellite)) on.push('satellite');
  if (legReady(d.normal)) on.push('normal');
  if (!d.enabled) return 'off';
  return on.length ? on.join(' + ') : 'no leg configured';
}
