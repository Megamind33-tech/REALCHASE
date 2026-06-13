import {
  Box, Move, RotateCw, Maximize2, Focus, Grid3x3, RectangleHorizontal,
  AlertTriangle,
} from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { useShell } from '@/context/ShellContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { ViewportCanvas } from '@/components/viewport/ViewportCanvas';
import type { QualityMode, TransformMode } from '@/context/shellTypes';

const QUALITY_MODES: QualityMode[] = ['low', 'balanced', 'high'];
const TRANSFORM_MODES: { id: TransformMode; icon: typeof Box; label: string }[] = [
  { id: 'select', icon: Box, label: 'Select' },
  { id: 'translate', icon: Move, label: 'Translate' },
  { id: 'rotate', icon: RotateCw, label: 'Rotate' },
  { id: 'scale', icon: Maximize2, label: 'Scale' },
];

export function Viewport() {
  const { state, dispatch } = useShell();
  const { engine } = useEditorBridge();

  if (state.activeModule !== 'builder') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-viewport)',
          color: 'var(--text-muted)',
          fontSize: 12,
        }}
      >
        {state.activeModule.charAt(0).toUpperCase() + state.activeModule.slice(1)} module — workspace coming in next milestone
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg-viewport)' }}>
      <div
        style={{
          height: 32,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          gap: 8,
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-panel)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', border: '1px solid var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
          {(['3d', '2d'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => dispatch({ type: 'SET_VIEWPORT_MODE', mode })}
              style={{
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                background: state.viewportMode === mode ? 'var(--accent-blue-dim)' : 'transparent',
                color: state.viewportMode === mode ? 'var(--accent-blue)' : 'var(--text-secondary)',
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        <select
          value={state.activeCameraId}
          onChange={(e) => dispatch({ type: 'SET_CAMERA', id: e.target.value })}
          style={{ fontSize: 10, padding: '2px 6px' }}
          aria-label="Camera selector"
        >
          <option value="cam1">Main Camera (Wide)</option>
          <option value="cam2">Desk Camera</option>
          <option value="cam3">Left Wall</option>
          <option value="cam4">Right Wall</option>
          <option value="cam5">Ceiling</option>
          <option value="cam6">Floor Ring</option>
        </select>

        <div style={{ display: 'flex', gap: 2 }}>
          {TRANSFORM_MODES.map(({ id, icon: Icon, label }) => (
            <IconButton
              key={id}
              label={label}
              active={state.transformMode === id}
              onClick={() => dispatch({ type: 'SET_TRANSFORM_MODE', mode: id })}
            >
              <Icon size={14} />
            </IconButton>
          ))}
          <IconButton
            label="Focus selection"
            onClick={() => engine?.focusSelection()}
          >
            <Focus size={14} />
          </IconButton>
          <IconButton label="Toggle grid" onClick={() => dispatch({ type: 'SHOW_TOAST', message: 'Grid toggle — editor integration' })}>
            <Grid3x3 size={14} />
          </IconButton>
          <IconButton
            label="Safe area guides"
            active={state.showSafeArea}
            onClick={() => dispatch({ type: 'TOGGLE_SAFE_AREA' })}
          >
            <RectangleHorizontal size={14} />
          </IconButton>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', border: '1px solid var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
          {QUALITY_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => {
                dispatch({ type: 'SET_QUALITY', mode });
                dispatch({ type: 'SHOW_TOAST', message: `Quality: ${mode.charAt(0).toUpperCase() + mode.slice(1)}` });
              }}
              style={{
                padding: '2px 8px',
                fontSize: 9,
                fontWeight: 600,
                textTransform: 'capitalize',
                background: state.qualityMode === mode ? 'var(--accent-blue-dim)' : 'transparent',
                color: state.qualityMode === mode ? 'var(--accent-blue)' : 'var(--text-secondary)',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {state.performanceWarning && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 60,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(234, 179, 8, 0.15)',
              border: '1px solid var(--status-warn)',
              padding: '6px 12px',
              borderRadius: 3,
              fontSize: 10,
            }}
          >
            <AlertTriangle size={14} color="var(--status-warn)" />
            Performance limited — consider Low quality mode
            <Button
              variant="secondary"
              onClick={() => {
                dispatch({ type: 'SET_QUALITY', mode: 'low' });
                dispatch({ type: 'DISMISS_PERFORMANCE_WARNING' });
              }}
              style={{ height: 20, fontSize: 9 }}
            >
              Set Low
            </Button>
            <Button variant="ghost" onClick={() => dispatch({ type: 'DISMISS_PERFORMANCE_WARNING' })} style={{ height: 20, fontSize: 9 }}>
              Dismiss
            </Button>
          </div>
        )}

        {state.isLive && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 60,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(220, 38, 38, 0.9)',
              padding: '2px 8px',
              borderRadius: 3,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            <span className="rec-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
            LIVE
          </div>
        )}

        <ViewportCanvas />
      </div>
    </div>
  );
}
