import { useEffect } from 'react';
import { Plus, Trash2, Type, Megaphone, BadgeCheck, Radio, Square } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useShell } from '@/context/ShellContext';
import { useGraphics } from '@/context/GraphicsContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import {
  defaultGraphic, graphicLabel, type Corner, type GraphicItem, type GraphicType,
} from '@/graphics/graphicsTypes';

const TYPE_META: Record<GraphicType, { label: string; icon: typeof Type; hint: string }> = {
  lowerThird: { label: 'Lower Third', icon: Type, hint: 'Name strap — title + subtitle' },
  ticker: { label: 'Ticker', icon: Megaphone, hint: 'Scrolling headline crawl' },
  logoBug: { label: 'Logo Bug', icon: BadgeCheck, hint: 'Corner watermark' },
};

const CORNERS: { id: Corner; label: string }[] = [
  { id: 'tl', label: 'Top Left' },
  { id: 'tr', label: 'Top Right' },
  { id: 'bl', label: 'Bottom Left' },
  { id: 'br', label: 'Bottom Right' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 8 }}>
      <span style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 11, padding: '4px 6px',
  background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)',
  borderRadius: 3, color: 'var(--text-primary)',
};

function Editor({ item, onPatch, onLiveUpdate }: { item: GraphicItem; onPatch: (patch: Partial<GraphicItem>) => void; onLiveUpdate: () => void }) {
  const patch = (p: Partial<GraphicItem>) => { onPatch(p); };
  // After any field change, push a live CG UPDATE so on-air graphics reflect it.
  useEffect(() => { onLiveUpdate(); }, [item, onLiveUpdate]);

  return (
    <div data-testid="graphic-editor">
      {item.type === 'lowerThird' && (
        <>
          <Field label="Title">
            <input style={inputStyle} value={item.title ?? ''} onChange={(e) => patch({ title: e.currentTarget.value })} aria-label="Lower third title" />
          </Field>
          <Field label="Subtitle">
            <input style={inputStyle} value={item.subtitle ?? ''} onChange={(e) => patch({ subtitle: e.currentTarget.value })} aria-label="Lower third subtitle" />
          </Field>
        </>
      )}

      {item.type === 'ticker' && (
        <>
          <Field label="Ticker text">
            <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }} value={item.tickerText ?? ''} onChange={(e) => patch({ tickerText: e.currentTarget.value })} aria-label="Ticker text" />
          </Field>
          <Field label={`Scroll speed · ${item.tickerSpeed ?? 90} px/s`}>
            <input type="range" min={20} max={300} step={5} value={item.tickerSpeed ?? 90} onChange={(e) => patch({ tickerSpeed: Number(e.currentTarget.value) })} style={{ width: '100%', accentColor: 'var(--accent-blue)' }} aria-label="Ticker speed" />
          </Field>
        </>
      )}

      {item.type === 'logoBug' && (
        <>
          <Field label="Logo text">
            <input style={inputStyle} value={item.logoText ?? ''} onChange={(e) => patch({ logoText: e.currentTarget.value })} aria-label="Logo text" />
          </Field>
          <Field label="Corner">
            <select style={inputStyle} value={item.corner ?? 'tr'} onChange={(e) => patch({ corner: e.currentTarget.value as Corner })} aria-label="Logo corner">
              {CORNERS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label={`Opacity · ${Math.round((item.opacity ?? 0.85) * 100)}%`}>
            <input type="range" min={0.1} max={1} step={0.05} value={item.opacity ?? 0.85} onChange={(e) => patch({ opacity: Number(e.currentTarget.value) })} style={{ width: '100%', accentColor: 'var(--accent-blue)' }} aria-label="Logo opacity" />
          </Field>
        </>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Accent color">
          <input type="color" value={item.accentColor} onChange={(e) => patch({ accentColor: e.currentTarget.value })} style={{ width: 44, height: 26, padding: 0, border: '1px solid var(--border-subtle)' }} aria-label="Accent color" />
        </Field>
        <Field label={`Animation · ${item.animDuration.toFixed(1)}s`}>
          <input type="range" min={0.2} max={2} step={0.1} value={item.animDuration} onChange={(e) => patch({ animDuration: Number(e.currentTarget.value) })} style={{ width: 120, accentColor: 'var(--accent-blue)' }} aria-label="Animation duration" />
        </Field>
      </div>
    </div>
  );
}

export function GraphicsPanel() {
  const { state, dispatch } = useShell();
  const { graphics, selectedId, addGraphic, removeGraphic, patchGraphic, selectGraphic, setOnAir, isOnAir } = useGraphics();
  const { playGraphic, stopGraphic, updateGraphic } = useEditorBridge();
  const selected = graphics.find((g) => g.id === selectedId) ?? null;

  const handleAdd = (type: GraphicType) => {
    const item = defaultGraphic(type, graphics.length + 1);
    addGraphic(item);
  };

  const handleToggleAir = (item: GraphicItem) => {
    if (!state.engineReady) {
      dispatch({ type: 'SHOW_TOAST', message: 'Graphics engine not ready yet' });
      return;
    }
    const next = !isOnAir(item.id);
    setOnAir(item.id, next);
    if (next) {
      playGraphic(item);
      dispatch({ type: 'SHOW_TOAST', message: `${graphicLabel(item)} — ON AIR` });
    } else {
      stopGraphic(item.id);
      dispatch({ type: 'SHOW_TOAST', message: `${graphicLabel(item)} — off` });
    }
  };

  const handleLiveUpdate = () => {
    if (selected && isOnAir(selected.id)) updateGraphic(selected);
  };

  return (
    <div data-testid="graphics-surface" style={{ flex: 1, minHeight: 0, background: 'var(--bg-viewport)', display: 'flex' }}>
      {/* Graphic list + creation */}
      <div className="scroll-y" style={{ width: 280, borderRight: '1px solid var(--border-subtle)', padding: 12, flexShrink: 0 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Broadcast Graphics</h2>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 10px' }}>
          Templates play onto the live program as a real overlay. On-air graphics appear in the rendered output.
        </p>

        <div className="section-label" style={{ marginBottom: 6 }}>Add graphic</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
          {(Object.keys(TYPE_META) as GraphicType[]).map((type) => {
            const { label, icon: Icon, hint } = TYPE_META[type];
            return (
              <button
                key={type}
                onClick={() => handleAdd(type)}
                data-testid={`add-graphic-${type}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  border: '1px solid var(--border-subtle)', borderRadius: 4,
                  background: 'var(--bg-panel)', color: 'var(--text-primary)', textAlign: 'left',
                }}
                title={hint}
              >
                <Icon size={15} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{hint}</span>
                </span>
                <Plus size={13} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
              </button>
            );
          })}
        </div>

        <div className="section-label" style={{ marginBottom: 6 }}>Graphics ({graphics.length})</div>
        {graphics.length === 0 ? (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '8px 0' }}>No graphics yet — add one above.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {graphics.map((g) => {
              const air = isOnAir(g.id);
              const isSel = g.id === selectedId;
              const Icon = TYPE_META[g.type].icon;
              return (
                <div
                  key={g.id}
                  data-testid={`graphic-row-${g.id}`}
                  onClick={() => selectGraphic(g.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', cursor: 'pointer',
                    border: `1px solid ${isSel ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    borderLeft: `3px solid ${air ? 'var(--status-rec)' : isSel ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    borderRadius: 4, background: isSel ? 'var(--accent-blue-dim)' : 'var(--bg-panel)',
                  }}
                >
                  <Icon size={13} style={{ color: air ? 'var(--status-rec)' : 'var(--text-secondary)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{graphicLabel(g)}</span>
                  {air && <span className="mono" style={{ fontSize: 8, fontWeight: 700, color: 'var(--status-rec)' }}>ON AIR</span>}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleAir(g); }}
                    title={air ? 'Take off air' : 'Play on air'}
                    aria-label={air ? `Take ${graphicLabel(g)} off air` : `Play ${graphicLabel(g)} on air`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22,
                      borderRadius: 3, border: `1px solid ${air ? 'var(--status-rec)' : 'var(--border-subtle)'}`,
                      background: air ? 'rgba(239,68,68,0.15)' : 'transparent', color: air ? 'var(--status-rec)' : 'var(--text-secondary)',
                    }}
                  >
                    {air ? <Square size={11} fill="currentColor" /> : <Radio size={12} />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (isOnAir(g.id)) stopGraphic(g.id); removeGraphic(g.id); }}
                    aria-label={`Delete ${graphicLabel(g)}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="scroll-y" style={{ flex: 1, padding: 16, minWidth: 0 }}>
        {selected ? (
          <div style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{TYPE_META[selected.type].label}</h3>
              <Button
                variant={isOnAir(selected.id) ? 'danger' : 'secondary'}
                onClick={() => handleToggleAir(selected)}
                data-testid="editor-air-toggle"
              >
                {isOnAir(selected.id) ? <><Square size={12} fill="currentColor" /> Take Off Air</> : <><Radio size={13} /> Play On Air</>}
              </Button>
            </div>
            <Editor
              item={selected}
              onPatch={(p) => patchGraphic(selected.id, p)}
              onLiveUpdate={handleLiveUpdate}
            />
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
              Edits to an on-air graphic update it live (CG UPDATE). Switch to the <strong>Builder</strong> to see the overlay on the rendered scene.
            </p>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            Select or add a graphic to edit it.
          </div>
        )}
      </div>
    </div>
  );
}
