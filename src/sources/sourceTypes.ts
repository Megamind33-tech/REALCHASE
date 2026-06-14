export type SourceType = 'webcam' | 'video' | 'image' | 'screen';
export type KeyingMode = 'disabled' | 'chromaKey' | 'alpha';
export type SourcePlacement = 'mediaPlane' | 'screenInsert' | 'presenterPlate';

export interface KeyingSettings {
  mode: KeyingMode;
  keyColor: string; // hex color: #RRGGBB
  similarity: number; // 0–1
  smoothness: number; // 0–0.5
  spill: number; // 0–1
  denoise: number; // 0–1
  blackClip: number; // 0–0.5
  whiteClip: number; // 0.5–1
  lightWrap: number; // 0–1
  garbageLeft: number; // 0–0.5
  garbageRight: number; // 0.5–1
  garbageTop: number; // 0–0.5
  garbageBottom: number; // 0.5–1
  matchColor: string; // hex: #RRGGBB
  matchAmount: number; // 0–1
  matchExposure: number; // 0.3–2
  opacity: number; // 0–1
  showMatte: boolean;
}

export const DEFAULT_KEYING_SETTINGS: KeyingSettings = {
  mode: 'disabled',
  keyColor: '#00ff00',
  similarity: 0.4,
  smoothness: 0.1,
  spill: 0.1,
  denoise: 0.5,
  blackClip: 0.0,
  whiteClip: 1.0,
  lightWrap: 0.0,
  garbageLeft: 0.0,
  garbageRight: 1.0,
  garbageTop: 0.0,
  garbageBottom: 1.0,
  matchColor: '#ffffff',
  matchAmount: 0.0,
  matchExposure: 1.0,
  opacity: 1.0,
  showMatte: false,
};

export const IMPLEMENTED_PLACEMENT_MODES: SourcePlacement[] = [
  'mediaPlane',
  'screenInsert',
  'presenterPlate',
];

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  stream: MediaStream | null;
  status: 'connecting' | 'live' | 'error' | 'disconnected';
  error: string | null;
  placement: SourcePlacement;
  screenTargetId?: string; // for screenInsert mode
  keying?: KeyingSettings;
  needsReconnect: boolean;
  videoFile?: File; // for video sources
  imageFile?: File; // for image sources
}

export interface StreamDestination {
  id: string;
  name: string;
  platform: string; // 'youtube', 'twitch', 'custom-rtmp', 'website'
  enabled: boolean;
  normal: { enabled: boolean; url: string; key: string };
  satellite: { enabled: boolean; url: string; key: string };
}
