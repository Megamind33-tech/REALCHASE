// Real timeline model. The timeline drives actual app state: at a cue's time it
// fires a concrete action — play/stop a broadcast graphic (M4) or switch the
// active camera. The playhead advances in real time during playback and can be
// scrubbed; the engine reconciles graphics/camera to the state implied by the
// cues at the current time. No fake transport.

export type CueType = 'graphicOn' | 'graphicOff' | 'cameraSwitch';

export interface Cue {
  id: string;
  time: number; // seconds from start
  type: CueType;
  targetId: string; // graphic id, or camera id for cameraSwitch
  label: string;
}

export interface DesiredState {
  onGraphics: Set<string>;
  camera: string | null;
}

export function makeCueId(): string {
  return `cue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');

/** Broadcast timecode HH:MM:SS:FF. */
export function formatTimecode(seconds: number, fps = 30): string {
  const t = Math.max(0, seconds);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const f = Math.floor((t - Math.floor(t)) * fps);
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

/** Short clock MM:SS for ruler labels. */
export function formatClock(seconds: number): string {
  const t = Math.max(0, seconds);
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

/** The state implied by all cues at or before time t (latest-wins per target). */
export function desiredStateAt(t: number, cues: Cue[]): DesiredState {
  const lastByGraphic = new Map<string, CueType>();
  let camera: string | null = null;
  const sorted = [...cues].sort((a, b) => a.time - b.time);
  for (const c of sorted) {
    if (c.time > t) break;
    if (c.type === 'graphicOn' || c.type === 'graphicOff') lastByGraphic.set(c.targetId, c.type);
    else if (c.type === 'cameraSwitch') camera = c.targetId;
  }
  const onGraphics = new Set<string>();
  for (const [id, type] of lastByGraphic) if (type === 'graphicOn') onGraphics.add(id);
  return { onGraphics, camera };
}
