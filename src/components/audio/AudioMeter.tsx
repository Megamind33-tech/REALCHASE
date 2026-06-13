import { useEffect, useRef } from 'react';
import { createAudioMeter } from '@/audio/audioMeter';

/**
 * A real-time audio level meter driven by an AnalyserNode on a live MediaStream.
 *
 * The bar is updated imperatively via refs inside requestAnimationFrame, so it
 * never triggers React re-renders (avoids the whole-tree churn that fake
 * setInterval meters caused). Returns an honest "no audio track" state when the
 * stream has no audio.
 */
export function AudioMeter({ stream, label }: { stream: MediaStream; label: string }) {
  const fillRef = useRef<HTMLDivElement>(null);
  const peakRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const meter = createAudioMeter(stream);
    if (!meter.hasAudio) {
      if (noteRef.current) noteRef.current.textContent = 'no audio track';
      return () => meter.dispose();
    }
    let raf = 0;
    let peakHold = 0;
    const tick = () => {
      const rms = meter.getLevel();
      // Linear RMS → percentage with mild make-up gain for visibility.
      const pct = Math.min(100, rms * 180);
      peakHold = Math.max(peakHold * 0.94, pct);
      const fill = fillRef.current;
      if (fill) {
        fill.style.width = `${pct}%`;
        fill.style.background = pct > 85 ? 'var(--status-error)' : pct > 65 ? 'var(--status-warn)' : 'var(--status-ok)';
      }
      if (peakRef.current) peakRef.current.style.left = `${Math.min(99, peakHold)}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      meter.dispose();
    };
  }, [stream]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 9, color: 'var(--text-secondary)', width: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ position: 'relative', flex: 1, height: 8, background: 'var(--bg-app)', borderRadius: 2, overflow: 'hidden' }}>
        <div ref={fillRef} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '0%', background: 'var(--status-ok)' }} />
        <div ref={peakRef} style={{ position: 'absolute', top: 0, bottom: 0, left: '0%', width: 2, background: '#fff' }} />
      </div>
      <span ref={noteRef} className="mono" style={{ fontSize: 8, color: 'var(--text-muted)', width: 60, textAlign: 'right' }}>live</span>
    </div>
  );
}
