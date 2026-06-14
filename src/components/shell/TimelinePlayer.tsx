import { useEffect, useRef, useCallback } from 'react';
import { useTimeline } from '@/context/TimelineContext';
import { useGraphics } from '@/context/GraphicsContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { useShell } from '@/context/ShellContext';
import { desiredStateAt, type Cue } from '@/timeline/timelineTypes';

// Drives the timeline: a requestAnimationFrame loop advances the playhead in
// real time while playing, and on every playhead change the app state is
// reconciled to the cues — broadcast graphics are played/stopped and the active
// camera is switched to match what the cues imply at the current time. This is
// the real binding between the timeline and the studio; renders nothing.
export function TimelinePlayer() {
  const { isPlaying, playhead, duration, loop, cues, setPlayhead, pause } = useTimeline();
  const { graphics, onAirIds, setOnAir } = useGraphics();
  const { playGraphic, stopGraphic } = useEditorBridge();
  const { state, dispatch } = useShell();

  // Latest-value refs so the rAF loop reads current state without re-subscribing.
  const refs = useRef({ isPlaying, playhead, duration, loop, cues, graphics, onAirIds, activeCameraId: state.activeCameraId });
  refs.current = { isPlaying, playhead, duration, loop, cues, graphics, onAirIds, activeCameraId: state.activeCameraId };

  // Graphics referenced by any cue are "timeline-controlled" — only those are
  // auto-stopped by the timeline, so manual GraphicsPanel toggles aren't fought.
  const reconcile = useCallback((t: number) => {
    const { cues: cs, graphics: gfx, onAirIds: onAir, activeCameraId } = refs.current;
    const desired = desiredStateAt(t, cs);
    const controlled = new Set(cs.filter((c) => c.type !== 'cameraSwitch').map((c) => c.targetId));

    for (const id of desired.onGraphics) {
      if (!onAir.includes(id)) {
        const item = gfx.find((g) => g.id === id);
        if (item) { playGraphic(item); setOnAir(id, true); }
      }
    }
    for (const id of controlled) {
      if (!desired.onGraphics.has(id) && onAir.includes(id)) {
        stopGraphic(id);
        setOnAir(id, false);
      }
    }
    if (desired.camera && desired.camera !== activeCameraId) {
      dispatch({ type: 'SET_CAMERA', id: desired.camera });
    }
  }, [playGraphic, stopGraphic, setOnAir, dispatch]);

  // rAF playback loop (mounted once).
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const r = refs.current;
      if (r.isPlaying) {
        let next = r.playhead + dt;
        if (next >= r.duration) {
          if (r.loop) next = 0; // wrap; reconcile at 0 will stop end-state graphics
          else { next = r.duration; pause(); }
        }
        setPlayhead(next);
        reconcile(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setPlayhead, pause, reconcile]);

  // Reconcile on manual seek / cue edits (covers scrubbing in either direction).
  useEffect(() => { reconcile(playhead); }, [playhead, cues, reconcile]);

  return null;
}

export type { Cue };
