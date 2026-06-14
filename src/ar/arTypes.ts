// Broadcast AR model (Zero Density / Reality-Engine style).
//
// AR elements are real 3D objects anchored in the studio WORLD space (not the
// camera). Because the active camera is driven by FreeD tracking, an AR element
// stays locked to its spot in the real set as the camera moves — and because the
// studio scene renders into the Program output, an "on-air" AR element is
// composited into the live broadcast. No headset is involved; this is on-air AR.

export type ArElementKind = 'card' | 'box' | 'sphere' | 'cylinder' | 'text';

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
  };
}
