// Broadcast AR model (Zero Density / Reality-Engine style).
//
// AR elements are real 3D objects anchored in the studio WORLD space (not the
// camera). Because the active camera is driven by FreeD tracking, an AR element
// stays locked to its spot in the real set as the camera moves — and because the
// studio scene renders into the Program output, an "on-air" AR element is
// composited into the live broadcast. No headset is involved; this is on-air AR.

export type ArElementKind = 'card' | 'box' | 'sphere' | 'cylinder' | 'text';

/** Data template for 'card' elements. 'clock' is live (engine redraws it). */
export type ArTemplate = 'plain' | 'stat' | 'scorebug' | 'clock';

export interface ArElement {
  id: string;
  kind: ArElementKind;
  label: string;
  color: string; // hex
  position: [number, number, number];
  rotation: [number, number, number]; // Euler radians
  scaling: [number, number, number];
  /** When true the element is enabled in the scene → visible in Program output. */
  onAir: boolean;
  /** Ground the element so its base sits on the studio floor (y = 0), with a
   *  contact ring. Keeps it planted as the tracked camera moves. */
  anchorToFloor?: boolean;
  /** Card data template (ignored for primitive kinds). */
  template?: ArTemplate;
  /** Data fields bound into the template (stat value, team names/scores, …). */
  fields?: Record<string, string>;
  /** Billboard card/text so it always faces the active (tracked) camera. */
  faceCamera?: boolean;
  /** Live data binding (cards): an https:// endpoint returning a JSON object.
   *  Its top-level keys are mapped into `fields` on every poll. */
  dataUrl?: string;
  /** Poll interval in seconds for `dataUrl` (clamped to 2–60s). */
  dataIntervalSec?: number;
}

/** Min/max bounds for the live-data poll interval, in seconds. */
export const AR_DATA_MIN_INTERVAL = 2;
export const AR_DATA_MAX_INTERVAL = 60;

/** Coerce an arbitrary value into the configured live-poll interval (seconds). */
export function clampDataInterval(n: number | undefined): number {
  if (n == null || !Number.isFinite(n)) return 5;
  return Math.min(AR_DATA_MAX_INTERVAL, Math.max(AR_DATA_MIN_INTERVAL, Math.round(n)));
}

/** Flatten a parsed JSON value into a flat string field map for a card.
 *  Object → top-level keys stringified; primitives → a single `value` field.
 *  Nested objects/arrays are JSON-stringified so they remain inspectable. */
export function jsonToFields(data: unknown): Record<string, string> {
  if (data == null) return {};
  if (typeof data !== 'object') return { value: String(data) };
  if (Array.isArray(data)) {
    const out: Record<string, string> = {};
    data.slice(0, 12).forEach((v, i) => {
      out[String(i)] = typeof v === 'object' && v != null ? JSON.stringify(v) : String(v);
    });
    return out;
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (v == null) out[k] = '';
    else if (typeof v === 'object') out[k] = JSON.stringify(v);
    else out[k] = String(v);
  }
  return out;
}

/** Parse a pasted blob — either a JSON object or `key=value` lines — into a
 *  flat field map. Throws an Error with an honest message on bad input. */
export function parsePastedFields(raw: string): Record<string, string> {
  const text = raw.trim();
  if (!text) throw new Error('Nothing to parse — paste JSON or key=value lines.');
  // Try JSON first (object or array).
  if (text.startsWith('{') || text.startsWith('[')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error(`Invalid JSON: ${err instanceof Error ? err.message : 'parse error'}`);
    }
    const fields = jsonToFields(parsed);
    if (Object.keys(fields).length === 0) throw new Error('Parsed JSON has no usable keys.');
    return fields;
  }
  // Otherwise treat as key=value lines.
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) throw new Error(`Line "${trimmed}" is not "key=value".`);
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  if (Object.keys(out).length === 0) throw new Error('No key=value pairs found.');
  return out;
}

export function makeArId(): string {
  return `ar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function arKindLabel(kind: ArElementKind): string {
  switch (kind) {
    case 'card': return 'Data Card';
    case 'box': return 'Box';
    case 'sphere': return 'Sphere';
    case 'cylinder': return 'Cylinder';
    case 'text': return '3D Text';
  }
}

export function arTemplateLabel(t: ArTemplate): string {
  switch (t) {
    case 'plain': return 'Plain';
    case 'stat': return 'Stat';
    case 'scorebug': return 'Score Bug';
    case 'clock': return 'Live Clock';
  }
}

/** Default data fields for each card template. */
export function defaultFields(t: ArTemplate): Record<string, string> {
  switch (t) {
    case 'stat': return { value: '72%', caption: 'Approval' };
    case 'scorebug': return { home: 'HOME', homeScore: '0', away: 'AWAY', awayScore: '0' };
    case 'clock': return {};
    case 'plain': return {};
  }
}

export function defaultArElement(kind: ArElementKind): ArElement {
  return {
    id: makeArId(),
    kind,
    label: kind === 'text' ? 'LIVE' : kind === 'card' ? 'AR Data' : arKindLabel(kind),
    color: '#1a73e8',
    // A spot beside the desk, at eye height, where the main camera frames it.
    position: [1.8, 1.4, 1.5],
    rotation: [0, 0, 0],
    scaling: [1, 1, 1],
    onAir: false,
    anchorToFloor: false,
    template: kind === 'card' ? 'plain' : undefined,
    fields: kind === 'card' ? {} : undefined,
  };
}

