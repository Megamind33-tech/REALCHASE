import {
  SkipBack, Play, Pause, SkipForward, Circle, Repeat, Minimize2,
} from 'lucide-react';
import { IconButton } from '@/components/ui/Button';
import { useShell } from '@/context/ShellContext';
import { useSceneNodes } from '@/context/EditorBridgeContext';

const layerColors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#eab308', '#22c55e', '#64748b'];

export function Timeline() {
  const { state, dispatch } = useShell();
  const sceneNodes = useSceneNodes();

  if (state.activeModule !== 'builder') return null;

  const collapsed = state.timelineCollapsed;
  const trackWidth = `${state.timelineZoom}%`;
  const layers = sceneNodes.map((node, index) => ({
    id: node.id,
    name: node.name,
    color: layerColors[index % layerColors.length],
    keyframes: [] as number[],
  }));

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
        <span className="mono" style={{ fontSize: 12, fontWeight: 500, minWidth: 90 }}>
          {state.timecode}
        </span>
        {!collapsed && (
          <>
            <div style={{ flex: 1, height: 12, background: 'var(--bg-app)', borderRadius: 2, position: 'relative' }}>
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${i * 5}%`,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: i % 5 === 0 ? 'var(--border-active)' : 'var(--border-subtle)',
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
              Transitions · Not wired yet
            </span>
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
            <div
              style={{
                width: 120,
                borderRight: '1px solid var(--border-subtle)',
                overflowY: 'auto',
                flexShrink: 0,
              }}
            >
              {layers.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => dispatch({ type: 'SET_LAYER', id: layer.id })}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    textAlign: 'left',
                    fontSize: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: state.selectedLayerId === layer.id ? 'var(--accent-blue-dim)' : 'transparent',
                    color: state.selectedLayerId === layer.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    borderLeft: state.selectedLayerId === layer.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: 1, background: layer.color, flexShrink: 0 }} />
                  {layer.name}
                </button>
              ))}
            </div>

            <div className="scroll-y" style={{ flex: 1, padding: '4px 8px' }}>
              {layers.map((layer) => (
                <div key={layer.id} style={{ height: 22, marginBottom: 2, position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '8%',
                      width: trackWidth,
                      maxWidth: '75%',
                      height: 16,
                      top: 3,
                      background: `${layer.color}44`,
                      border: `1px solid ${layer.color}`,
                      borderRadius: 2,
                    }}
                  />
                  {layer.keyframes.map((kf) => (
                    <div
                      key={kf}
                      style={{
                        position: 'absolute',
                        left: `${kf * 0.8}%`,
                        top: 6,
                        width: 8,
                        height: 8,
                        background: '#fff',
                        transform: 'rotate(45deg)',
                        border: `1px solid ${layer.color}`,
                      }}
                      title={`Keyframe at ${kf}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              height: 28,
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
              borderTop: '1px solid var(--border-subtle)',
              gap: 4,
            }}
          >
            <IconButton label="Jump to start — not wired yet" disabled><SkipBack size={14} /></IconButton>
            <IconButton label="Timeline transport — not wired yet" disabled>
              {state.isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </IconButton>
            <IconButton label="Next — not wired yet" disabled><SkipForward size={14} /></IconButton>
            <IconButton label="Record cue — requires recording engine" disabled>
              <Circle size={14} />
            </IconButton>
            <IconButton label="Loop — not wired yet" disabled><Repeat size={14} /></IconButton>

            <div style={{ flex: 1 }} />

            <span style={{ fontSize: 9, color: 'var(--text-muted)', marginRight: 4 }}>Timeline transport disabled until real playback/editing</span>
            <input
              type="range"
              min={50}
              max={200}
              value={state.timelineZoom}
              onChange={(e) => dispatch({ type: 'SET_TIMELINE_ZOOM', zoom: Number(e.target.value) })}
              style={{ width: 80, accentColor: 'var(--accent-blue)' }}
            />
          </div>
        </>
      )}
    </div>
  );
}
