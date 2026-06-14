/**
 * Real broadcast audio mixer (Web Audio API).
 *
 * Each live source's audio is routed through its own GainNode into a shared
 * master GainNode, then to a MediaStreamAudioDestinationNode whose stream is the
 * mixed program audio used for recording and streaming. Fader / mute / solo are
 * applied to the real GainNodes, so they genuinely change what is broadcast —
 * not a cosmetic UI. Per-channel and master levels are measured from
 * AnalyserNodes (RMS), never fabricated.
 */

export interface ChannelParams {
  gain: number; // linear, 0..1.5 (1 = unity)
  muted: boolean;
  solo: boolean;
}

export const DEFAULT_CHANNEL: ChannelParams = { gain: 1, muted: false, solo: false };

interface Channel {
  source: MediaStreamAudioSourceNode;
  gainNode: GainNode;
  analyser: AnalyserNode;
  buf: Float32Array;
  streamId: string;
}

function rms(analyser: AnalyserNode, buf: Float32Array): number {
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

export class AudioMixer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private masterBuf = new Float32Array(1024);
  private dest: MediaStreamAudioDestinationNode | null = null;
  private channels = new Map<string, Channel>();
  private params = new Map<string, ChannelParams>();
  private masterGain = 1;

  private ensure(): boolean {
    if (this.ctx) return true;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.masterGain;
    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 1024;
    this.masterAnalyser.smoothingTimeConstant = 0.6;
    this.dest = this.ctx.createMediaStreamDestination();
    this.master.connect(this.masterAnalyser);
    this.master.connect(this.dest);
    return true;
  }

  /** Reconcile the graph with the current set of live audio sources. */
  sync(sources: { id: string; stream: MediaStream | null }[]): void {
    const withAudio = sources.filter((s) => s.stream && s.stream.getAudioTracks().length > 0);
    if (withAudio.length === 0 && !this.ctx) return; // nothing to do yet
    if (!this.ensure() || !this.ctx || !this.master) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();

    // Remove channels whose source disappeared or whose stream changed.
    for (const [id, ch] of [...this.channels]) {
      const match = withAudio.find((s) => s.id === id);
      const streamId = match?.stream?.id ?? null;
      if (!match || streamId !== ch.streamId) {
        try { ch.source.disconnect(); ch.gainNode.disconnect(); ch.analyser.disconnect(); } catch { /* gone */ }
        this.channels.delete(id);
      }
    }
    // Add channels for new sources.
    for (const s of withAudio) {
      if (this.channels.has(s.id) || !s.stream) continue;
      try {
        const source = this.ctx.createMediaStreamSource(s.stream);
        const gainNode = this.ctx.createGain();
        const analyser = this.ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(gainNode);
        gainNode.connect(analyser);
        gainNode.connect(this.master);
        this.channels.set(s.id, { source, gainNode, analyser, buf: new Float32Array(analyser.fftSize), streamId: s.stream.id });
        if (!this.params.has(s.id)) this.params.set(s.id, { ...DEFAULT_CHANNEL });
      } catch { /* source not connectable */ }
    }
    this.applyGains();
  }

  setParams(id: string, patch: Partial<ChannelParams>): void {
    const cur = this.params.get(id) ?? { ...DEFAULT_CHANNEL };
    this.params.set(id, { ...cur, ...patch });
    this.applyGains();
  }

  getParams(id: string): ChannelParams {
    return this.params.get(id) ?? { ...DEFAULT_CHANNEL };
  }

  setMaster(gain: number): void {
    this.masterGain = gain;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.01);
  }

  getMaster(): number { return this.masterGain; }

  /** Apply mute/solo/fader to every channel's real GainNode. */
  private applyGains(): void {
    if (!this.ctx) return;
    const soloActive = [...this.params.values()].some((p) => p.solo);
    for (const [id, ch] of this.channels) {
      const p = this.params.get(id) ?? DEFAULT_CHANNEL;
      const audible = p.muted ? 0 : soloActive ? (p.solo ? p.gain : 0) : p.gain;
      ch.gainNode.gain.setTargetAtTime(audible, this.ctx.currentTime, 0.01);
    }
  }

  /** Post-fader RMS level (0..1) for a channel. */
  level(id: string): number {
    const ch = this.channels.get(id);
    return ch ? rms(ch.analyser, ch.buf) : 0;
  }

  masterLevel(): number {
    return this.masterAnalyser ? rms(this.masterAnalyser, this.masterBuf) : 0;
  }

  hasGraph(): boolean {
    return this.channels.size > 0;
  }

  /** The mixed master audio tracks for recording/streaming (empty if no graph). */
  getMixedAudioTracks(): MediaStreamTrack[] {
    return this.dest && this.channels.size > 0 ? this.dest.stream.getAudioTracks() : [];
  }

  dispose(): void {
    for (const ch of this.channels.values()) {
      try { ch.source.disconnect(); ch.gainNode.disconnect(); ch.analyser.disconnect(); } catch { /* gone */ }
    }
    this.channels.clear();
    try { this.master?.disconnect(); this.masterAnalyser?.disconnect(); } catch { /* gone */ }
    if (this.ctx && this.ctx.state !== 'closed') void this.ctx.close();
    this.ctx = null;
    this.master = null;
    this.dest = null;
  }
}
