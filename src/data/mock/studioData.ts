import type {
  CameraShot,
  LightingPreset,
  SceneObject,
  ShellState,
  StreamDestination,
  StudioPack,
  TimelineLayer,
  AudioChannel,
} from './shellTypes';

export const CAMERA_SHOTS: CameraShot[] = [
  { id: 'cam1', label: 'CAM 1 WIDE', shortLabel: 'WIDE' },
  { id: 'cam2', label: 'CAM 2 DESK', shortLabel: 'DESK' },
  { id: 'cam3', label: 'CAM 3 LEFT WALL', shortLabel: 'LEFT' },
  { id: 'cam4', label: 'CAM 4 RIGHT WALL', shortLabel: 'RIGHT' },
  { id: 'cam5', label: 'CAM 5 CEILING', shortLabel: 'CEIL' },
  { id: 'cam6', label: 'CAM 6 FLOOR RING', shortLabel: 'FLOOR' },
];

export const TIMELINE_LAYERS: TimelineLayer[] = [
  { id: 'presenter', name: 'Presenter', color: '#8b5cf6', keyframes: [12, 48, 96] },
  { id: 'desk', name: 'News Desk', color: '#3b82f6', keyframes: [24, 72] },
  { id: 'led-main', name: 'LED Wall Main', color: '#06b6d4', keyframes: [8, 40, 88] },
  { id: 'led-side', name: 'LED Wall Side', color: '#0891b2', keyframes: [16, 64] },
  { id: 'lights', name: 'Pillar Lights', color: '#eab308', keyframes: [32] },
  { id: 'floor', name: 'Floor Ring', color: '#22c55e', keyframes: [20, 56, 104] },
  { id: 'plant', name: 'Decor Plant', color: '#64748b', keyframes: [] },
];

export const STUDIO_PACKS: StudioPack[] = [
  { id: 'apex', name: 'Apex Newsroom', category: 'NEWS', accent: '#1e3a5f' },
  { id: 'horizon', name: 'Horizon Blue', category: 'NEWS', accent: '#1e40af' },
  { id: 'stadium', name: 'Stadium Pro', category: 'SPORTS', accent: '#166534' },
  { id: 'talkline', name: 'Talkline Set', category: 'TALKSHOW', accent: '#7c2d12' },
  { id: 'market', name: 'Market Desk', category: 'BUSINESS', accent: '#374151' },
  { id: 'prime', name: 'Prime Evening', category: 'NEWS', accent: '#581c87' },
];

export const SCENE_OBJECTS: SceneObject[] = [
  { id: 'desk', name: 'News Desk', icon: 'desk' },
  { id: 'screen', name: 'Vertical Screen', icon: 'monitor' },
  { id: 'pillar', name: 'Pillar Light', icon: 'lamp' },
  { id: 'ring', name: 'Floor Ring', icon: 'circle' },
  { id: 'plant', name: 'Decor Plant', icon: 'leaf' },
  { id: 'chair', name: 'Guest Chair', icon: 'armchair' },
];

export const LIGHTING_PRESETS: LightingPreset[] = [
  { id: 'cool', name: 'Cool Broadcast', color: '#60a5fa' },
  { id: 'warm', name: 'Warm Studio', color: '#fbbf24' },
  { id: 'dramatic', name: 'Dramatic Blue', color: '#3b82f6' },
  { id: 'soft', name: 'Soft Fill', color: '#e2e8f0' },
  { id: 'rim', name: 'Rim Key', color: '#a78bfa' },
  { id: 'night', name: 'Evening', color: '#6366f1' },
];

export const CATEGORIES = ['ALL', 'NEWS', 'SPORTS', 'TALKSHOW', 'BUSINESS'];

export const TRANSITIONS = ['Cut', 'Fade', 'Slide', 'Push', 'Zoom', 'Spin'];

export const STREAM_DESTINATIONS: StreamDestination[] = [
  { id: 'yt', name: 'YouTube Live', platform: 'YouTube', isLive: false, resolution: '1080p', bitrate: '6 Mbps' },
  { id: 'fb', name: 'Facebook Live', platform: 'Facebook', isLive: false, resolution: '1080p', bitrate: '4 Mbps' },
  { id: 'rtmp', name: 'Custom RTMP', platform: 'RTMP', isLive: false, resolution: '1080p', bitrate: '5 Mbps' },
];

export const AUDIO_CHANNELS: AudioChannel[] = [
  { id: 'pgm', label: 'PGM', level: 72, muted: false, solo: false },
  { id: 'mic1', label: 'MIC 1', level: 58, muted: false, solo: false },
  { id: 'mic2', label: 'MIC 2', level: 0, muted: true, solo: false },
  { id: 'music', label: 'MUSIC', level: 45, muted: false, solo: false },
  { id: 'sfx', label: 'SFX', level: 32, muted: false, solo: false },
];

export const initialMetrics: ShellState['metrics'] = {
  cpu: 18,
  gpu: 36,
  ram: 45,
  memoryUsed: 7.2,
  memoryTotal: 16,
  diskUsed: 240,
  diskTotal: 512,
  resolution: '1080p59.94',
  fps: 60,
};

export const initialDesk: ShellState['desk'] = {
  deskModel: 'Curved Broadcast',
  deskColor: '#1a1a2e',
  deskGlow: true,
  deskScreen: true,
  deskScreenText: 'CHASE NEWS',
  envRotation: 0,
  floorReflection: 42,
  focalLength: 35,
  depthOfField: 28,
  parallax: 15,
  skinSmoothing: 20,
  eyeBrightness: 35,
  teethWhitening: 10,
};
