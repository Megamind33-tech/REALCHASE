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

