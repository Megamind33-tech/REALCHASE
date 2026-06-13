import { Button } from '@/components/ui/Button';
import { useShell } from '@/context/ShellContext';
import { TRANSITIONS, STREAM_DESTINATIONS } from '@/data/mock/studioData';

export function OutputPanel() {
  const { state } = useShell();
  if (state.rightPanelCollapsed || state.activeModule === 'settings' || state.activeModule === 'switcher') return null;

  return (
    <div
      data-testid="outputs-surface"
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
              disabled title="Transitions disabled until real output pipeline"
              style={{
                padding: '4px 6px',
                fontSize: 9,
                border: '1px solid var(--border-subtle)',
                borderRadius: 3,
                background: 'var(--bg-panel-raised)',
                color: 'var(--text-muted)',
                opacity: 0.55,
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 8 }}>Transitions disabled until real output pipeline.</div>

        <div className="section-label" style={{ margin: '12px 0 4px' }}>Audio</div>
        <div
          data-testid="audio-meter-panel"
          style={{
            border: '1px dashed var(--border-active)',
            borderRadius: 3,
            padding: 12,
            color: 'var(--text-muted)',
            fontSize: 10,
            lineHeight: 1.5,
            marginBottom: 12,
          }}
        >
          No real audio source connected. Audio engine and source audio analysis are not wired yet, so meters and routing controls are hidden instead of showing fake levels.
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
            <div className="mono" style={{ color: 'var(--text-muted)' }}>Requires recording engine</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Recorder not connected (Phase 2)</div>
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
            <div style={{ color: 'var(--text-muted)' }}>Requires streaming engine</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Output not connected (Phase 2)</div>
            <Button
              variant="secondary"
              style={{ marginTop: 4, height: 20, fontSize: 9, width: '100%' }}
              disabled title="Disabled until real output pipeline"
            >
              Manage Destinations
            </Button>
          </div>
        </div>

        <div data-testid="stream-destination-panel">
          <div className="section-label" style={{ marginBottom: 4 }}>Stream Destinations</div>
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
            <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 9 }}>Streaming disabled until MediaMTX/output pipeline is added</span>
          </div>
          ))}
        </div>
      </div>
    </div>
  );
}
