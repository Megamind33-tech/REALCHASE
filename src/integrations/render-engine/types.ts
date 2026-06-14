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
}

/** Asset as written into / read from a CHASE project file. */
export interface SerializedAsset {
  id: string;
  name: string;
  format: AssetFormat;
  fileBytes: number;
  transform: AssetTransform;
  /** Base64 of the original GLB bytes when embedded, else null. */
  data: string | null;
  /** Whether the geometry is embedded (small enough) or needs re-import. */
  embedded: boolean;
}

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
