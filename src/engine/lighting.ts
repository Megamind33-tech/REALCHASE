// Real studio lighting model. Controls the actual Babylon lights in the scene:
// a key DirectionalLight, the ambient HemisphericLight, and the accent point
// lights. Presets follow conventional broadcast looks. Pure Babylon (Apache-2.0)
// — google/filament is referenced only as a PBR look reference, no code used.

export interface LightChannel {
  intensity: number; // 0–3
  color: string; // hex #RRGGBB
}

export interface LightingSettings {
  key: LightChannel;
  ambient: LightChannel;
  accent: LightChannel;
}

export const DEFAULT_LIGHTING: LightingSettings = {
  key: { intensity: 1.0, color: '#fff4e6' },
  ambient: { intensity: 0.45, color: '#d9e0f2' },
  accent: { intensity: 0.8, color: '#b3bfff' },
};

export const LIGHTING_PRESETS: Record<string, LightingSettings> = {
  Broadcast: {
    key: { intensity: 1.1, color: '#fff4e6' },
    ambient: { intensity: 0.5, color: '#d9e0f2' },
    accent: { intensity: 0.85, color: '#b3bfff' },
  },
  Studio: {
    key: { intensity: 1.4, color: '#ffffff' },
    ambient: { intensity: 0.7, color: '#eef2ff' },
    accent: { intensity: 0.5, color: '#cdd6ff' },
  },
  Natural: {
    key: { intensity: 0.9, color: '#fff1d6' },
    ambient: { intensity: 0.6, color: '#cfe0ff' },
    accent: { intensity: 0.3, color: '#ffe9c2' },
  },
  Dramatic: {
    key: { intensity: 1.6, color: '#ffe8cc' },
    ambient: { intensity: 0.18, color: '#243049' },
    accent: { intensity: 1.1, color: '#6f86ff' },
  },
};

/** Hex (#RRGGBB) → linear-ish [r,g,b] 0–1 tuple for Babylon Color3. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** [r,g,b] 0–1 → #RRGGBB. */
export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
