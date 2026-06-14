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
import { getRecordingCapabilities, type RecordingCapability, type RecordingFormat } from '@/output/recording';
import { AudioMixer, type ChannelParams } from '@/audio/audioMixer';

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
  recordingFormat: RecordingFormat;
  recordingCapabilities: RecordingCapability[];
  setRecordingFormat: (format: RecordingFormat) => void;
  recordingStats: { durationMs: number; bytes: number; bitrateKbps: number; mimeType: string | null };
  recordError: string | null;
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
  // Real audio mixer: per-source fader/mute/solo + master, mixed into the
  // program audio that is recorded and streamed.
  audioParams: (id: string) => ChannelParams;
  setChannelParams: (id: string, patch: Partial<ChannelParams>) => void;
  masterGain: number;
  setMasterGain: (gain: number) => void;
  getChannelLevel: (id: string) => number;
  getMasterLevel: () => number;
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

  // --- Real audio mixer: route every live source's audio through per-channel
  // GainNodes into a master bus whose stream feeds recording/streaming. ---
  const mixerRef = useRef<AudioMixer | null>(null);
  if (!mixerRef.current) mixerRef.current = new AudioMixer();
  const [masterGain, setMasterGainState] = useState(1);
  // Bump to force re-render of mixer UI when channel params change.
  const [, setMixTick] = useState(0);

  // Keep the mixer graph in sync with the current live sources.
  useEffect(() => {
    mixerRef.current?.sync(state.sources.map((s) => ({ id: s.id, stream: s.stream })));
  }, [state.sources]);

  useEffect(() => () => { mixerRef.current?.dispose(); mixerRef.current = null; }, []);

  const audioParams = useCallback((id: string) => mixerRef.current?.getParams(id) ?? { gain: 1, muted: false, solo: false }, []);
  const setChannelParams = useCallback((id: string, patch: Partial<ChannelParams>) => {
    mixerRef.current?.setParams(id, patch);
    setMixTick((n) => n + 1);
  }, []);
  const setMasterGain = useCallback((gain: number) => {
    mixerRef.current?.setMaster(gain);
    setMasterGainState(gain);
  }, []);
  const getChannelLevel = useCallback((id: string) => mixerRef.current?.level(id) ?? 0, []);
  const getMasterLevel = useCallback(() => mixerRef.current?.masterLevel() ?? 0, []);

  // The mixed master audio tracks (empty until the graph has live audio).
  const mixedAudioTracks = useCallback(() => mixerRef.current?.getMixedAudioTracks() ?? [], []);

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
  const [recBytes, setRecBytes] = useState(0);
  const [recMimeType, setRecMimeType] = useState<string | null>(null);
  const [recordingFormat, setRecordingFormatState] = useState<RecordingFormat>('webm');
  const [recordError, setRecordError] = useState<string | null>(null);
  const recordingCapabilities = getRecordingCapabilities();
  const selectedRecordingCapability = recordingCapabilities.find((capability) => capability.format === recordingFormat) ?? recordingCapabilities[0];
  const recRef = useRef<{ rec: MediaRecorder; chunks: Blob[]; started: number; timer: number; canvasStream: MediaStream | null; extension: string } | null>(null);
  const canRecord = Boolean(programSource?.stream) && selectedRecordingCapability.available;

  const setRecordingFormat = useCallback((format: RecordingFormat) => {
    if (recording) return;
    const capability = getRecordingCapabilities().find((item) => item.format === format);
    if (!capability?.available) {
      setRecordError(capability?.detail ?? 'That recording format is unavailable.');
      return;
    }
    setRecordError(null);
    setRecordingFormatState(format);
  }, [recording]);

  const stopRecording = useCallback(() => {
    const r = recRef.current;
    if (!r) return;
    clearInterval(r.timer);
    try { if (r.rec.state !== 'inactive') r.rec.stop(); } catch { /* already stopped */ }
  }, []);

  const startRecording = useCallback(() => {
    const program = sourcesRef.current.find((s) => s.id === state.programId);
    if (!program?.stream || typeof MediaRecorder === 'undefined') return;
    const capability = getRecordingCapabilities().find((item) => item.format === recordingFormat);
    if (!capability?.available || !capability.mimeType) {
      setRecordError(capability?.detail ?? 'The selected recording format is unavailable.');
      return;
    }
    // Prefer the composited studio output (canvas); fall back to the raw Program
    // video track if the canvas isn't capturable.
    const canvasStream = captureOutputStream(30);
    const videoTracks = canvasStream?.getVideoTracks().length ? canvasStream.getVideoTracks() : program.stream.getVideoTracks();
    // Prefer the mixer's master bus (fader/mute/solo applied) for audio; fall
    // back to the raw Program audio if the mixer graph isn't active.
    const mixerAudio = mixedAudioTracks();
    const audioTracks = mixerAudio.length ? mixerAudio : program.stream.getAudioTracks();
    const mixed = new MediaStream([...videoTracks, ...audioTracks]);
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(mixed, { mimeType: capability.mimeType });
    } catch (error) {
      canvasStream?.getTracks().forEach((t) => t.stop());
      setRecordError(error instanceof Error ? error.message : 'MediaRecorder could not start.');
      return;
    }
    const chunks: Blob[] = [];
    let bytes = 0;
    rec.ondataavailable = (e) => {
      if (!e.data || !e.data.size) return;
      chunks.push(e.data);
      bytes += e.data.size;
      setRecBytes(bytes);
    };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || capability.mimeType || undefined });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chase-program-${new Date().toISOString().replace(/[:.]/g, '-')}.${capability.extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      canvasStream?.getTracks().forEach((t) => t.stop());
      recRef.current = null;
      setRecording(false);
    };
    const started = Date.now();
    let lastDataRequest = 0;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      setRecElapsed(elapsed);
      if (elapsed - lastDataRequest >= 1000 && rec.state === 'recording') {
        lastDataRequest = elapsed;
        try { rec.requestData(); } catch { /* some browser codecs flush only on stop */ }
      }
    }, 500);
    recRef.current = { rec, chunks, started, timer, canvasStream, extension: capability.extension };
    setRecordError(null);
    setRecBytes(0);
    setRecMimeType(capability.mimeType);
    rec.start(1000); // 1s timeslice
    setRecording(true);
    setRecElapsed(0);
  }, [captureOutputStream, recordingFormat, state.programId]);

  const toggleRecording = useCallback(() => {
    if (recording) stopRecording(); else startRecording();
  }, [recording, startRecording, stopRecording]);

  // Stop recording + timer on unmount (no zombie recorder/interval).
  useEffect(() => () => { stopRecording(); }, [stopRecording]);

  const recordLabel = recording ? `● REC ${fmtTime(recElapsed)}` : 'REC';

  const recordingStats = {
    durationMs: recElapsed,
    bytes: recBytes,
    bitrateKbps: recElapsed > 0 ? Math.round((recBytes * 8) / recElapsed) : 0,
    mimeType: recMimeType,
  };

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
    // Prefer the mixer's master bus (fader/mute/solo applied) for audio.
    const mixerAudio = mixedAudioTracks();
    const audioTracks = mixerAudio.length ? mixerAudio : program.stream.getAudioTracks();
    const out = new MediaStream([...videoTracks, ...audioTracks]);

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
    recordingFormat,
    recordingCapabilities,
    setRecordingFormat,
    recordingStats,
    recordError,
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
    audioParams,
    setChannelParams,
    masterGain,
    setMasterGain,
    getChannelLevel,
    getMasterLevel,
  };

  return <SourcesContext.Provider value={value}>{children}</SourcesContext.Provider>;
}

export function useSources() {
  const ctx = useContext(SourcesContext);
  if (!ctx) throw new Error('useSources must be used within SourcesProvider');
  return ctx;
}
