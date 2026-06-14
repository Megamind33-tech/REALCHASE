// Adapter boundary types for the render-engine integration. The CHASE UI talks
// to 3D assets through these neutral shapes; nothing here imports Babylon, so the
// underlying engine can change without touching the product UI.

export type AssetFormat = 'glb' | 'gltf';

/** Position, Euler rotation (radians) and scaling — engine-neutral. */
export interface AssetTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scaling: [number, number, number];
}

/** Live descriptor of an asset that has been imported into the stage. */
export interface ImportedAsset {
  id: string;
  name: string;
  format: AssetFormat;
  fileBytes: number;
  meshCount: number;
  vertexCount: number;
  transform: AssetTransform;
  /** True when the asset exceeds a soft performance budget. */
  heavy: boolean;
  heavyReason?: string;
  /** Whether the geometry will be embedded in the project (vs referenced). */
  embedded: boolean;
  /** Operator opted this asset into external-reference mode. */
  referenceMode: boolean;
  /** Path/URL used to resolve an external (non-embedded) asset on reload. */
  referencePath: string;
  /** The external file could not be found on reload — kept as a stub. */
  missing: boolean;
  /** Group this asset belongs to, or null when ungrouped. */
  groupId: string | null;
}

/** A named group of imported assets (a transformable parent). */
export interface AssetGroup {
  id: string;
  name: string;
  transform: AssetTransform;
  childIds: string[];
}

/** Asset as written into / read from a CHASE project file. */
export interface SerializedAsset {
  id: string;
  name: string;
  format: AssetFormat;
  fileBytes: number;
  meshCount: number;
  vertexCount: number;
  transform: AssetTransform;
  /** Base64 of the original GLB bytes when embedded, else null. */
  data: string | null;
  /** Whether the geometry is embedded (small enough) or referenced/missing. */
  embedded: boolean;
  referenceMode: boolean;
  referencePath: string;
  missing: boolean;
  groupId: string | null;
}

export interface SerializedGroup {
  id: string;
  name: string;
  transform: AssetTransform;
  childIds: string[];
}

/** The full imported-scene layer of a project file. */
export interface SceneSnapshot {
  assets: SerializedAsset[];
  groups: SerializedGroup[];
}

/**
 * Resolves the bytes of an external (referenced) asset on reload. Returns null
 * when the file can't be found, so the engine can show an honest missing state.
 * In the desktop app this reads the filesystem; in the browser it fetches a URL.
 */
export type ExternalResolver = (referencePath: string) => Promise<Uint8Array | null>;

export type AssetFailureKind = 'unsupported' | 'empty' | 'too-large' | 'corrupt';

/** Typed failure so the UI can show a precise, honest reason. */
export class AssetImportError extends Error {
  kind: AssetFailureKind;
  constructor(kind: AssetFailureKind, message: string) {
    super(message);
    this.name = 'AssetImportError';
    this.kind = kind;
  }
}
