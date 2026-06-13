import { useEffect, useRef } from 'react';
import { Video, Plus, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSources } from '@/context/SourcesContext';
import type { Source } from '@/sources/sourceTypes';

/** Renders a live MediaStream into a <video>. srcObject must be set imperatively. */
function VideoView({ stream, label }: { stream: MediaStream | null; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => {});
    return () => {
      // Detach only — never stop tracks here; the Source owns the stream.
      if (el) el.srcObject = null;
    };
  }, [stream]);

  if (!stream) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 11,
        }}
      >
        {label}
      </div>
    );
  }
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
    />
  );
}

function StatusBadge({ source }: { source: Source }) {
  const map: Record<Source['status'], { label: string; color: string }> = {
    idle: { label: 'IDLE', color: 'var(--text-muted)' },
    connecting: { label: 'CONNECTING', color: 'var(--status-warn)' },
    live: { label: 'LIVE', color: 'var(--status-ok)' },
    error: { label: 'ERROR', color: 'var(--status-error)' },
  };
  const s = map[source.status];
  return (
    <span className="mono" style={{ fontSize: 9, fontWeight: 600, color: s.color }}>
      {s.label}
    </span>
  );
}

function Monitor({ title, stream, accent, tally }: { title: string; stream: MediaStream | null; accent: string; tally: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="section-label">{title}</span>
        <span className="mono" style={{ fontSize: 9, color: accent, fontWeight: 600 }}>{tally}</span>
      </div>
      <div
        style={{
          position: 'relative',
          aspectRatio: '16/9',
          background: 'var(--bg-viewport)',
          border: `2px solid ${accent}`,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <VideoView stream={stream} label={`${title} empty`} />
      </div>
    </div>
  );
}

export function SwitcherPanel() {
  const { sources, addWebcamSource, removeSource, setPreview, cut, previewSource, programSource, roleOf, previewId } =
    useSources();

  return (
    <div className="scroll-y" style={{ flex: 1, minHeight: 0, background: 'var(--bg-viewport)', padding: 16 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Sources &amp; Switcher</h2>
          <Button variant="secondary" onClick={() => void addWebcamSource()}>
            <Plus size={14} /> Add Webcam
          </Button>
        </div>

        {/* Preview / Program monitors */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <Monitor title="Preview" stream={previewSource?.stream ?? null} accent="var(--status-ok)" tally={previewSource ? previewSource.name : '—'} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
            <Button
              variant="danger"
              disabled={!previewId}
              onClick={() => cut()}
              style={{ height: 40, padding: '0 18px', fontSize: 13, fontWeight: 700 }}
            >
              CUT <ArrowRight size={16} />
            </Button>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>Preview → Program</span>
          </div>
          <Monitor title="Program" stream={programSource?.stream ?? null} accent="var(--status-rec)" tally={programSource ? programSource.name : 'OFF'} />
        </div>

        <div className="section-label" style={{ marginBottom: 6 }}>Sources</div>
        {sources.length === 0 ? (
          <div
            style={{
              border: '1px dashed var(--border-active)',
              borderRadius: 4,
              padding: 20,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 11,
            }}
          >
            No sources yet. Click <strong>Add Webcam</strong> to ingest your first live input.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sources.map((source) => {
              const role = roleOf(source.id);
              return (
                <div
                  key={source.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 8,
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `3px solid ${role === 'program' || role === 'both' ? 'var(--status-rec)' : role === 'preview' ? 'var(--status-ok)' : 'var(--border-subtle)'}`,
                    borderRadius: 4,
                  }}
                >
                  <Video size={16} color="var(--text-secondary)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{source.name}</span>
                      <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{source.type}</span>
                      <StatusBadge source={source} />
                      {role && (
                        <span className="mono" style={{ fontSize: 9, fontWeight: 600, color: role === 'preview' ? 'var(--status-ok)' : 'var(--status-rec)' }}>
                          {role.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {source.error && (
                      <div style={{ fontSize: 10, color: 'var(--status-error)', marginTop: 2 }}>{source.error}</div>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    disabled={source.status !== 'live'}
                    onClick={() => setPreview(source.id)}
                    style={{ height: 24, fontSize: 10 }}
                  >
                    To Preview
                  </Button>
                  <Button variant="ghost" onClick={() => removeSource(source.id)} aria-label={`Remove ${source.name}`} style={{ height: 24 }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 14 }}>
          The live <strong>Program</strong> source also renders on the studio LED wall — open the{' '}
          <strong>Builder</strong> module to see it composited into the 3D set.
        </p>
      </div>
    </div>
  );
}
