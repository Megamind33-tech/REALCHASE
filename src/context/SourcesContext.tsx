import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useEffect,
  useState,
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
  // Recording (real MediaRecorder → downloadable .webm of the Program output).
  capturing: boolean;
  canRecord: boolean;
  recordLabel: string;
  toggleCapture: () => void;
}

function pickRecorderMime(): string {
  const MR = typeof MediaRecorder !== 'undefined' ? MediaRecorder : undefined;
  const want = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const m of want) if (MR && MR.isTypeSupported(m)) return m;
  return 'video/webm';
}

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
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
  const { engine, captureOutputStream } = useEditorBridge();

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

  // --- Real recording: MediaRecorder on the Program output -> downloadable .webm ---
  const [recording, setRecording] = useState(false);
  const [recElapsed, setRecElapsed] = useState(0);
  const recRef = useRef<{ rec: MediaRecorder; chunks: Blob[]; started: number; timer: number; canvasStream: MediaStream | null } | null>(null);
  const canRecord = Boolean(programSource?.stream) && typeof MediaRecorder !== 'undefined';

  const stopRecording = useCallback(() => {
    const r = recRef.current;
    if (!r) return;
    clearInterval(r.timer);
    try { if (r.rec.state !== 'inactive') r.rec.stop(); } catch { /* already stopped */ }
  }, []);

  const startRecording = useCallback(() => {
    const program = sourcesRef.current.find((s) => s.id === state.programId);
    if (!program?.stream || typeof MediaRecorder === 'undefined') return;
    // Prefer the composited studio output (canvas); fall back to the raw Program
    // video track if the canvas isn't capturable.
    const canvasStream = captureOutputStream(30);
    const videoTracks = canvasStream?.getVideoTracks().length ? canvasStream.getVideoTracks() : program.stream.getVideoTracks();
    const mixed = new MediaStream([...videoTracks, ...program.stream.getAudioTracks()]);
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(mixed, { mimeType: pickRecorderMime() });
    } catch {
      return;
    }
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chase-program-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      canvasStream?.getTracks().forEach((t) => t.stop());
      recRef.current = null;
      setRecording(false);
      setRecElapsed(0);
    };
    const started = Date.now();
    const timer = window.setInterval(() => setRecElapsed(Date.now() - started), 500);
    recRef.current = { rec, chunks, started, timer, canvasStream };
    rec.start(1000); // 1s timeslice
    setRecording(true);
    setRecElapsed(0);
  }, [captureOutputStream, state.programId]);

  const toggleRecording = useCallback(() => {
    if (recording) stopRecording(); else startRecording();
  }, [recording, startRecording, stopRecording]);

  // Stop recording + timer on unmount (no zombie recorder/interval).
  useEffect(() => () => { stopRecording(); }, [stopRecording]);

  const recordLabel = recording ? `● REC ${fmtTime(recElapsed)}` : 'REC';

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
    capturing: recording,
    canRecord,
    recordLabel,
    toggleCapture: toggleRecording,
  };

  return <SourcesContext.Provider value={value}>{children}</SourcesContext.Provider>;
}

export function useSources() {
  const ctx = useContext(SourcesContext);
  if (!ctx) throw new Error('useSources must be used within SourcesProvider');
  return ctx;
}
