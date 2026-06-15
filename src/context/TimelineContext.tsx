import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import type { Cue } from '@/timeline/timelineTypes';

interface TimelineContextValue {
  playhead: number; // seconds
  duration: number; // seconds
  isPlaying: boolean;
  loop: boolean;
  fps: number;
  cues: Cue[];
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stop: () => void; // pause + return to 0
  seek: (t: number) => void;
  stepBy: (delta: number) => void;
  setPlayhead: (t: number) => void; // used by the player loop
  setLoop: (on: boolean) => void;
  setDuration: (d: number) => void;
  addCue: (cue: Cue) => void;
  removeCue: (id: string) => void;
  clearCues: () => void;
  /** Replace all cues (and optionally duration) from a loaded project. */
  restoreCues: (cues: Cue[], duration?: number) => void;
}

const TimelineContext = createContext<TimelineContextValue | null>(null);

export function TimelineProvider({ children }: { children: ReactNode }) {
  const [playhead, setPlayheadState] = useState(0);
  const [duration, setDurationState] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoopState] = useState(false);
  const [cues, setCues] = useState<Cue[]>([]);
  const fps = 30;

  const clamp = useCallback((t: number) => Math.min(duration, Math.max(0, t)), [duration]);

  const setPlayhead = useCallback((t: number) => setPlayheadState(clamp(t)), [clamp]);
  const seek = useCallback((t: number) => setPlayheadState(clamp(t)), [clamp]);
  const stepBy = useCallback((delta: number) => setPlayheadState((p) => Math.min(duration, Math.max(0, p + delta))), [duration]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const stop = useCallback(() => { setIsPlaying(false); setPlayheadState(0); }, []);

  const setLoop = useCallback((on: boolean) => setLoopState(on), []);
  const setDuration = useCallback((d: number) => setDurationState(Math.max(1, d)), []);

  const addCue = useCallback((cue: Cue) => {
    setCues((prev) => [...prev, cue].sort((a, b) => a.time - b.time));
  }, []);
  const removeCue = useCallback((id: string) => setCues((prev) => prev.filter((c) => c.id !== id)), []);
  const clearCues = useCallback(() => setCues([]), []);

  const restoreCues = useCallback((next: Cue[], dur?: number) => {
    setCues([...next].sort((a, b) => a.time - b.time));
    if (typeof dur === 'number' && Number.isFinite(dur)) setDurationState(Math.max(1, dur));
    setIsPlaying(false);
    setPlayheadState(0);
  }, []);

  return (
    <TimelineContext.Provider
      value={{
        playhead, duration, isPlaying, loop, fps, cues,
        play, pause, togglePlay, stop, seek, stepBy, setPlayhead,
        setLoop, setDuration, addCue, removeCue, clearCues, restoreCues,
      }}
    >
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimeline() {
  const ctx = useContext(TimelineContext);
  if (!ctx) throw new Error('useTimeline must be used within TimelineProvider');
  return ctx;
}
