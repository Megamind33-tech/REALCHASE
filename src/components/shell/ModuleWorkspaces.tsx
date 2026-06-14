import { useState } from 'react';
import { Camera, Crosshair, Volume2, Radio, SquareStack, Settings as SettingsIcon, ScrollText, Square, Sun } from 'lucide-react';
import { useShell } from '@/context/ShellContext';
import { useSources } from '@/context/SourcesContext';
import { useGraphics } from '@/context/GraphicsContext';
import { useTimeline } from '@/context/TimelineContext';
import { useLighting } from '@/context/LightingContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { Slider, Toggle } from '@/components/ui/Controls';
import { AudioMeter } from '@/components/audio/AudioMeter';
import { CompositeOutputPreview } from '@/components/output/CompositeOutputPreview';
import { CAMERA_SHOTS } from '@/data/mock/studioData';
import { LIGHTING_PRESETS, type LightChannel, type LightingSettings } from '@/engine/lighting';
import { graphicLabel } from '@/graphics/graphicsTypes';
import { formatClock } from '@/timeline/timelineTypes';
import type { QualityMode } from '@/context/shellTypes';

const surface: React.CSSProperties = { flex: 1, minHeight: 0, background: 'var(--bg-viewport)', padding: 20, overflowY: 'auto' };
const wrap: React.CSSProperties = { maxWidth: 860, margin: '0 auto' };
const card: React.CSSProperties = { background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: 14, marginBottom: 12 };

function Title({ icon: Icon, title, subtitle }: { icon: typeof Camera; title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <Icon size={20} style={{ color: 'var(--accent-blue)' }} />
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h2>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>{subtitle}</p>
      </div>
    </div>
  );
}

