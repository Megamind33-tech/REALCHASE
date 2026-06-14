import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import type {
  Source,
  KeyingSettings,
  SourcePlacement,
  StreamDestination,
} from '@/sources/sourceTypes';
import { DEFAULT_KEYING_SETTINGS } from '@/sources/sourceTypes';

interface SourcesContextValue {
  sources: Source[];
  destinations: StreamDestination[];
  previewId: string | null;
  programId: string | null;
  previewSource: Source | null;
  programSource: Source | null;
  liveLabel: string;
  liveWebsite: { whepUrl: string } | null;
  capturing: boolean;
  recordLabel: string;
  canRecord: boolean;
  onAir: boolean;
  canStream: boolean;
  streamError: string | null;
  liveAudioSources: Source[];
  armedTargetCount: number;
  addWebcamSource: () => Promise<void>;
  addVideoFileSource: (file: File) => Promise<void>;
  addImageFileSource: (file: File) => Promise<void>;
  addScreenSource: () => Promise<void>;
  removeSource: (id: string) => void;
  setPreview: (id: string) => void;
  cut: () => void;
  roleOf: (sourceId: string) => 'preview' | 'program' | 'both' | null;
  updateSourcePlacement: (id: string, placement: SourcePlacement, screenTargetId?: string) => void;
  updateSourceKeying: (id: string, keying: KeyingSettings) => void;
  toggleCapture: () => Promise<void>;
  toggleAir: (ingestUrl: string) => Promise<void>;
  restoreProjectSources: (sources: Source[], previewId: string | null, programId: string | null) => void;
  updateDestination: (id: string, patch: Partial<StreamDestination>) => void;
  updateDestinationLeg: (id: string, kind: 'normal' | 'satellite', patch: Partial<StreamDestination['normal']>) => void;
}

const SourcesContext = createContext<SourcesContextValue | null>(null);

