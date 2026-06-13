import { Eye } from 'lucide-react';
import { useShell } from '@/context/ShellContext';
import { CAMERA_SHOTS } from '@/data/mock/studioData';

export function CameraStrip() {
  const { state, dispatch } = useShell();

  if (state.activeModule !== 'builder') return null;

  return (
    <div
      style={{
        height: 'var(--camera-strip-h)',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-panel)',
        padding: '8px 12px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
      }}
    >
      {CAMERA_SHOTS.map((cam) => {
        const active = state.activeCameraId === cam.id;
        return (
          <button
            key={cam.id}
            onClick={() => dispatch({ type: 'SET_CAMERA', id: cam.id })}
            style={{
              flexShrink: 0,
              width: 96,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              background: 'transparent',
            }}
          >
            <div
              style={{
                aspectRatio: '16/9',
                background: 'var(--bg-viewport)',
                border: `2px solid ${active ? 'var(--status-ok)' : 'var(--border-subtle)'}`,
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                color: active ? 'var(--status-ok)' : 'var(--text-muted)',
              }}
            >
              {/* 3D viewport angle, not a live feed — no fake thumbnail preview. */}
              <Eye size={16} />
              <span style={{ fontSize: 8 }}>{cam.shortLabel}</span>
              <span style={{ fontSize: 7 }}>Viewpoint</span>
            </div>
            <span
              style={{
                fontSize: 9,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                textAlign: 'center',
              }}
            >
              {cam.label}
            </span>
          </button>
        );
      })}

      <button
        disabled title="3D viewpoint creation is not wired yet"
        style={{
          flexShrink: 0,
          width: 72,
          aspectRatio: '16/9',
          border: '1px dashed var(--border-active)',
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          color: 'var(--text-muted)',
          fontSize: 9,
        }}
      >
        <Eye size={16} />
        Add Viewpoint · Not wired
      </button>
    </div>
  );
}
