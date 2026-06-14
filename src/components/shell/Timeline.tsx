import { useRef } from 'react';
import {
  SkipBack, Play, Pause, Square, ChevronLeft, ChevronRight, Repeat, Minimize2,
  Type, Camera, Trash2,
} from 'lucide-react';
import { IconButton } from '@/components/ui/Button';
import { useShell } from '@/context/ShellContext';
import { useSceneNodes } from '@/context/EditorBridgeContext';
import { useTimeline } from '@/context/TimelineContext';
import { useGraphics } from '@/context/GraphicsContext';
import { formatTimecode, formatClock, makeCueId, type Cue, type CueType } from '@/timeline/timelineTypes';

const layerColors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#eab308', '#22c55e', '#64748b'];

const CUE_COLOR: Record<CueType, string> = {
  graphicOn: 'var(--status-ok)',
  graphicOff: 'var(--text-muted)',
  cameraSwitch: 'var(--accent-blue)',
};

export function Timeline() {
  const { state, dispatch } = useShell();
  const sceneNodes = useSceneNodes();
  const {
    playhead, duration, isPlaying, loop, fps, cues,
    togglePlay, stop, seek, stepBy, setLoop, addCue, removeCue,
  } = useTimeline();
  const { graphics, selectedId } = useGraphics();
  const rulerRef = useRef<HTMLDivElement>(null);

  if (state.activeModule !== 'builder') return null;

  const collapsed = state.timelineCollapsed;
  const pct = (t: number) => `${(t / duration) * 100}%`;
  const selectedGraphic = graphics.find((g) => g.id === selectedId) ?? null;

  const seekFromEvent = (clientX: number) => {
    const el = rulerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  const addGraphicCue = (type: 'graphicOn' | 'graphicOff') => {
    if (!selectedGraphic) {
      dispatch({ type: 'SHOW_TOAST', message: 'Select a graphic in the Graphics module first' });
      return;
    }
    const cue: Cue = {
      id: makeCueId(),
      time: playhead,
      type,
      targetId: selectedGraphic.id,
      label: `${type === 'graphicOn' ? 'Show' : 'Hide'} ${selectedGraphic.title || selectedGraphic.logoText || selectedGraphic.type}`,
    };
    addCue(cue);
    dispatch({ type: 'SHOW_TOAST', message: `Cue: ${cue.label} @ ${formatClock(playhead)}` });
  };

  const addCameraCue = () => {
    const cue: Cue = {
      id: makeCueId(),
      time: playhead,
      type: 'cameraSwitch',
      targetId: state.activeCameraId,
      label: `Cut to ${state.activeCameraId.toUpperCase()}`,
    };
    addCue(cue);
    dispatch({ type: 'SHOW_TOAST', message: `Cue: ${cue.label} @ ${formatClock(playhead)}` });
  };

  return (
    <div
      style={{
        height: collapsed ? 28 : 'var(--timeline-h)',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-panel)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'height var(--transition-fast)',
      }}
    >
      {/* Header: timecode + scrubbable ruler */}
      <div
        style={{
          height: 28,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)',
          gap: 12,
        }}
        onDoubleClick={() => dispatch({ type: 'TOGGLE_TIMELINE' })}
      >
        <span className="mono" data-testid="timeline-timecode" style={{ fontSize: 12, fontWeight: 600, minWidth: 96, color: isPlaying ? 'var(--status-rec)' : 'var(--text-primary)' }}>
          {formatTimecode(playhead, fps)}
        </span>
        {!collapsed && (
          <>
            <div
              ref={rulerRef}
              data-testid="timeline-ruler"
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seekFromEvent(e.clientX); }}
              onPointerMove={(e) => { if (e.buttons === 1) seekFromEvent(e.clientX); }}
              style={{ flex: 1, height: 16, background: 'var(--bg-app)', borderRadius: 2, position: 'relative', cursor: 'pointer' }}
            >
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} style={{ position: 'absolute', left: `${i * 10}%`, top: 0, bottom: 0, width: 1, background: 'var(--border-subtle)' }} />
              ))}
              {/* Cue markers */}
              {cues.map((c) => (
                <div
                  key={c.id}
                  title={`${c.label} @ ${formatClock(c.time)}`}
                  style={{ position: 'absolute', left: pct(c.time), top: 0, bottom: 0, width: 2, background: CUE_COLOR[c.type], transform: 'translateX(-1px)' }}
                />
              ))}
              {/* Playhead */}
              <div data-testid="timeline-playhead" style={{ position: 'absolute', left: pct(playhead), top: -2, bottom: -2, width: 2, background: 'var(--status-rec)', transform: 'translateX(-1px)', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: -3, left: -3, width: 8, height: 8, borderRadius: '50%', background: 'var(--status-rec)' }} />
              </div>
            </div>
            <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{formatClock(duration)}</span>
          </>
        )}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_TIMELINE' })}
          aria-label={collapsed ? 'Expand timeline' : 'Collapse timeline'}
          style={{ color: 'var(--text-muted)' }}
        >
          <Minimize2 size={12} />
        </button>
      </div>

      {!collapsed && (
        <>
          <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
            {/* Layer / object rail */}
            <div style={{ width: 120, borderRight: '1px solid var(--border-subtle)', overflowY: 'auto', flexShrink: 0 }}>
              {sceneNodes.map((node, index) => (
                <button
                  key={node.id}
                  onClick={() => dispatch({ type: 'SET_LAYER', id: node.id })}
                  style={{
                    width: '100%', padding: '4px 8px', textAlign: 'left', fontSize: 10,
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: state.selectedLayerId === node.id ? 'var(--accent-blue-dim)' : 'transparent',
                    color: state.selectedLayerId === node.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    borderLeft: state.selectedLayerId === node.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: 1, background: layerColors[index % layerColors.length], flexShrink: 0 }} />
                  {node.name}
                </button>
              ))}
            </div>

            {/* Cue list */}
            <div className="scroll-y" style={{ flex: 1, padding: '6px 8px' }}>
              <div className="section-label" style={{ marginBottom: 4 }}>Cues ({cues.length})</div>
              {cues.length === 0 ? (
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  No cues. Move the playhead, then add a camera or graphic cue below — they fire automatically during playback.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {cues.map((c) => (
                    <div
                      key={c.id}
                      data-testid={`cue-${c.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--bg-panel-raised)', border: '1px solid var(--border-subtle)' }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: 1, background: CUE_COLOR[c.type], flexShrink: 0 }} />
                      <button onClick={() => seek(c.time)} className="mono" title="Jump to cue" style={{ color: 'var(--text-secondary)', background: 'transparent' }}>{formatClock(c.time)}</button>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                      <button onClick={() => removeCue(c.id)} aria-label={`Delete cue ${c.label}`} style={{ color: 'var(--text-muted)' }}><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transport */}
          <div style={{ height: 30, display: 'flex', alignItems: 'center', padding: '0 8px', borderTop: '1px solid var(--border-subtle)', gap: 4 }}>
            <IconButton label="Jump to start" onClick={() => seek(0)}><SkipBack size={14} /></IconButton>
            <IconButton label="Step back 1s" onClick={() => stepBy(-1)}><ChevronLeft size={14} /></IconButton>
            <IconButton label={isPlaying ? 'Pause' : 'Play'} active={isPlaying} onClick={() => togglePlay()}>
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </IconButton>
            <IconButton label="Stop (return to start)" onClick={() => stop()}><Square size={13} /></IconButton>
            <IconButton label="Step forward 1s" onClick={() => stepBy(1)}><ChevronRight size={14} /></IconButton>
            <IconButton label={loop ? 'Loop on' : 'Loop off'} active={loop} onClick={() => setLoop(!loop)}><Repeat size={14} /></IconButton>

            <div style={{ width: 1, height: 16, background: 'var(--border-subtle)', margin: '0 4px' }} />

            {/* Cue authoring at the playhead */}
            <button
              onClick={addCameraCue}
              data-testid="add-camera-cue"
              title="Add a camera-cut cue at the playhead (uses the current active camera)"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border-subtle)', background: 'var(--bg-panel-raised)', color: 'var(--text-secondary)' }}
            >
              <Camera size={12} /> + Camera
            </button>
            <button
              onClick={() => addGraphicCue('graphicOn')}
              data-testid="add-graphic-on-cue"
              title={selectedGraphic ? `Add a 'show ${selectedGraphic.type}' cue at the playhead` : 'Select a graphic in the Graphics module first'}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border-subtle)', background: 'var(--bg-panel-raised)', color: selectedGraphic ? 'var(--status-ok)' : 'var(--text-muted)' }}
            >
              <Type size={12} /> + Gfx On
            </button>
            <button
              onClick={() => addGraphicCue('graphicOff')}
              data-testid="add-graphic-off-cue"
              title={selectedGraphic ? `Add a 'hide ${selectedGraphic.type}' cue at the playhead` : 'Select a graphic in the Graphics module first'}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border-subtle)', background: 'var(--bg-panel-raised)', color: selectedGraphic ? 'var(--text-secondary)' : 'var(--text-muted)' }}
            >
              <Type size={12} /> + Gfx Off
            </button>

            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Cues fire live during playback &amp; scrub</span>
          </div>
        </>
      )}
    </div>
  );
}
