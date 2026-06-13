/**
 * Source model for the CHASE PRO switcher.
 *
 * Designed to grow into the inputs the broadcast pipeline will need later
 * (screen capture, media files, images, NDI, MediaMTX streams) without
 * reshaping this contract. Phase 2 implements the `webcam` type only; the other
 * `SourceType` values are declared so the UI/state can branch on them, but
 * creating them is intentionally not wired yet.
 */
export type SourceType = 'webcam' | 'screen' | 'media' | 'image' | 'ndi' | 'mediamtx';

export type SourceStatus = 'idle' | 'connecting' | 'live' | 'error';

/**
 * How a live source is composited into the Program scene. The live source is
 * always a separate, controllable object — never blended into the set
 * background.
 *  - `mediaPlane`     — a free-floating 3D video plane in the Babylon scene (implemented).
 *  - `screenInsert`   — mapped onto a screen/monitor mesh inside the set (planned).
 *  - `presenterPlate` — keyed presenter/foreground layer (planned).
 *  - `backgroundPlate`— full background video; disabled by default, opt-in only (planned).
 */
export type PlacementMode = 'mediaPlane' | 'screenInsert' | 'presenterPlate' | 'backgroundPlate';

export type KeyingMode = 'disabled' | 'chromaKey' | 'alpha';

export interface KeyingSettings {
  mode: KeyingMode;
  keyColor: string;
  similarity: number;
  smoothness: number;
  /** Spill suppression amount (0 = none, 1 = full key-channel desaturation). */
  spill: number;
  /** Edge matte denoise (0 = off / single sample; >0 blends neighbour taps). */
  denoise: number;
  /** Matte black point — raises the floor to kill grey haze in keyed areas. */
  blackClip: number;
  /** Matte white point — firms the solid core of the subject. */
  whiteClip: number;
  /** Light-wrap amount — bleeds the rendered backdrop into subject edges (0 = off). */
  lightWrap: number;
  opacity: number;
  /** When true the shader renders the alpha matte (grayscale) for calibration. */
  showMatte: boolean;
}

export const DEFAULT_KEYING_SETTINGS: KeyingSettings = {
  mode: 'disabled',
  keyColor: '#00ff00',
  similarity: 0.32,
  smoothness: 0.08,
  spill: 0.5,
  denoise: 0,
  blackClip: 0,
  whiteClip: 1,
  lightWrap: 0,
  opacity: 1,
  showMatte: false,
};

/** Placement modes actually wired in this phase. */
export const IMPLEMENTED_PLACEMENT_MODES: readonly PlacementMode[] = ['mediaPlane', 'screenInsert', 'presenterPlate'];

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  status: SourceStatus;
  createdAt: number;
  /** Live media for capture-based sources (webcam/screen). Null until acquired. */
  stream: MediaStream | null;
  /** Human-readable reason when status === 'error'. */
  error: string | null;
  /** How this source is placed when it is the Program output. */
  placement: PlacementMode;
  /** Screen mesh chaseId used when placement === screenInsert. */
  screenTargetId?: string;
  /** Real shader parameters used when placement === presenterPlate. */
  keying?: KeyingSettings;
  /** Set on restored live inputs because MediaStream objects are intentionally not serialized. */
  needsReconnect?: boolean;
}

/** Which switcher bus a source is currently assigned to (derived, not stored per-source). */
export type SourceRole = 'preview' | 'program' | 'both' | null;

/** The set of source types that Phase 2 can actually create. */
export const IMPLEMENTED_SOURCE_TYPES: readonly SourceType[] = ['webcam'];

/** Maps a raw getUserMedia failure to a clear, user-facing message. */
export function describeMediaError(err: unknown): string {
  if (typeof DOMException !== 'undefined' && err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return 'Camera permission denied. Allow camera access and try again.';
      case 'NotFoundError':
      case 'OverconstrainedError':
        return 'No camera found on this device.';
      case 'NotReadableError':
        return 'Camera is in use by another application.';
      default:
        return err.message || `Camera error: ${err.name}`;
    }
  }
  return err instanceof Error ? err.message : 'Unknown camera error.';
}
