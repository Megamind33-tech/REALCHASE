import { useState, useRef, useEffect } from 'react';
import { Camera, Crosshair, Volume2, Radio, SquareStack, Settings as SettingsIcon, ScrollText, Square, Sun, Boxes, Trash2 } from 'lucide-react';
import { useShell } from '@/context/ShellContext';
import { useSources } from '@/context/SourcesContext';
import { useGraphics } from '@/context/GraphicsContext';
import { useTimeline } from '@/context/TimelineContext';
import { useLighting } from '@/context/LightingContext';
import { useAr } from '@/context/ArContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { Slider, Toggle } from '@/components/ui/Controls';
import { CompositeOutputPreview } from '@/components/output/CompositeOutputPreview';
import { CAMERA_SHOTS } from '@/data/mock/studioData';
import { LIGHTING_PRESETS, type LightChannel, type LightingSettings } from '@/engine/lighting';
import { graphicLabel } from '@/graphics/graphicsTypes';
import { formatClock } from '@/timeline/timelineTypes';
import { defaultArElement, arKindLabel, arTemplateLabel, defaultFields, type ArElementKind, type ArTemplate } from '@/ar/arTypes';
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
function gainToDb(g: number): string {
  if (g <= 0.001) return '-∞';
  const db = 20 * Math.log10(g);
  return `${db >= 0 ? '+' : ''}${db.toFixed(1)}`;
}

