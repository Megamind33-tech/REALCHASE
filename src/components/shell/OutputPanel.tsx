import { useEffect, useState } from 'react';
import { Slider, Meter } from '@/components/ui/Controls';
import { Button } from '@/components/ui/Button';
import { useShell } from '@/context/ShellContext';
import { TRANSITIONS, STREAM_DESTINATIONS, AUDIO_CHANNELS } from '@/data/mock/studioData';
import type { AudioChannel } from '@/context/shellTypes';

export function OutputPanel() {
  const { state, dispatch } = useShell();
  const [channels, setChannels] = useState<AudioChannel[]>(AUDIO_CHANNELS);
  const [recSeconds, setRecSeconds] = useState(0);

  useEffect(() => {
    if (!state.isRecording) return;
    const t = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state.isRecording]);

  useEffect(() => {
    if (!state.isRecording) setRecSeconds(0);
  }, [state.isRecording]);

  useEffect(() => {
    const interval = setInterval(() => {
      setChannels((prev) =>
        prev.map((ch) => ({
          ...ch,
          level: ch.muted ? 0 : Math.max(5, Math.min(95, ch.level + (Math.random() - 0.5) * 20)),
        })),
      );
    }, 200);
    return () => clearInterval(interval);
  }, []);

  if (state.rightPanelCollapsed || state.activeModule === 'settings') return null;

  const formatRec = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div
      style={{
        height: 'var(--output-panel-h)',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-panel)',
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      <div style={{ padding: 8 }}>
        <div className="section-label" style={{ marginBottom: 6 }}>Transitions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 8 }}>
          {TRANSITIONS.map((t) => (
            <button
              key={t}
              onClick={() => dispatch({ type: 'SET_TRANSITION', transition: t })}
              style={{
                padding: '4px 6px',
                fontSize: 9,
                border: `1px solid ${state.transitionType === t ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                borderRadius: 3,
                background: state.transitionType === t ? 'var(--accent-blue-dim)' : 'var(--bg-panel-raised)',
                color: state.transitionType === t ? 'var(--accent-blue)' : 'var(--text-secondary)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <Slider
          label="Duration"
          value={Math.round(state.transitionDuration * 10)}
          min={1}
          max={30}
          unit=" (×0.1s)"
          onChange={(v) => dispatch({ type: 'SET_TRANSITION_DURATION', duration: v / 10 })}
        />

        <div className="section-label" style={{ margin: '12px 0 6px' }}>Audio Mixer</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginBottom: 12 }}>
          {channels.map((ch) => (
            <div key={ch.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Meter level={ch.level} muted={ch.muted} />
              <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{ch.label}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button
                  onClick={() =>
                    setChannels((prev) =>
                      prev.map((c) => (c.id === ch.id ? { ...c, muted: !c.muted } : c)),
                    )
                  }
                  style={{
                    fontSize: 8,
                    padding: '1px 4px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 2,
                    background: ch.muted ? 'var(--status-error)' : 'transparent',
                    color: ch.muted ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  M
                </button>
                <button
                  onClick={() =>
                    setChannels((prev) =>
                      prev.map((c) => ({ ...c, solo: c.id === ch.id ? !c.solo : false })),
                    )
                  }
                  style={{
                    fontSize: 8,
                    padding: '1px 4px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 2,
                    background: ch.solo ? 'var(--status-warn)' : 'transparent',
                    color: ch.solo ? '#000' : 'var(--text-muted)',
                  }}
                >
                  S
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="section-label" style={{ marginBottom: 6 }}>Output &amp; Stream</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div
            style={{
              flex: 1,
              padding: 8,
              background: 'var(--bg-panel-raised)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 3,
              fontSize: 10,
            }}
          >
            <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>REC</div>
            <div className="mono" style={{ color: state.isRecording ? 'var(--status-rec)' : 'var(--text-primary)' }}>
              {state.isRecording ? formatRec(recSeconds) : 'Standby'}
            </div>
            {state.isRecording && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>~124 MB</div>}
          </div>
          <div
            style={{
              flex: 1,
              padding: 8,
              background: 'var(--bg-panel-raised)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 3,
              fontSize: 10,
            }}
          >
            <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Program Monitor</div>
            <div style={{ color: state.isLive ? 'var(--status-ok)' : 'var(--text-muted)' }}>
              {state.isLive ? 'ON AIR' : 'Offline'}
            </div>
            <Button
              variant="secondary"
              style={{ marginTop: 4, height: 20, fontSize: 9, width: '100%' }}
              onClick={() => dispatch({ type: 'SET_MODULE', module: 'outputs' })}
            >
              Manage Destinations
            </Button>
          </div>
        </div>

        <div className="section-label" style={{ marginBottom: 4 }}>Stream Health</div>
        {STREAM_DESTINATIONS.map((dest) => (
          <div
            key={dest.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 0',
              fontSize: 10,
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>{dest.name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {state.isLive && (
                <span style={{ color: 'var(--status-ok)', fontWeight: 600, fontSize: 9 }}>LIVE</span>
              )}
              <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 9 }}>
                {dest.resolution} · {dest.bitrate}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
