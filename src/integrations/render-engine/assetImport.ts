// Pure asset rules for the render-engine adapter: validation, performance
// heuristics, and (de)serialization. No Babylon, no DOM-engine coupling — this
// is the policy layer the UI and the engine both rely on.

import { AssetImportError, type AssetFormat, type AssetTransform } from './types';

export const SUPPORTED_EXTENSIONS = ['.glb', '.gltf'] as const;

/** Hard reject above this — refuse rather than freeze the studio. */
export const MAX_ASSET_BYTES = 80 * 1024 * 1024;
/** Soft warning thresholds (still imports, but flags a heavy asset). */
export const HEAVY_ASSET_BYTES = 12 * 1024 * 1024;
export const HEAVY_VERTEX_COUNT = 350_000;
/** Embed geometry into the project file only below this (keeps projects sane). */
export const EMBED_LIMIT_BYTES = 8 * 1024 * 1024;

export const IDENTITY_TRANSFORM: AssetTransform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scaling: [1, 1, 1],
};

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function assetFormat(name: string): AssetFormat | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.glb')) return 'glb';
  if (lower.endsWith('.gltf')) return 'gltf';
  return null;
}

/** Throw a precise AssetImportError if the file can't be accepted at all. */
export function validateAssetFile(file: { name: string; size: number }): AssetFormat {
  const format = assetFormat(file.name);
  if (!format) {
    throw new AssetImportError('unsupported', `Unsupported file "${file.name}". Import a .glb or .gltf model.`);
  }
  if (file.size === 0) {
    throw new AssetImportError('empty', `"${file.name}" is empty (0 bytes).`);
  }
  if (file.size > MAX_ASSET_BYTES) {
    throw new AssetImportError('too-large', `"${file.name}" is ${formatBytes(file.size)} — over the ${formatBytes(MAX_ASSET_BYTES)} import limit.`);
  }
  return format;
}

/** GLB binary container starts with the ASCII magic "glTF". */
export function isGlbMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46;
}

/** Cheap corrupt check before handing bytes to the engine. */
export function assertNotCorrupt(format: AssetFormat, bytes: Uint8Array): void {
  if (bytes.length < 12) {
    throw new AssetImportError('corrupt', 'File is too small to be a valid model.');
  }
  if (format === 'glb' && !isGlbMagic(bytes)) {
    throw new AssetImportError('corrupt', 'Not a valid GLB (missing glTF binary header).');
  }
  if (format === 'gltf') {
    try {
      JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new AssetImportError('corrupt', 'glTF JSON could not be parsed.');
    }
  }
}

export function assessHeaviness(input: { fileBytes: number; vertexCount: number }): { heavy: boolean; reason?: string } {
  const reasons: string[] = [];
  if (input.fileBytes >= HEAVY_ASSET_BYTES) reasons.push(`${formatBytes(input.fileBytes)} file`);
  if (input.vertexCount >= HEAVY_VERTEX_COUNT) reasons.push(`${input.vertexCount.toLocaleString()} vertices`);
  return reasons.length ? { heavy: true, reason: reasons.join(', ') } : { heavy: false };
}

export function canEmbed(fileBytes: number): boolean {
  return fileBytes > 0 && fileBytes <= EMBED_LIMIT_BYTES;
}

// Chunked base64 so large buffers don't blow the call stack.
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}
