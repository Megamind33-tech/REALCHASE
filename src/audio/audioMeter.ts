/**
 * Real audio metering via the Web Audio API.
 *
 * Levels are measured from an actual MediaStream audio track with an
 * AnalyserNode (RMS of the time-domain signal) — never fabricated. The analyser
 * is intentionally NOT connected to the audio destination, so metering a source
 * never plays it back (no echo/feedback).
 */
let sharedCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) sharedCtx = new Ctor();
  if (sharedCtx.state === 'suspended') void sharedCtx.resume();
  return sharedCtx;
}

export interface AudioMeterHandle {
  /** True only when the stream actually carries a live audio track. */
  readonly hasAudio: boolean;
  /** Linear RMS amplitude in 0..1 for the current frame. */
  getLevel(): number;
  dispose(): void;
}

const SILENT: AudioMeterHandle = { hasAudio: false, getLevel: () => 0, dispose: () => {} };

export function createAudioMeter(stream: MediaStream): AudioMeterHandle {
  if (stream.getAudioTracks().length === 0) return SILENT;
  const ctx = getContext();
  if (!ctx) return SILENT;

  let source: MediaStreamAudioSourceNode;
  try {
    source = ctx.createMediaStreamSource(stream);
  } catch {
    return SILENT;
  }
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.6;
  source.connect(analyser);

  const buf = new Float32Array(analyser.fftSize);
  let disposed = false;

  return {
    hasAudio: true,
    getLevel() {
      if (disposed) return 0;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
      return Math.sqrt(sum / buf.length);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      try { source.disconnect(); } catch { /* already gone */ }
      try { analyser.disconnect(); } catch { /* already gone */ }
    },
  };
}
