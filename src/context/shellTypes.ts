import type { TransformMode } from '@/engine/sceneRegistry';

export type { TransformMode };

export type ModuleId =
  | 'builder'
  | 'scenes'
  | 'assets'
  | 'graphics'
  | 'overlays'
  | 'lighting'
  | 'cameras'
  | 'audio'
  | 'scripts'
  | 'outputs'
  | 'settings';

export type InspectorSubTab =
  | 'layout'
  | 'camera'
  | 'light'
  | 'presenter'
  | 'keying'
  | 'materials';

export type QualityMode = 'low' | 'balanced' | 'high';

export type AssetTab = 'sets' | 'elements' | 'assets';

export interface SystemMetrics {
  cpu: number;
  gpu: number;
  ram: number;
  memoryUsed: number;
  memoryTotal: number;
  diskUsed: number;
  diskTotal: number;
  resolution: string;
  fps: number;
}

export interface CameraShot {
  id: string;
  label: string;
  shortLabel: string;
}

export interface TimelineLayer {
  id: string;
  name: string;
  color: string;
  keyframes: number[];
}

export interface StudioPack {
  id: string;
  name: string;
  category: string;
  accent: string;
}

export interface SceneObject {
  id: string;
  name: string;
  icon: string;
}

export interface LightingPreset {
  id: string;
  name: string;
  color: string;
}

export interface StreamDestination {
  id: string;
  name: string;
  platform: string;
  isLive: boolean;
  resolution: string;
  bitrate: string;
}

export interface AudioChannel {
  id: string;
  label: string;
  level: number;
  muted: boolean;
  solo: boolean;
}

export interface DeskProperties {
  deskModel: string;
  deskColor: string;
  deskGlow: boolean;
  deskScreen: boolean;
  deskScreenText: string;
  envRotation: number;
  floorReflection: number;
  focalLength: number;
  depthOfField: number;
  parallax: number;
  skinSmoothing: number;
  eyeBrightness: number;
  teethWhitening: number;
}

export interface ShellState {
  activeModule: ModuleId;
  projectName: string;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  timelineCollapsed: boolean;
  compactMode: boolean;
  reducedMotion: boolean;
  qualityMode: QualityMode;
  activeCameraId: string;
  selectedLayerId: string;
  selectedObjectId: string;
  inspectorTab: 'inspector' | 'layers';
  inspectorSubTab: InspectorSubTab;
  assetTab: AssetTab;
  categoryFilter: string;
  assetSearch: string;
  isRecording: boolean;
  isLive: boolean;
  showSafeArea: boolean;
  viewportMode: '3d' | '2d';
  performanceWarning: boolean;
  performanceWarningDismissed: boolean;
  transitionType: string;
  transitionDuration: number;
  timecode: string;
  isPlaying: boolean;
  timelineZoom: number;
  desk: DeskProperties;
  toast: string | null;
  undoStack: number;
  redoStack: number;
  autosaveMinutes: number;
  backupEnabled: boolean;
  metrics: SystemMetrics;
  engineReady: boolean;
  transformMode: TransformMode;
}

export type ShellAction =
  | { type: 'SET_MODULE'; module: ModuleId }
  | { type: 'TOGGLE_LEFT_PANEL' }
  | { type: 'TOGGLE_RIGHT_PANEL' }
  | { type: 'TOGGLE_TIMELINE' }
  | { type: 'TOGGLE_COMPACT' }
  | { type: 'TOGGLE_REDUCED_MOTION' }
  | { type: 'SET_QUALITY'; mode: QualityMode }
  | { type: 'SET_CAMERA'; id: string }
  | { type: 'SET_LAYER'; id: string }
  | { type: 'SET_OBJECT'; id: string }
  | { type: 'SET_INSPECTOR_TAB'; tab: 'inspector' | 'layers' }
  | { type: 'SET_INSPECTOR_SUB_TAB'; tab: InspectorSubTab }
  | { type: 'SET_ASSET_TAB'; tab: AssetTab }
  | { type: 'SET_CATEGORY'; category: string }
  | { type: 'SET_ASSET_SEARCH'; value: string }
  | { type: 'TOGGLE_REC' }
  | { type: 'TOGGLE_LIVE' }
  | { type: 'TOGGLE_SAFE_AREA' }
  | { type: 'SET_VIEWPORT_MODE'; mode: '3d' | '2d' }
  | { type: 'DISMISS_PERFORMANCE_WARNING' }
  | { type: 'SET_TRANSITION'; transition: string }
  | { type: 'SET_TRANSITION_DURATION'; duration: number }
  | { type: 'TOGGLE_PLAYBACK' }
  | { type: 'SET_TIMELINE_ZOOM'; zoom: number }
  | { type: 'UPDATE_DESK'; patch: Partial<DeskProperties> }
  | { type: 'SHOW_TOAST'; message: string }
  | { type: 'CLEAR_TOAST' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'FILE_ACTION'; action: string }
  | { type: 'TOGGLE_BACKUP' }
  | { type: 'SET_ENGINE_READY'; ready: boolean }
  | { type: 'SET_TRANSFORM_MODE'; mode: TransformMode }
  | { type: 'UPDATE_ENGINE_FPS'; fps: number };