export function SourcesProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [destinations, setDestinations] = useState<StreamDestination[]>([
    {
      id: 'youtube',
      name: 'YouTube',
      platform: 'youtube',
      enabled: false,
      normal: { enabled: false, url: 'rtmps://a.rtmp.youtube.com/live2', key: '' },
      satellite: { enabled: false, url: 'rtmps://a.rtmp.youtube.com/live2', key: '' },
    },
    {
      id: 'twitch',
      name: 'Twitch',
      platform: 'twitch',
      enabled: false,
      normal: { enabled: false, url: 'rtmps://live-bos.twitch.tv/app', key: '' },
      satellite: { enabled: false, url: 'rtmps://live-bos.twitch.tv/app', key: '' },
    },
    {
      id: 'custom',
      name: 'Custom RTMP',
      platform: 'custom-rtmp',
      enabled: false,
      normal: { enabled: false, url: '', key: '' },
      satellite: { enabled: false, url: '', key: '' },
    },
    {
      id: 'website',
      name: 'Website (WHEP)',
      platform: 'website',
      enabled: true,
      normal: { enabled: false, url: '', key: '' },
      satellite: { enabled: false, url: '', key: '' },
    },
  ]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [onAir, setOnAir] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const whipConnectionRef = useRef<{ url: string; abort: AbortController } | null>(null);

  // Generate unique source ID
  const genSourceId = useCallback(() => `src_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, []);

  // Add webcam source
  const addWebcamSource = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const id = genSourceId();
      const videoTrack = stream.getVideoTracks()[0];
      const label = videoTrack?.label || 'Webcam';

      setSources((prev) => [
        ...prev,
        {
          id,
          name: label,
          type: 'webcam',
          stream,
          status: 'live',
          error: null,
          placement: 'mediaPlane',
          keying: DEFAULT_KEYING_SETTINGS,
          needsReconnect: false,
        },
      ]);
    } catch (error) {
      console.error('Webcam access denied:', error);
    }
  }, [genSourceId]);

  // Add video file source
  const addVideoFileSource = useCallback(async (file: File) => {
    try {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        console.error('Invalid file type:', file.type);
        return;
      }

      // Create URL and HTMLVideoElement
      const url = URL.createObjectURL(file);
      const videoEl = document.createElement('video');
      videoEl.src = url;
      videoEl.crossOrigin = 'anonymous';
      videoEl.loop = true;

      // Create canvas + stream from video element
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      let animationId: number;
      const draw = () => {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        animationId = requestAnimationFrame(draw);
      };

      videoEl.addEventListener('play', () => { draw(); });
      videoEl.addEventListener('pause', () => { cancelAnimationFrame(animationId); });

      const stream = canvas.captureStream(30);
      const id = genSourceId();

      setSources((prev) => [
        ...prev,
        {
          id,
          name: file.name,
          type: 'video',
          stream,
          status: 'live',
          error: null,
          placement: 'mediaPlane',
          keying: DEFAULT_KEYING_SETTINGS,
          needsReconnect: false,
          videoFile: file,
        },
      ]);

      videoEl.play().catch(() => {});
    } catch (error) {
      console.error('Video file load failed:', error);
    }
  }, [genSourceId]);

  // Add image file source
  const addImageFileSource = useCallback(async (file: File) => {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('Invalid file type:', file.type);
        return;
      }

      // Create image + canvas stream
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw image to canvas (centered, letterboxed)
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        // Hold image (no animation)
        const stream = canvas.captureStream(30);
        const id = genSourceId();

        setSources((prev) => [
          ...prev,
          {
            id,
            name: file.name,
            type: 'image',
            stream,
            status: 'live',
            error: null,
            placement: 'mediaPlane',
            keying: DEFAULT_KEYING_SETTINGS,
            needsReconnect: false,
            imageFile: file,
          },
        ]);
      };

      img.onerror = () => {
        console.error('Image load failed:', file.name);
      };
    } catch (error) {
      console.error('Image load error:', error);
    }
  }, [genSourceId]);

  // Add screen/window source
  const addScreenSource = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const id = genSourceId();
      const videoTrack = stream.getVideoTracks()[0];
      const label = videoTrack?.label || 'Screen Share';

      setSources((prev) => [
        ...prev,
        {
          id,
          name: label,
          type: 'screen',
          stream,
          status: 'live',
          error: null,
          placement: 'mediaPlane',
          keying: DEFAULT_KEYING_SETTINGS,
          needsReconnect: false,
        },
      ]);

      // Handle screen share end
      videoTrack?.addEventListener('ended', () => {
        setSources((prev) => prev.filter((s) => s.id !== id));
      });
    } catch (error) {
      console.error('Screen capture denied:', error);
    }
  }, [genSourceId]);

  // Remove source
  const removeSource = useCallback((id: string) => {
    setSources((prev) => {
      const source = prev.find((s) => s.id === id);
      if (source?.stream) {
        source.stream.getTracks().forEach((t) => t.stop());
      }
      return prev.filter((s) => s.id !== id);
    });

    if (previewId === id) setPreviewId(null);
    if (programId === id) setProgramId(null);
  }, [previewId, programId]);

  // Set preview source
  const setPreview = useCallback((id: string) => {
    setPreviewId(id);
  }, []);

  // Cut (preview → program)
  const cut = useCallback(() => {
    if (previewId) {
      setProgramId(previewId);
    }
  }, [previewId]);

  // Get source role
  const roleOf = useCallback((sourceId: string): 'preview' | 'program' | 'both' | null => {
    const isPreview = sourceId === previewId;
    const isProgram = sourceId === programId;
    if (isPreview && isProgram) return 'both';
    if (isProgram) return 'program';
    if (isPreview) return 'preview';
    return null;
  }, [previewId, programId]);

  // Update source placement
  const updateSourcePlacement = useCallback((id: string, placement: SourcePlacement, screenTargetId?: string) => {
    setSources((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, placement, screenTargetId: screenTargetId || s.screenTargetId }
          : s
      )
    );
  }, []);

  // Update source keying
  const updateSourceKeying = useCallback((id: string, keying: KeyingSettings) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, keying } : s))
    );
  }, []);

  // Toggle capture
  const toggleCapture = useCallback(async () => {
    const programSource = sources.find((s) => s.id === programId);
    if (!programSource?.stream) return;

    if (capturing) {
      mediaRecorderRef.current?.stop();
      setCapturing(false);
    } else {
      try {
        const mediaRecorder = new MediaRecorder(programSource.stream);
        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (e) => {
          chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `capture-${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setCapturing(true);
      } catch (error) {
        console.error('Capture start failed:', error);
      }
    }
  }, [programId, capturing, sources]);

  // Toggle stream to WHIP endpoint
  const toggleAir = useCallback(async (ingestUrl: string) => {
    const programSource = sources.find((s) => s.id === programId);
    if (!programSource?.stream) return;

    if (onAir && whipConnectionRef.current) {
      whipConnectionRef.current.abort.abort();
      whipConnectionRef.current = null;
      setOnAir(false);
    } else {
      try {
        setStreamError(null);
        const abort = new AbortController();
        const pc = new RTCPeerConnection();
        const stream = programSource.stream;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const response = await fetch(ingestUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: pc.localDescription?.sdp,
          signal: abort.signal,
        });

        if (!response.ok) {
          throw new Error(`WHIP error: ${response.status}`);
        }

        const sdp = await response.text();
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));

        whipConnectionRef.current = { url: ingestUrl, abort };
        setOnAir(true);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        setStreamError(msg);
        console.error('Stream failed:', msg);
      }
    }
  }, [programId, onAir, sources]);

  // Restore project sources
  const restoreProjectSources = useCallback((newSources: Source[], newPreviewId: string | null, newProgramId: string | null) => {
    // Stop existing sources
    sources.forEach((s) => {
      if (s.stream) {
        s.stream.getTracks().forEach((t) => t.stop());
      }
    });

    setSources(newSources.map((s) => ({ ...s, stream: null, status: 'disconnected' as const })));
    setPreviewId(newPreviewId);
    setProgramId(newProgramId);
  }, [sources]);

  // Update destination
  const updateDestination = useCallback((id: string, patch: Partial<StreamDestination>) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
  }, []);

  // Update destination leg
  const updateDestinationLeg = useCallback((id: string, kind: 'normal' | 'satellite', patch: Partial<StreamDestination['normal']>) => {
    setDestinations((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, [kind]: { ...d[kind], ...patch } }
          : d
      )
    );
  }, []);

  const previewSource = sources.find((s) => s.id === previewId) || null;
  const programSource = sources.find((s) => s.id === programId) || null;
  const liveAudioSources = sources.filter((s) => s.status === 'live' && s.stream?.getAudioTracks().length);
  const armedTargetCount = destinations.filter((d) => d.enabled && (d.normal.enabled || d.satellite.enabled)).length;
  const recordLabel = capturing ? `Recording ${Math.floor(Date.now() / 1000) % 100}s` : 'Record';
  const liveLabel = onAir ? `Live ${sources.length} source${sources.length === 1 ? '' : 's'}` : 'Go Live';

  const value: SourcesContextValue = {
    sources,
    destinations,
    previewId,
    programId,
    previewSource,
    programSource,
    liveLabel,
    liveWebsite: onAir ? { whepUrl: `${window.location.origin}/live.html` } : null,
    capturing,
    recordLabel,
    canRecord: !!programSource,
    onAir,
    canStream: !!programSource,
    streamError,
    liveAudioSources,
    armedTargetCount,
    addWebcamSource,
    addVideoFileSource,
    addImageFileSource,
    addScreenSource,
    removeSource,
    setPreview,
    cut,
    roleOf,
    updateSourcePlacement,
    updateSourceKeying,
    toggleCapture,
    toggleAir,
    restoreProjectSources,
    updateDestination,
    updateDestinationLeg,
  };

  return (
    <SourcesContext.Provider value={value}>
      {children}
    </SourcesContext.Provider>
  );
}

export function useSources() {
  const ctx = useContext(SourcesContext);
  if (!ctx) throw new Error('useSources must be used within SourcesProvider');
  return ctx;
}
