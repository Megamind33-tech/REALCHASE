import { useShell } from '@/context/ShellContext';
import { useSources } from '@/context/SourcesContext';
import { AudioMeter } from '@/components/audio/AudioMeter';
import { TRANSITIONS } from '@/data/mock/studioData';
import { legSummary, type StreamDestination, type LegKind } from '@/output/destinations';

const legInput: React.CSSProperties = {
  flex: 1, minWidth: 0, fontSize: 9, padding: '2px 5px',
  background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)',
  borderRadius: 2, color: 'var(--text-primary)',
};

function LegEditor({ dest, kind, label }: { dest: StreamDestination; kind: LegKind; label: string }) {
  const { updateDestinationLeg } = useSources();
  const leg = dest[kind];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
      <input
        type="checkbox"
        checked={leg.enabled}
        aria-label={`${dest.name} ${label} enabled`}
        onChange={(e) => updateDestinationLeg(dest.id, kind, { enabled: e.currentTarget.checked })}
      />
      <span style={{ width: 52, fontSize: 9, color: 'var(--text-secondary)' }}>{label}</span>
      <input
        style={legInput} spellCheck={false} placeholder="rtmp(s):// ingest URL"
        aria-label={`${dest.name} ${label} URL`} value={leg.url}
        onChange={(e) => updateDestinationLeg(dest.id, kind, { url: e.currentTarget.value })}
      />
      <input
        style={{ ...legInput, flex: '0 0 96px' }} type="password" spellCheck={false} placeholder="stream key"
        aria-label={`${dest.name} ${label} key`} value={leg.key}
        onChange={(e) => updateDestinationLeg(dest.id, kind, { key: e.currentTarget.value })}
      />
    </div>
  );
}

export function OutputPanel() {
  const { state } = useShell();
  const {
    sources, onAir, liveLabel, capturing, recordLabel,
    destinations, updateDestination, armedTargetCount, liveWebsite,
  } = useSources();
  const liveAudioSources = sources.filter((s) => s.status === 'live' && s.stream && s.stream.getAudioTracks().length > 0);
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
            border: '1px solid var(--border-subtle)',
            borderRadius: 3,
            padding: 10,
            marginBottom: 12,
          }}
        >
          {liveAudioSources.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: 10, lineHeight: 1.5 }}>
              No real audio source connected. Add a source with a microphone and live levels appear here (measured from the source audio track — never faked).
            </span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {liveAudioSources.map((s) => (
                <AudioMeter key={s.id} stream={s.stream as MediaStream} label={s.name} />
              ))}
            </div>
          )}
        </div>

        {/* These two tiles mirror the real toolbar controls: capture (MediaRecorder
            → .webm) and output (WebRTC/WHIP publish). State is derived from the
            shared sources context, so the panel reflects ground truth — it never
            shows an active state unless capture/output is genuinely running. */}
        <div className="section-label" style={{ marginBottom: 6 }}>Output &amp; Capture</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div
            data-testid="output-capture-tile"
            style={{
              flex: 1,
              padding: 8,
              background: 'var(--bg-panel-raised)',
              border: `1px solid ${capturing ? 'var(--status-rec)' : 'var(--border-subtle)'}`,
              borderRadius: 3,
              fontSize: 10,
            }}
          >
            <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Capture</div>
            <div className="mono" style={{ color: capturing ? 'var(--status-rec)' : 'var(--text-muted)' }}>{capturing ? recordLabel : 'Idle'}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
              {capturing ? 'Writing the Program output to a .webm file.' : 'Idle — start capture from the toolbar.'}
            </div>
          </div>
          <div
            data-testid="output-air-tile"
            style={{
              flex: 1,
              padding: 8,
              background: 'var(--bg-panel-raised)',
              border: `1px solid ${onAir ? 'var(--status-rec)' : 'var(--border-subtle)'}`,
              borderRadius: 3,
              fontSize: 10,
            }}
          >
            <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Program Output</div>
            <div className="mono" style={{ color: onAir ? 'var(--status-rec)' : 'var(--text-muted)' }}>{onAir ? liveLabel : 'Off air'}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
              {onAir ? 'Publishing the Program output over WebRTC/WHIP.' : 'Idle — go on air from the toolbar.'}
            </div>
          </div>
        </div>

        <div data-testid="stream-destination-panel">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="section-label">Stream Destinations</span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }} data-testid="armed-target-count">
              {armedTargetCount} RTMP leg{armedTargetCount === 1 ? '' : 's'} armed
            </span>
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>
            Each station fans out via the local relay: a satellite uplink and a normal output. Keys stay in memory only.
          </div>

          {destinations.map((dest) => (
            <div
              key={dest.id}
              data-testid={`dest-${dest.platform}`}
              style={{ padding: '5px 0', borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={dest.enabled}
                  aria-label={`${dest.name} enabled`}
                  onChange={(e) => updateDestination(dest.id, { enabled: e.currentTarget.checked })}
                />
                <span style={{ flex: 1, color: 'var(--text-secondary)', fontSize: 10 }}>{dest.name}</span>
                <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{legSummary(dest)}</span>
              </div>

              {dest.enabled && dest.platform !== 'website' && (
                <div style={{ paddingLeft: 22, marginTop: 2 }}>
                  <LegEditor dest={dest} kind="satellite" label="Satellite" />
                  <LegEditor dest={dest} kind="normal" label="Normal" />
                </div>
              )}

              {dest.platform === 'website' && (
                <div style={{ paddingLeft: 22, marginTop: 3, fontSize: 9, color: 'var(--text-muted)' }}>
                  {onAir && liveWebsite ? (
                    <>
                      <div className="mono" style={{ wordBreak: 'break-all' }}>{liveWebsite.whepUrl}</div>
                      <a
                        href={`/live.html?src=${encodeURIComponent(liveWebsite.whepUrl)}`}
                        target="_blank" rel="noreferrer"
                        data-testid="live-website-link"
                      >
                        Open public page ↗
                      </a>
                    </>
                  ) : (
                    <a href="/live.html" target="_blank" rel="noreferrer" data-testid="live-website-link">
                      Open public page ↗ (plays once on air)
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