/** A single mixer channel strip with a real post-fader meter. */
function ChannelStrip({ id, name }: { id: string; name: string }) {
  const { audioParams, setChannelParams, getChannelLevel } = useSources();
  const p = audioParams(id);
  const fillRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pct = Math.min(100, getChannelLevel(id) * 180);
      if (fillRef.current) {
        fillRef.current.style.height = `${pct}%`;
        fillRef.current.style.background = pct > 85 ? 'var(--status-error)' : pct > 65 ? 'var(--status-warn)' : 'var(--status-ok)';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [id, getChannelLevel]);

  return (
    <div data-testid={`mixer-channel-${id}`} style={{ width: 92, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 10, background: 'var(--bg-panel-raised)', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
      <span style={{ fontSize: 10, fontWeight: 600, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</span>
      <div style={{ display: 'flex', gap: 8, height: 130 }}>
        <input
          type="range" min={0} max={1.5} step={0.01} value={p.gain}
          onChange={(e) => setChannelParams(id, { gain: Number(e.currentTarget.value) })}
          aria-label={`${name} fader`}
          style={{ writingMode: 'vertical-lr', direction: 'rtl', width: 24, accentColor: 'var(--accent-blue)' } as React.CSSProperties}
        />
        <div style={{ width: 8, height: '100%', background: 'var(--bg-app)', borderRadius: 2, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
          <div ref={fillRef} style={{ width: '100%', height: '0%', background: 'var(--status-ok)' }} />
        </div>
      </div>
      <span className="mono" style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{gainToDb(p.gain)} dB</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => setChannelParams(id, { muted: !p.muted })} aria-pressed={p.muted} title="Mute"
          style={{ width: 26, height: 22, fontSize: 9, fontWeight: 700, borderRadius: 3, border: `1px solid ${p.muted ? 'var(--status-rec)' : 'var(--border-subtle)'}`, background: p.muted ? 'rgba(239,68,68,0.2)' : 'transparent', color: p.muted ? 'var(--status-rec)' : 'var(--text-secondary)' }}>M</button>
        <button onClick={() => setChannelParams(id, { solo: !p.solo })} aria-pressed={p.solo} title="Solo"
          style={{ width: 26, height: 22, fontSize: 9, fontWeight: 700, borderRadius: 3, border: `1px solid ${p.solo ? 'var(--status-warn)' : 'var(--border-subtle)'}`, background: p.solo ? 'rgba(234,179,8,0.2)' : 'transparent', color: p.solo ? 'var(--status-warn)' : 'var(--text-secondary)' }}>S</button>
      </div>
    </div>
  );
}

export function AudioWorkspace() {
  const { sources, masterGain, setMasterGain, getMasterLevel } = useSources();
  const liveAudio = sources.filter((s) => s.status === 'live' && s.stream && s.stream.getAudioTracks().length > 0);
  const masterFill = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pct = Math.min(100, getMasterLevel() * 180);
      if (masterFill.current) {
        masterFill.current.style.height = `${pct}%`;
        masterFill.current.style.background = pct > 85 ? 'var(--status-error)' : pct > 65 ? 'var(--status-warn)' : 'var(--status-ok)';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getMasterLevel]);

  return (
    <div data-testid="audio-surface" style={surface}>
      <div style={wrap}>
        <Title icon={Volume2} title="Audio Mixer" subtitle="Real per-source faders, mute and solo. The master bus is what gets recorded and streamed." />
        <div style={card}>
          {liveAudio.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              No source with a live audio track. Add a webcam or media source with audio in the <strong>Switcher</strong>; channel strips appear here and feed the master mix — never faked.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
              {liveAudio.map((s) => <ChannelStrip key={s.id} id={s.id} name={s.name} />)}
              {/* Master strip */}
              <div style={{ width: 100, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 10, background: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)', borderRadius: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-blue)' }}>MASTER</span>
                <div style={{ display: 'flex', gap: 8, height: 130 }}>
                  <input type="range" min={0} max={1.5} step={0.01} value={masterGain} onChange={(e) => setMasterGain(Number(e.currentTarget.value))} aria-label="Master fader"
                    style={{ writingMode: 'vertical-lr', direction: 'rtl', width: 24, accentColor: 'var(--accent-blue)' } as React.CSSProperties} />
                  <div style={{ width: 8, height: '100%', background: 'var(--bg-app)', borderRadius: 2, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
                    <div ref={masterFill} style={{ width: '100%', height: '0%', background: 'var(--status-ok)' }} />
                  </div>
                </div>
                <span className="mono" style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{gainToDb(masterGain)} dB</span>
              </div>
            </div>
          )}
          <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 10 }}>Faders, mute and solo apply to the real Web Audio mix bus that is recorded and published — meters are post-fader RMS.</p>
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

/* ---------------- Broadcast AR ---------------- */
const AR_KINDS: ArElementKind[] = ['card', 'text', 'box', 'sphere', 'cylinder'];

function ArVec3({ label, values, step, toDeg, onChange }: { label: string; values: [number, number, number]; step: number; toDeg?: boolean; onChange: (v: [number, number, number]) => void }) {
  const f = toDeg ? 180 / Math.PI : 1;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>{label}{toDeg ? ' (°)' : ''}</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {(['X', 'Y', 'Z'] as const).map((axis, i) => (
          <input key={axis} type="number" step={step} value={Math.round(values[i] * f * 1000) / 1000}
            aria-label={`${label} ${axis}`}
            onChange={(e) => { const next: [number, number, number] = [...values]; const n = parseFloat(e.currentTarget.value); if (Number.isFinite(n)) { next[i] = n / f; onChange(next); } }}
            style={{ width: '33%', minWidth: 0, fontSize: 9, padding: '2px 4px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 2, color: 'var(--text-primary)' }} />
        ))}
      </div>
    </div>
  );
}

export function ArWorkspace() {
  const { elements, selectedId, addElement, removeElement, patchElement, selectElement, setOnAir } = useAr();
  const { dispatch } = useShell();
  const selected = elements.find((e) => e.id === selectedId) ?? null;

  return (
    <div data-testid="ar-surface" style={{ flex: 1, minHeight: 0, background: 'var(--bg-viewport)', display: 'flex' }}>
      <div className="scroll-y" style={{ width: 290, borderRight: '1px solid var(--border-subtle)', padding: 12, flexShrink: 0 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Broadcast AR</h2>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 10px' }}>
          Virtual AR elements anchored in the studio world. Put one ON AIR and it is composited into the Program output, staying locked to the set as the tracked camera moves. Switch to <strong>Builder</strong> to see them in the scene.
        </p>
        <div className="section-label" style={{ marginBottom: 6 }}>Add AR element</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 4, marginBottom: 14 }}>
          {AR_KINDS.map((k) => (
            <button key={k} data-testid={`add-ar-${k}`} onClick={() => addElement(defaultArElement(k))}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px', border: '1px solid var(--border-subtle)', borderRadius: 4, background: 'var(--bg-panel)', color: 'var(--text-primary)', fontSize: 11 }}>
              <Boxes size={13} style={{ color: 'var(--accent-blue)' }} /> {arKindLabel(k)}
            </button>
          ))}
        </div>
        <div className="section-label" style={{ marginBottom: 6 }}>Elements ({elements.length})</div>
        {elements.length === 0 ? (
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>No AR elements yet — add one above.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {elements.map((e) => {
              const sel = e.id === selectedId;
              return (
                <div key={e.id} data-testid={`ar-row-${e.id}`} onClick={() => selectElement(e.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', cursor: 'pointer', borderRadius: 4,
                    border: `1px solid ${sel ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    borderLeft: `3px solid ${e.onAir ? 'var(--status-rec)' : sel ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    background: sel ? 'var(--accent-blue-dim)' : 'var(--bg-panel)' }}>
                  <span style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label || arKindLabel(e.kind)}</span>
                  {e.onAir && <span className="mono" style={{ fontSize: 8, fontWeight: 700, color: 'var(--status-rec)' }}>ON AIR</span>}
                  <button onClick={(ev) => { ev.stopPropagation(); setOnAir(e.id, !e.onAir); dispatch({ type: 'SHOW_TOAST', message: `${e.label || arKindLabel(e.kind)} — ${!e.onAir ? 'ON AIR' : 'off'}` }); }}
                    title={e.onAir ? 'Take off air' : 'Put on air'}
                    style={{ width: 24, height: 22, fontSize: 8, fontWeight: 700, borderRadius: 3, border: `1px solid ${e.onAir ? 'var(--status-rec)' : 'var(--border-subtle)'}`, background: e.onAir ? 'rgba(239,68,68,0.15)' : 'transparent', color: e.onAir ? 'var(--status-rec)' : 'var(--text-secondary)' }}>
                    {e.onAir ? <Square size={10} fill="currentColor" /> : 'AIR'}
                  </button>
                  <button onClick={(ev) => { ev.stopPropagation(); removeElement(e.id); }} aria-label={`Delete ${e.label}`} style={{ width: 22, height: 22, color: 'var(--text-muted)' }}><Trash2 size={12} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="scroll-y" style={{ flex: 1, padding: 16, minWidth: 0 }}>
        {selected ? (
          <div style={{ maxWidth: 380 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{arKindLabel(selected.kind)}</h3>
              <button onClick={() => setOnAir(selected.id, !selected.onAir)} data-testid="ar-air-toggle"
                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 3, border: `1px solid ${selected.onAir ? 'var(--status-rec)' : 'var(--border-subtle)'}`, background: selected.onAir ? 'rgba(239,68,68,0.15)' : 'var(--bg-panel-raised)', color: selected.onAir ? 'var(--status-rec)' : 'var(--text-secondary)' }}>
                {selected.onAir ? 'Take Off Air' : 'Put On Air'}
              </button>
            </div>
            {(selected.kind === 'card' || selected.kind === 'text') && (
              <label style={{ display: 'block', marginBottom: 8 }}>
                <span style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>{selected.template === 'clock' ? 'Caption' : 'Label'}</span>
                <input value={selected.label} onChange={(e) => patchElement(selected.id, { label: e.currentTarget.value })} aria-label="AR label"
                  style={{ width: '100%', fontSize: 11, padding: '4px 6px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 3, color: 'var(--text-primary)' }} />
              </label>
            )}

            {selected.kind === 'card' && (
              <>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <span style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>Data template</span>
                  <select value={selected.template ?? 'plain'} aria-label="AR template"
                    onChange={(e) => { const t = e.currentTarget.value as ArTemplate; patchElement(selected.id, { template: t, fields: defaultFields(t) }); }}
                    style={{ width: '100%', fontSize: 11, padding: '4px 6px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 3, color: 'var(--text-primary)' }}>
                    {(['plain', 'stat', 'scorebug', 'clock'] as ArTemplate[]).map((t) => <option key={t} value={t}>{arTemplateLabel(t)}</option>)}
                  </select>
                </label>
                {selected.template === 'clock' && (
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 8 }}>Live data — the card shows the current time and updates every second on air.</div>
                )}
                {selected.template && selected.template !== 'plain' && selected.template !== 'clock' && (
                  <div style={{ marginBottom: 8 }}>
                    {Object.keys(selected.fields ?? defaultFields(selected.template)).map((key) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ width: 80, fontSize: 9, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{key}</span>
                        <input value={(selected.fields ?? {})[key] ?? ''} aria-label={`AR field ${key}`}
                          onChange={(e) => patchElement(selected.id, { fields: { ...(selected.fields ?? {}), [key]: e.currentTarget.value } })}
                          style={{ flex: 1, fontSize: 11, padding: '3px 6px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 3, color: 'var(--text-primary)' }} />
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 10 }}>
              <span>Colour</span>
              <input type="color" value={selected.color} onChange={(e) => patchElement(selected.id, { color: e.currentTarget.value })} style={{ width: 44, height: 22, padding: 0, border: '1px solid var(--border-subtle)' }} aria-label="AR colour" />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--text-secondary)', marginBottom: 10 }}>
              <input type="checkbox" checked={!!selected.anchorToFloor} onChange={(e) => patchElement(selected.id, { anchorToFloor: e.currentTarget.checked })} aria-label="Anchor to floor" />
              Anchor to studio floor (planted with contact ring)
            </label>
            <ArVec3 label="Position" step={0.1} values={selected.position} onChange={(v) => patchElement(selected.id, { position: v })} />
            <ArVec3 label="Rotation" step={1} toDeg values={selected.rotation} onChange={(v) => patchElement(selected.id, { rotation: v })} />
            <ArVec3 label="Scale" step={0.1} values={selected.scaling} onChange={(v) => patchElement(selected.id, { scaling: v })} />
            <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 8 }}>Anchored in world space — under FreeD camera tracking it stays locked to the set. On-air elements appear in the recorded/streamed Program output.</p>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Select or add an AR element.</div>
        )}
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
