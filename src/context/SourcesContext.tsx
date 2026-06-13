import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useEditorBridge } from './EditorBridgeContext';
import {
  DEFAULT_KEYING_SETTINGS,
  describeMediaError,
  type KeyingSettings,
  type PlacementMode,
  type Source,
  type SourceRole,
} from '@/sources/sourceTypes';

interface SourcesState {
  sources: Source[];
  previewId: string | null;
  programId: string | null;
}

type SourcesAction =
  | { type: 'ADD'; source: Source }
  | { type: 'PATCH'; id: string; patch: Partial<Source> }
  | { type: 'REMOVE'; id: string }
  | { type: 'SET_PREVIEW'; id: string | null }
  | { type: 'SET_PROGRAM'; id: string | null }
  | { type: 'RESTORE'; sources: Source[]; previewId: string | null; programId: string | null };

const initialState: SourcesState = { sources: [], previewId: null, programId: null };

function reducer(state: SourcesState, action: SourcesAction): SourcesState {
  switch (action.type) {
    case 'ADD':
      return { ...state, sources: [...state.sources, action.source] };
    case 'PATCH':
      return {
        ...state,
        sources: state.sources.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
      };
    case 'REMOVE':
      return {
        ...state,
        sources: state.sources.filter((s) => s.id !== action.id),
        previewId: state.previewId === action.id ? null : state.previewId,
        programId: state.programId === action.id ? null : state.programId,
      };
    case 'SET_PREVIEW':
      return { ...state, previewId: action.id };
    case 'SET_PROGRAM':
      return { ...state, programId: action.id };
    case 'RESTORE':
      return { sources: action.sources, previewId: action.previewId, programId: action.programId };
    default:
      return state;
  }
}

interface SourcesValue {
  sources: Source[];
  previewId: string | null;
  programId: string | null;
  previewSource: Source | null;
  programSource: Source | null;
  addWebcamSource: () => Promise<void>;
  removeSource: (id: string) => void;
  setPreview: (id: string | null) => void;
  cut: () => void;
  updateSourcePlacement: (id: string, placement: PlacementMode, screenTargetId?: string) => void;
  updateSourceKeying: (id: string, keying: KeyingSettings) => void;
  restoreProjectSources: (sources: Source[], previewId: string | null, programId: string | null) => void;
  roleOf: (id: string) => SourceRole;
}

const SourcesContext = createContext<SourcesValue | null>(null);

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `src-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export function SourcesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { engine } = useEditorBridge();

  // Always-current mirror so the unmount cleanup can stop every live track.
  const sourcesRef = useRef(state.sources);
  sourcesRef.current = state.sources;

  const programSource = state.sources.find((s) => s.id === state.programId) ?? null;
  const previewSource = state.sources.find((s) => s.id === state.previewId) ?? null;

  // Drive the Babylon Program output: whenever the Program source (or its
  // stream, or the engine instance) changes, push the live stream into the
  // studio viewport — or clear it when Program is empty.
  useEffect(() => {
    if (!engine) return;
    engine.setProgramStream(programSource?.stream ?? null, programSource?.placement ?? 'mediaPlane', programSource?.screenTargetId, programSource?.keying);
  }, [engine, programSource?.id, programSource?.stream, programSource?.placement, programSource?.screenTargetId, programSource?.keying]);

  // Stop all camera tracks when the app unmounts — no background cameras left on.
  useEffect(() => {
    return () => {
      sourcesRef.current.forEach((s) => stopStream(s.stream));
    };
  }, []);

  const addWebcamSource = useCallback(async () => {
    const id = newId();
    const index = sourcesRef.current.filter((s) => s.type === 'webcam').length + 1;
    const source: Source = {
      id,
      name: `Webcam ${index}`,
      type: 'webcam',
      status: 'connecting',
      createdAt: Date.now(),
      stream: null,
      error: null,
      placement: 'mediaPlane',
      screenTargetId: 'led-main',
      keying: DEFAULT_KEYING_SETTINGS,
    };
    dispatch({ type: 'ADD', source });

    if (!navigator.mediaDevices?.getUserMedia) {
      dispatch({
        type: 'PATCH',
        id,
        patch: { status: 'error', error: 'getUserMedia is not available in this environment.' },
      });
      return;
    }

    try {
      let stream: MediaStream;
      try {
        // Capture audio too so the mixer can show real levels.
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        // Device may have no microphone — fall back to video-only rather than fail.
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      dispatch({ type: 'PATCH', id, patch: { status: 'live', stream, error: null } });
      // Convenience: route the first live source to Preview if Preview is empty.
      dispatch({ type: 'SET_PREVIEW', id });
    } catch (err) {
      dispatch({ type: 'PATCH', id, patch: { status: 'error', error: describeMediaError(err) } });
    }
  }, []);

  const removeSource = useCallback((id: string) => {
    const target = sourcesRef.current.find((s) => s.id === id);
    stopStream(target?.stream ?? null);
    dispatch({ type: 'REMOVE', id });
  }, []);

  const setPreview = useCallback((id: string | null) => {
    dispatch({ type: 'SET_PREVIEW', id });
  }, []);

  const cut = useCallback(() => {
    // Real CUT: whatever is in Preview becomes Program.
    dispatch({ type: 'SET_PROGRAM', id: sourcesRef.current.length ? state.previewId : null });
  }, [state.previewId]);

  const updateSourcePlacement = useCallback((id: string, placement: PlacementMode, screenTargetId = 'led-main') => {
    dispatch({ type: 'PATCH', id, patch: { placement, screenTargetId } });
  }, []);

  const updateSourceKeying = useCallback((id: string, keying: KeyingSettings) => {
    dispatch({ type: 'PATCH', id, patch: { keying } });
  }, []);

  const restoreProjectSources = useCallback((sources: Source[], previewId: string | null, programId: string | null) => {
    sourcesRef.current.forEach((s) => stopStream(s.stream));
    dispatch({ type: 'RESTORE', sources, previewId, programId });
  }, []);

  const roleOf = useCallback(
    (id: string): SourceRole => {
      const isPreview = state.previewId === id;
      const isProgram = state.programId === id;
      if (isPreview && isProgram) return 'both';
      if (isProgram) return 'program';
      if (isPreview) return 'preview';
      return null;
    },
    [state.previewId, state.programId],
  );

  const value: SourcesValue = {
    sources: state.sources,
    previewId: state.previewId,
    programId: state.programId,
    previewSource,
    programSource,
    addWebcamSource,
    removeSource,
    setPreview,
    cut,
    updateSourcePlacement,
    updateSourceKeying,
    restoreProjectSources,
    roleOf,
  };

  return <SourcesContext.Provider value={value}>{children}</SourcesContext.Provider>;
}

export function useSources() {
  const ctx = useContext(SourcesContext);
  if (!ctx) throw new Error('useSources must be used within SourcesProvider');
  return ctx;
}
