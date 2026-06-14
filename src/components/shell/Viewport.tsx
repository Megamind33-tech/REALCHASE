import {
  Box, Move, RotateCw, Maximize2, Focus, Grid3x3, RectangleHorizontal,
  AlertTriangle, Crosshair,
} from 'lucide-react';
import { useState } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { useShell } from '@/context/ShellContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { ViewportCanvas } from '@/components/viewport/ViewportCanvas';
import { SwitcherPanel } from '@/components/shell/SwitcherPanel';
import { ScenesPanel } from '@/components/shell/ScenesPanel';
import { GraphicsPanel } from '@/components/shell/GraphicsPanel';
import {
  CamerasWorkspace, LightingWorkspace, AudioWorkspace, OutputsWorkspace,
  OverlaysWorkspace, ScriptsWorkspace, SettingsWorkspace,
} from '@/components/shell/ModuleWorkspaces';
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
  const { engine, setCameraTracking, setTrackingSmoothing, connectTracking, disconnectTracking, trackingStatus, trackingLinked, trackingLabel } = useEditorBridge();
  const [tracking, setTracking] = useState(false);
  const [smoothing, setSmoothing] = useState(0.4);
  const [trackUrl, setTrackUrl] = useState('ws://localhost:7777');

  if (state.activeModule === 'switcher') {
    return <SwitcherPanel />;
  }

  if (state.activeModule === 'scenes') {
    return <ScenesPanel />;
  }

  if (state.activeModule === 'graphics') {
    return <GraphicsPanel />;
  }

  if (state.activeModule === 'cameras') return <CamerasWorkspace />;
  if (state.activeModule === 'lighting') return <LightingWorkspace />;
  if (state.activeModule === 'audio') return <AudioWorkspace />;
  if (state.activeModule === 'outputs') return <OutputsWorkspace />;
  if (state.activeModule === 'overlays') return <OverlaysWorkspace />;
  if (state.activeModule === 'scripts') return <ScriptsWorkspace />;
  if (state.activeModule === 'settings') return <SettingsWorkspace />;

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
    <div data-testid="builder-surface" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg-viewport)' }}>
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
          <IconButton label="Toggle grid (not wired yet)" disabled>
            <Grid3x3 size={14} />
          </IconButton>
          <IconButton
            label="Camera tracking (test signal — drives the virtual camera)"
            active={tracking}
            onClick={() => { const next = !tracking; setTracking(next); setCameraTracking(next); }}
          >
            <Crosshair size={14} />
          </IconButton>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--text-secondary)' }} title="Tracking smoothing (jitter rejection)">
            Smooth
            <input
              type="range"
              min={0}
              max={0.97}
              step={0.01}
              value={smoothing}
              onChange={(e) => { const v = Number(e.target.value); setSmoothing(v); setTrackingSmoothing(v); }}
              style={{ width: 60, accentColor: 'var(--accent-blue)' }}
              aria-label="Tracking smoothing"
            />
          </label>
          <input
            value={trackUrl}
            onChange={(e) => setTrackUrl(e.target.value)}
            placeholder="ws://host:port"
            aria-label="Tracking source URL"
            style={{ width: 130, fontSize: 9, height: 22 }}
          />
          <button
            onClick={() => { if (trackingLinked) disconnectTracking(); else connectTracking(trackUrl); }}
            title="Connect to an external camera-tracking source (FreeD/mo-sys bridge over WebSocket)"
            style={{
              fontSize: 9, height: 22, padding: '0 8px', borderRadius: 3,
              border: `1px solid ${trackingLinked ? 'var(--status-ok)' : trackingStatus === 'error' ? 'var(--status-error)' : 'var(--border-subtle)'}`,
              background: trackingLinked ? 'var(--accent-blue-dim)' : 'var(--bg-panel-raised)',
              color: trackingLinked ? 'var(--status-ok)' : 'var(--text-secondary)',
            }}
          >
            {trackingLabel}
          </button>
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

        <ViewportCanvas />
      </div>
    </div>
  );
}
