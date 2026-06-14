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
import { whipPublish, type WhipSession } from '@/output/whip';
import {
  deriveRelay, configureFanout, clearFanout, type RelayEndpoints,
} from '@/output/relay';
import {
  DEFAULT_DESTINATIONS, resolveTargets, websiteEnabled,
  type StreamDestination, type OutputLeg, type LegKind,
} from '@/output/destinations';
import {
  DEFAULT_KEYING_SETTINGS,
  describeDisplayMediaError,
  describeMediaError,
  type KeyingSettings,
  type PlacementMode,
  type Source,
  type SourceRole,
} from '@/sources/sourceTypes';
import { acquireImageFile, acquireVideoFile, type AcquiredSourceMedia } from '@/sources/mediaSources';

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
  addVideoFileSource: (file: File) => Promise<void>;
  addImageFileSource: (file: File) => Promise<void>;
  addScreenSource: () => Promise<void>;
  renameSource: (id: string, name: string) => void;
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
  // Output (real WebRTC/WHIP publish of the Program output to an ingest server).
  onAir: boolean;
  canStream: boolean;
  liveLabel: string;
  streamError: string | null;
  toggleAir: (url: string) => void;
  // Multi-destination fan-out (YouTube/Facebook/Twitch + public live website).
  destinations: StreamDestination[];
  updateDestination: (id: string, patch: Partial<StreamDestination>) => void;
  updateDestinationLeg: (id: string, kind: LegKind, patch: Partial<OutputLeg>) => void;
  armedTargetCount: number;
  liveWebsite: { whepUrl: string; hlsUrl: string } | null;
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
  const sourceMediaRef = useRef(new Map<string, AcquiredSourceMedia>());
  const cancelledSourceIdsRef = useRef(new Set<string>());

  const releaseSource = useCallback((id: string, fallbackStream: MediaStream | null = null) => {
    const media = sourceMediaRef.current.get(id);
    if (media) {
      media.dispose();
      sourceMediaRef.current.delete(id);
    } else {
      stopStream(fallbackStream);
    }
  }, []);

  const attachSourceMedia = useCallback((id: string, media: AcquiredSourceMedia, endedMessage: string) => {
    if (cancelledSourceIdsRef.current.delete(id)) {
      media.dispose();
      return;
    }
    const videoTrack = media.stream.getVideoTracks()[0];
    const onEnded = () => {
      dispatch({ type: 'PATCH', id, patch: { status: 'idle', stream: null, error: endedMessage } });
    };
    if (videoTrack) {
      videoTrack.addEventListener('ended', onEnded, { once: true });
    }
    const managedMedia: AcquiredSourceMedia = {
      stream: media.stream,
      dispose: () => {
        videoTrack?.removeEventListener('ended', onEnded);
        media.dispose();
      },
    };
    sourceMediaRef.current.set(id, managedMedia);
    dispatch({ type: 'PATCH', id, patch: { status: 'live', stream: managedMedia.stream, error: null, needsReconnect: false } });
    if (!state.previewId) dispatch({ type: 'SET_PREVIEW', id });
  }, [state.previewId]);

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
      sourcesRef.current.forEach((s) => releaseSource(s.id, s.stream));
    };
  }, [releaseSource]);

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
      attachSourceMedia(id, { stream, dispose: () => stopStream(stream) }, 'Camera disconnected.');
    } catch (err) {
      dispatch({ type: 'PATCH', id, patch: { status: 'error', error: describeMediaError(err) } });
    }
  }, [attachSourceMedia]);

  const addFileSource = useCallback(async (file: File, type: 'video' | 'image') => {
    const id = newId();
    const source: Source = {
      id,
      name: file.name.replace(/\.[^.]+$/, '') || (type === 'video' ? 'Video Source' : 'Image Source'),
      type,
      status: 'connecting',
      createdAt: Date.now(),
      stream: null,
      error: null,
      placement: 'mediaPlane',
      screenTargetId: 'led-main',
      keying: DEFAULT_KEYING_SETTINGS,
    };
    dispatch({ type: 'ADD', source });
    try {
      const media = type === 'video' ? await acquireVideoFile(file) : await acquireImageFile(file);
      attachSourceMedia(id, media, `${type === 'video' ? 'Video' : 'Image'} source stopped.`);
    } catch (err) {
      dispatch({ type: 'PATCH', id, patch: { status: 'error', error: err instanceof Error ? err.message : `Unable to load ${type} source.` } });
    }
  }, [attachSourceMedia]);

  const addVideoFileSource = useCallback((file: File) => addFileSource(file, 'video'), [addFileSource]);
  const addImageFileSource = useCallback((file: File) => addFileSource(file, 'image'), [addFileSource]);

  const addScreenSource = useCallback(async () => {
    const id = newId();
    const index = sourcesRef.current.filter((s) => s.type === 'screen').length + 1;
    const source: Source = {
      id,
      name: `Screen ${index}`,
      type: 'screen',
      status: 'connecting',
      createdAt: Date.now(),
      stream: null,
      error: null,
      placement: 'mediaPlane',
      screenTargetId: 'led-main',
      keying: DEFAULT_KEYING_SETTINGS,
    };
    dispatch({ type: 'ADD', source });
    if (!navigator.mediaDevices?.getDisplayMedia) {
      dispatch({ type: 'PATCH', id, patch: { status: 'error', error: 'Screen capture is not available in this environment.' } });
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'NotAllowedError') throw error;
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      }
      attachSourceMedia(id, { stream, dispose: () => stopStream(stream) }, 'Screen capture ended.');
    } catch (err) {
      dispatch({ type: 'PATCH', id, patch: { status: 'error', error: describeDisplayMediaError(err) } });
    }
  }, [attachSourceMedia]);

  const renameSource = useCallback((id: string, name: string) => {
    const next = name.trim();
    if (next) dispatch({ type: 'PATCH', id, patch: { name: next } });
  }, []);

  const removeSource = useCallback((id: string) => {
    const target = sourcesRef.current.find((s) => s.id === id);
    if (target?.status === 'connecting' && !sourceMediaRef.current.has(id)) cancelledSourceIdsRef.current.add(id);
    releaseSource(id, target?.stream ?? null);
    dispatch({ type: 'REMOVE', id });
  }, [releaseSource]);

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
    sourcesRef.current.forEach((s) => {
      if (s.status === 'connecting' && !sourceMediaRef.current.has(s.id)) cancelledSourceIdsRef.current.add(s.id);
      releaseSource(s.id, s.stream);
    });
    dispatch({ type: 'RESTORE', sources, previewId, programId });
  }, [releaseSource]);

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

  // --- Real output: WebRTC/WHIP publish of the Program output to an ingest server ---
  const [onAir, setOnAir] = useState(false);
  const [airElapsed, setAirElapsed] = useState(0);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [liveWebsite, setLiveWebsite] = useState<{ whepUrl: string; hlsUrl: string } | null>(null);
  const airRef = useRef<{ session: WhipSession; timer: number; canvasStream: MediaStream | null; ep: RelayEndpoints | null } | null>(null);
  const canStream = Boolean(programSource?.stream) && typeof RTCPeerConnection !== 'undefined';

  // Stream destinations (in-memory only — stream keys are secrets and are never
  // written to project files or logs).
  const [destinations, setDestinations] = useState<StreamDestination[]>(DEFAULT_DESTINATIONS);
  const destinationsRef = useRef(destinations);
  destinationsRef.current = destinations;
  const armedTargetCount = resolveTargets(destinations).length;

  const updateDestination = useCallback((id: string, patch: Partial<StreamDestination>) => {
    setDestinations((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }, []);

  const updateDestinationLeg = useCallback((id: string, kind: LegKind, patch: Partial<OutputLeg>) => {
    setDestinations((ds) => ds.map((d) => (d.id === id ? { ...d, [kind]: { ...d[kind], ...patch } } : d)));
  }, []);

  const stopAir = useCallback(async () => {
    const a = airRef.current;
    if (!a) return;
    airRef.current = null;
    clearInterval(a.timer);
    a.canvasStream?.getTracks().forEach((t) => t.stop());
    setOnAir(false);
    setAirElapsed(0);
    setLiveWebsite(null);
    try { await a.session.close(); } catch { /* server may already have reaped the session */ }
    if (a.ep) await clearFanout(a.ep); // tear the relay fan-out down so no ffmpeg lingers
  }, []);

  const startAir = useCallback(async (url: string) => {
    const program = sourcesRef.current.find((s) => s.id === state.programId);
    if (!program?.stream || typeof RTCPeerConnection === 'undefined') return;
    if (!url.trim()) { setStreamError('Enter a WHIP endpoint URL first.'); return; }
    setStreamError(null);
    // Publish the composited studio output (canvas) when available, else the raw
    // Program video track, plus the Program audio.
    const canvasStream = captureOutputStream(30);
    const videoTracks = canvasStream?.getVideoTracks().length ? canvasStream.getVideoTracks() : program.stream.getVideoTracks();
    const out = new MediaStream([...videoTracks, ...program.stream.getAudioTracks()]);

    // Arm the relay fan-out BEFORE publishing so MediaMTX's runOnReady fires the
    // moment the WHIP stream is ready. Website/WHEP playback works regardless; a
    // fan-out failure is surfaced but never blocks going to air.
    const ep = deriveRelay(url.trim());
    const targets = resolveTargets(destinationsRef.current);
    if (ep) {
      try {
        await configureFanout(ep, targets);
      } catch (err) {
        setStreamError(`Destinations not fully armed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    let session: WhipSession;
    try {
      session = await whipPublish(url.trim(), out);
    } catch (err) {
      canvasStream?.getTracks().forEach((t) => t.stop());
      if (ep) await clearFanout(ep);
      setStreamError(err instanceof Error ? err.message : String(err));
      return;
    }
    // If the negotiated transport drops, tear the publish down so the UI reflects
    // reality instead of a stale "on air".
    session.pc.addEventListener('connectionstatechange', () => {
      const st = session.pc.connectionState;
      if (st === 'failed' || st === 'disconnected' || st === 'closed') void stopAir();
    });
    const started = Date.now();
    const timer = window.setInterval(() => setAirElapsed(Date.now() - started), 500);
    airRef.current = { session, timer, canvasStream, ep };
    setOnAir(true);
    setAirElapsed(0);
    // Surface the public live-website URLs when its leg is switched on.
    if (ep && websiteEnabled(destinationsRef.current)) {
      setLiveWebsite({ whepUrl: ep.whepUrl, hlsUrl: ep.hlsUrl });
    }
  }, [captureOutputStream, state.programId, stopAir]);

  const toggleAir = useCallback((url: string) => {
    if (onAir) void stopAir(); else void startAir(url);
  }, [onAir, startAir, stopAir]);

  // Tear the publish down on unmount (no zombie PeerConnection / interval).
  useEffect(() => () => { void stopAir(); }, [stopAir]);

  const liveLabel = onAir ? `● ON AIR ${fmtTime(airElapsed)}` : 'GO LIVE';

  const value: SourcesValue = {
    sources: state.sources,
    previewId: state.previewId,
    programId: state.programId,
    previewSource,
    programSource,
    addWebcamSource,
    addVideoFileSource,
    addImageFileSource,
    addScreenSource,
    renameSource,
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
    onAir,
    canStream,
    liveLabel,
    streamError,
    toggleAir,
    destinations,
    updateDestination,
    updateDestinationLeg,
    armedTargetCount,
    liveWebsite,
  };

  return <SourcesContext.Provider value={value}>{children}</SourcesContext.Provider>;
}

export function useSources() {
  const ctx = useContext(SourcesContext);
  if (!ctx) throw new Error('useSources must be used within SourcesProvider');
  return ctx;
}
