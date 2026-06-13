import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { ShellAction, ShellState } from './shellTypes';
import { initialDesk, initialMetrics } from '@/data/mock/studioData';
import { LAYER_TO_OBJECT } from '@/engine/sceneRegistry';

const initialState: ShellState = {
  activeModule: 'builder',
  projectName: 'Apex Evening Broadcast',
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  timelineCollapsed: false,
  compactMode: false,
  reducedMotion: false,
  qualityMode: 'balanced',
  activeCameraId: 'cam1',
  selectedLayerId: 'desk',
  selectedObjectId: 'desk',
  inspectorTab: 'inspector',
  inspectorSubTab: 'layout',
  assetTab: 'sets',
  categoryFilter: 'ALL',
  assetSearch: '',
  isRecording: false,
  isLive: false,
  showSafeArea: false,
  viewportMode: '3d',
  performanceWarning: false,
  performanceWarningDismissed: false,
  transitionType: 'Fade',
  transitionDuration: 0.8,
  timecode: '00:10:12:00',
  isPlaying: false,
  timelineZoom: 100,
  desk: initialDesk,
  toast: null,
  undoStack: 2,
  redoStack: 0,
  autosaveMinutes: 2,
  backupEnabled: true,
  metrics: initialMetrics,
  engineReady: false,
  transformMode: 'select',
};

function shellReducer(state: ShellState, action: ShellAction): ShellState {
  switch (action.type) {
    case 'SET_MODULE':
      return { ...state, activeModule: action.module };
    case 'TOGGLE_LEFT_PANEL':
      return { ...state, leftPanelCollapsed: !state.leftPanelCollapsed };
    case 'TOGGLE_RIGHT_PANEL':
      return { ...state, rightPanelCollapsed: !state.rightPanelCollapsed };
    case 'TOGGLE_TIMELINE':
      return { ...state, timelineCollapsed: !state.timelineCollapsed };
    case 'TOGGLE_COMPACT':
      return { ...state, compactMode: !state.compactMode };
    case 'TOGGLE_REDUCED_MOTION':
      return { ...state, reducedMotion: !state.reducedMotion };
    case 'SET_QUALITY':
      return {
        ...state,
        qualityMode: action.mode,
        performanceWarningDismissed: action.mode === 'low' ? true : state.performanceWarningDismissed,
      };
    case 'SET_CAMERA':
      return { ...state, activeCameraId: action.id };
    case 'SET_LAYER':
      return {
        ...state,
        selectedLayerId: action.id,
        selectedObjectId: LAYER_TO_OBJECT[action.id] ?? action.id,
      };
    case 'SET_OBJECT': {
      const layerEntry = Object.entries(LAYER_TO_OBJECT).find(([, objId]) => objId === action.id);
      return {
        ...state,
        selectedObjectId: action.id,
        selectedLayerId: layerEntry?.[0] ?? state.selectedLayerId,
      };
    }
    case 'SET_INSPECTOR_TAB':
      return { ...state, inspectorTab: action.tab };
    case 'SET_INSPECTOR_SUB_TAB':
      return { ...state, inspectorSubTab: action.tab };
    case 'SET_ASSET_TAB':
      return { ...state, assetTab: action.tab };
    case 'SET_CATEGORY':
      return { ...state, categoryFilter: action.category };
    case 'SET_ASSET_SEARCH':
      return { ...state, assetSearch: action.value };
    case 'TOGGLE_REC':
      return { ...state, isRecording: !state.isRecording, toast: !state.isRecording ? 'Recording started' : 'Recording stopped' };
    case 'TOGGLE_LIVE':
      return { ...state, isLive: !state.isLive, toast: !state.isLive ? 'Output armed — confirm destinations' : 'Live output stopped' };
    case 'TOGGLE_SAFE_AREA':
      return { ...state, showSafeArea: !state.showSafeArea };
    case 'SET_VIEWPORT_MODE':
      return { ...state, viewportMode: action.mode };
    case 'DISMISS_PERFORMANCE_WARNING':
      return { ...state, performanceWarningDismissed: true };
    case 'SET_TRANSITION':
      return { ...state, transitionType: action.transition };
    case 'SET_TRANSITION_DURATION':
      return { ...state, transitionDuration: action.duration };
    case 'TOGGLE_PLAYBACK':
      return { ...state, isPlaying: !state.isPlaying };
    case 'SET_TIMELINE_ZOOM':
      return { ...state, timelineZoom: action.zoom };
    case 'UPDATE_DESK':
      return { ...state, desk: { ...state.desk, ...action.patch }, undoStack: state.undoStack + 1, redoStack: 0 };
    case 'SHOW_TOAST':
      return { ...state, toast: action.message };
    case 'CLEAR_TOAST':
      return { ...state, toast: null };
    case 'UNDO':
      if (state.undoStack <= 0) return state;
      return { ...state, undoStack: state.undoStack - 1, redoStack: state.redoStack + 1, toast: 'Undo' };
    case 'REDO':
      if (state.redoStack <= 0) return state;
      return { ...state, undoStack: state.undoStack + 1, redoStack: state.redoStack - 1, toast: 'Redo' };
    case 'FILE_ACTION':
      return { ...state, toast: `${action.action} — project service not connected` };
    case 'TOGGLE_BACKUP':
      return { ...state, backupEnabled: !state.backupEnabled, toast: state.backupEnabled ? 'Backup disabled' : 'Backup enabled' };
    case 'TICK_METRICS': {
      const cpu = 15 + Math.round(Math.random() * 75);
      const gpu = 20 + Math.round(Math.random() * 75);
      const warn = (cpu > 85 || gpu > 90) && !state.performanceWarningDismissed;
      return {
        ...state,
        metrics: { ...state.metrics, cpu, gpu, ram: 40 + Math.round(Math.random() * 20) },
        performanceWarning: warn,
      };
    }
    case 'SET_ENGINE_READY':
      return { ...state, engineReady: action.ready };
    case 'SET_TRANSFORM_MODE':
      return { ...state, transformMode: action.mode };
    case 'UPDATE_ENGINE_FPS':
      return { ...state, metrics: { ...state.metrics, fps: action.fps } };
    default:
      return state;
  }
}

const ShellContext = createContext<{ state: ShellState; dispatch: Dispatch<ShellAction> } | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(shellReducer, initialState);

  useEffect(() => {
    document.documentElement.classList.toggle('compact', state.compactMode);
    document.documentElement.classList.toggle('reduced-motion', state.reducedMotion);
    document.documentElement.dataset.quality = state.qualityMode;
  }, [state.compactMode, state.reducedMotion, state.qualityMode]);

  useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 2400);
    return () => clearTimeout(t);
  }, [state.toast]);

  useEffect(() => {
    const interval = setInterval(() => dispatch({ type: 'TICK_METRICS' }), 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ShellContext.Provider value={{ state, dispatch }}>
      {children}
      {state.toast && (
        <div className="toast-container">
          <div className="toast">{state.toast}</div>
        </div>
      )}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used within ShellProvider');
  return ctx;
}