/* ---------------- Cameras ---------------- */
export function CamerasWorkspace() {
  const { state, dispatch } = useShell();
  const { setCameraTracking, setTrackingSmoothing, connectTracking, disconnectTracking, trackingLabel, trackingLinked, trackingStatus } = useEditorBridge();
  const [tracking, setTracking] = useState(false);
  const [smoothing, setSmoothing] = useState(0.4);
  const [trackUrl, setTrackUrl] = useState('ws://localhost:7777');

  return (
    <div data-testid="cameras-surface" style={surface}>
      <div style={wrap}>
        <Title icon={Camera} title="Cameras" subtitle="Switch the active studio camera and drive external camera tracking (FreeD / mo-sys)." />
        <div style={card}>
          <div className="section-label" style={{ marginBottom: 8 }}>Studio Cameras</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 8 }}>
            {CAMERA_SHOTS.map((cam) => {
              const active = state.activeCameraId === cam.id;
              return (
                <button
                  key={cam.id}
                  onClick={() => dispatch({ type: 'SET_CAMERA', id: cam.id })}
                  data-testid={`camera-select-${cam.id}`}
                  style={{
                    padding: 12, borderRadius: 4, textAlign: 'left',
                    border: `2px solid ${active ? 'var(--status-ok)' : 'var(--border-subtle)'}`,
                    background: active ? 'var(--accent-blue-dim)' : 'var(--bg-panel-raised)',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Camera size={14} style={{ color: active ? 'var(--status-ok)' : 'var(--text-muted)' }} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{cam.shortLabel}</span>
                    {active && <span className="mono" style={{ fontSize: 8, marginLeft: 'auto', color: 'var(--status-ok)' }}>● LIVE</span>}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{cam.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={card}>
          <div className="section-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Crosshair size={13} /> Camera Tracking</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => { const next = !tracking; setTracking(next); setCameraTracking(next); }}
              style={{ fontSize: 10, padding: '5px 12px', borderRadius: 3, border: `1px solid ${tracking ? 'var(--accent-blue)' : 'var(--border-subtle)'}`, background: tracking ? 'var(--accent-blue-dim)' : 'var(--bg-panel-raised)', color: tracking ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
            >
              {tracking ? 'Test signal: ON' : 'Test signal: OFF'}
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-secondary)' }}>
              Smoothing
              <input type="range" min={0} max={0.97} step={0.01} value={smoothing} onChange={(e) => { const v = Number(e.target.value); setSmoothing(v); setTrackingSmoothing(v); }} style={{ width: 120, accentColor: 'var(--accent-blue)' }} />
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <input value={trackUrl} onChange={(e) => setTrackUrl(e.target.value)} placeholder="ws://host:port" aria-label="Tracking source URL" style={{ flex: 1, maxWidth: 240, fontSize: 10, height: 26 }} />
            <button
              onClick={() => { if (trackingLinked) disconnectTracking(); else connectTracking(trackUrl); }}
              style={{ fontSize: 10, height: 26, padding: '0 12px', borderRadius: 3, border: `1px solid ${trackingLinked ? 'var(--status-ok)' : trackingStatus === 'error' ? 'var(--status-error)' : 'var(--border-subtle)'}`, background: trackingLinked ? 'var(--accent-blue-dim)' : 'var(--bg-panel-raised)', color: trackingLinked ? 'var(--status-ok)' : 'var(--text-secondary)' }}
            >
              {trackingLabel}
            </button>
          </div>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 8 }}>Connects to a FreeD/mo-sys bridge over WebSocket; the live pose drives the active virtual camera.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Lighting ---------------- */
export function LightingWorkspace() {
  const { lighting, setLighting, applyPreset, activePreset } = useLighting();
  const setChannel = (key: keyof LightingSettings, patch: Partial<LightChannel>) => setLighting({ ...lighting, [key]: { ...lighting[key], ...patch } });
  const Channel = ({ id, label }: { id: keyof LightingSettings; label: string }) => (
    <div style={{ marginBottom: 12 }}>
      <div className="section-label" style={{ marginBottom: 6 }}>{label}</div>
      <Slider label="Intensity" value={Math.round(lighting[id].intensity * 100)} min={0} max={300} unit="%" onChange={(v) => setChannel(id, { intensity: v / 100 })} />
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)' }}>
        <span>Colour</span>
        <input type="color" value={lighting[id].color} onChange={(e) => setChannel(id, { color: e.currentTarget.value })} style={{ width: 44, height: 22, padding: 0, border: '1px solid var(--border-subtle)' }} aria-label={`${label} colour`} />
      </label>
    </div>
  );
  return (
    <div data-testid="lighting-surface" style={surface}>
      <div style={wrap}>
        <Title icon={Sun} title="Lighting" subtitle="Real studio lighting — key, ambient and accent. Visible in the Builder viewport and captured output." />
        <div style={card}>
          <div className="section-label" style={{ marginBottom: 6 }}>Presets</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 6 }}>
            {Object.keys(LIGHTING_PRESETS).map((name) => (
              <button key={name} onClick={() => applyPreset(LIGHTING_PRESETS[name], name)}
                style={{ padding: 8, fontSize: 10, borderRadius: 3, border: `1px solid ${activePreset === name ? 'var(--accent-blue)' : 'var(--border-subtle)'}`, background: activePreset === name ? 'var(--accent-blue-dim)' : 'var(--bg-panel-raised)', color: activePreset === name ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
                {name}
              </button>
            ))}
          </div>
        </div>
        <div style={card}>
          <Channel id="key" label="Key Light" />
          <Channel id="ambient" label="Ambient" />
          <Channel id="accent" label="Accent / Pillars" />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Audio ---------------- */
export function AudioWorkspace() {
  const { sources } = useSources();
  const liveAudio = sources.filter((s) => s.status === 'live' && s.stream && s.stream.getAudioTracks().length > 0);
  return (
    <div data-testid="audio-surface" style={surface}>
      <div style={wrap}>
        <Title icon={Volume2} title="Audio" subtitle="Live per-source audio levels, measured from each source's real audio track." />
        <div style={card}>
          {liveAudio.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              No source with a live audio track. Add a webcam or media source with audio in the <strong>Switcher</strong>; real levels appear here — never faked.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {liveAudio.map((s) => <AudioMeter key={s.id} stream={s.stream as MediaStream} label={s.name} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Outputs ---------------- */
export function OutputsWorkspace() {
  const { programSource, onAir, liveLabel, capturing, recordLabel, destinations, armedTargetCount } = useSources();
  return (
    <div data-testid="outputs-surface-full" style={surface}>
      <div style={wrap}>
        <Title icon={Radio} title="Outputs" subtitle="The real composited Program output, recording status and stream destinations." />
        <div style={card}>
          <div className="section-label" style={{ marginBottom: 8 }}>Composite Program Output</div>
          <div style={{ maxWidth: 480 }}>
            <CompositeOutputPreview active={Boolean(programSource?.stream)} sourceName={programSource?.name ?? null} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 10 }}>
            <span style={{ color: onAir ? 'var(--status-rec)' : 'var(--text-muted)' }}>● {onAir ? liveLabel : 'Off air'}</span>
            <span style={{ color: capturing ? 'var(--status-rec)' : 'var(--text-muted)' }}>● {capturing ? recordLabel : 'Not recording'}</span>
          </div>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 6 }}>Go live / record from the top toolbar. Configure destinations in the right-hand Output panel (Builder).</p>
        </div>
        <div style={card}>
          <div className="section-label" style={{ marginBottom: 8 }}>Destinations · {armedTargetCount} armed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {destinations.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.enabled ? 'var(--status-ok)' : 'var(--text-muted)' }} />
                <span style={{ flex: 1 }}>{d.name}</span>
                <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{d.enabled ? 'enabled' : 'off'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Overlays ---------------- */
export function OverlaysWorkspace() {
  const { graphics, onAirIds, setOnAir } = useGraphics();
  const { playGraphic, stopGraphic } = useEditorBridge();
  const { dispatch } = useShell();
  const ordered = [...graphics].sort((a, b) => b.layer - a.layer);
  return (
    <div data-testid="overlays-surface" style={surface}>
      <div style={wrap}>
        <Title icon={SquareStack} title="Overlays" subtitle="The live broadcast-graphics stack. Toggle each overlay on/off air; higher layers render on top." />
        <div style={card}>
          {ordered.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No graphics yet. Create lower thirds, tickers and logo bugs in the <strong>Graphics</strong> module — they appear here as a stack.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ordered.map((g) => {
                const on = onAirIds.includes(g.id);
                return (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 4, background: 'var(--bg-panel-raised)', border: `1px solid ${on ? 'var(--status-rec)' : 'var(--border-subtle)'}` }}>
                    <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)', width: 44 }}>L{g.layer} · {g.type}</span>
                    <span style={{ flex: 1, fontSize: 12 }}>{graphicLabel(g)}</span>
                    {on && <span className="mono" style={{ fontSize: 8, fontWeight: 700, color: 'var(--status-rec)' }}>ON AIR</span>}
                    <button
                      onClick={() => { const next = !on; setOnAir(g.id, next); if (next) { playGraphic(g); } else { stopGraphic(g.id); } dispatch({ type: 'SHOW_TOAST', message: `${graphicLabel(g)} — ${next ? 'ON AIR' : 'off'}` }); }}
                      style={{ fontSize: 10, padding: '4px 10px', borderRadius: 3, border: `1px solid ${on ? 'var(--status-rec)' : 'var(--border-subtle)'}`, background: on ? 'rgba(239,68,68,0.15)' : 'transparent', color: on ? 'var(--status-rec)' : 'var(--text-secondary)' }}
                    >
                      {on ? <><Square size={10} fill="currentColor" /> Off</> : 'On air'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Scripts (rundown view of timeline cues) ---------------- */
export function ScriptsWorkspace() {
  const { cues, seek, duration } = useTimeline();
  return (
    <div data-testid="scripts-surface" style={surface}>
      <div style={wrap}>
        <Title icon={ScrollText} title="Rundown" subtitle="The show rundown derived from the timeline cues. Each row fires automatically during playback." />
        <div style={card}>
          {cues.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No cues yet. Add camera / graphic cues on the <strong>Timeline</strong> (Builder) and they appear here as an ordered rundown.</div>
          ) : (
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {cues.map((c, i) => (
                <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 4, background: 'var(--bg-panel-raised)' }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', width: 24 }}>{String(i + 1).padStart(2, '0')}</span>
                  <button onClick={() => seek(c.time)} className="mono" style={{ fontSize: 10, color: 'var(--accent-blue)', background: 'transparent', width: 52, textAlign: 'left' }}>{formatClock(c.time)}</button>
                  <span style={{ flex: 1, fontSize: 12 }}>{c.label}</span>
                  <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{c.type}</span>
                </li>
              ))}
            </ol>
          )}
          <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 8 }}>Show length: {formatClock(duration)}. This is a real read-out of the timeline cue list — a scripting/automation API is a future milestone.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Settings ---------------- */
const QUALITIES: QualityMode[] = ['low', 'balanced', 'high'];
export function SettingsWorkspace() {
  const { state, dispatch } = useShell();
  return (
    <div data-testid="settings-surface" style={surface}>
      <div style={wrap}>
        <Title icon={SettingsIcon} title="Settings" subtitle="Real application preferences. Changes apply immediately." />
        <div style={card}>
          <div className="section-label" style={{ marginBottom: 8 }}>Rendering</div>
          <label style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6 }}>Quality mode</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            {QUALITIES.map((q) => (
              <button key={q} onClick={() => { dispatch({ type: 'SET_QUALITY', mode: q }); dispatch({ type: 'SHOW_TOAST', message: `Quality: ${q}` }); }}
                style={{ flex: 1, padding: 8, fontSize: 10, textTransform: 'capitalize', borderRadius: 3, border: `1px solid ${state.qualityMode === q ? 'var(--accent-blue)' : 'var(--border-subtle)'}`, background: state.qualityMode === q ? 'var(--accent-blue-dim)' : 'var(--bg-panel-raised)', color: state.qualityMode === q ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
                {q}
              </button>
            ))}
          </div>
        </div>
        <div style={card}>
          <div className="section-label" style={{ marginBottom: 8 }}>Interface</div>
          <Toggle label="Compact mode" checked={state.compactMode} onChange={() => dispatch({ type: 'TOGGLE_COMPACT' })} />
          <Toggle label="Reduced motion" checked={state.reducedMotion} onChange={() => dispatch({ type: 'TOGGLE_REDUCED_MOTION' })} />
        </div>
        <div style={card}>
          <div className="section-label" style={{ marginBottom: 8 }}>Project</div>
          <Toggle label="Automatic backup" checked={state.backupEnabled} onChange={() => dispatch({ type: 'TOGGLE_BACKUP' })} />
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 8 }}>Autosave interval: <span className="mono">{state.autosaveMinutes} min</span></div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>Active project: <span className="mono">{state.projectName}</span></div>
        </div>
      </div>
    </div>
  );
}
