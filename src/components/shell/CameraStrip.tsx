import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { useShell } from '@/context/ShellContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { CAMERA_SHOTS } from '@/data/mock/studioData';
import type { CameraId } from '@/engine/sceneRegistry';

// How often to refresh one thumbnail. Each tick renders the ACTIVE camera (so it
// feels live) plus one other camera round-robin, so all six stay current within a
// few seconds at a cost of ~1–2 tiny off-screen renders per second.
const REFRESH_MS = 700;
// The active camera is rendered at a higher resolution (it's the "live" preview);
// inactive cameras use a smaller, cheaper capture. Both off-screen, so neither
// touches the live viewport frame rate.
const ACTIVE_THUMB_W = 320;
const INACTIVE_THUMB_W = 192;

export function CameraStrip() {
  const { state, dispatch } = useShell();
  const { captureCameraThumbnail } = useEditorBridge();
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const busy = useRef(false);
  const rrIndex = useRef(0);
  const activeId = state.activeCameraId;

  const show = state.activeModule === 'builder';

  useEffect(() => {
    if (!show || !state.engineReady) return;
    let stopped = false;

    const grab = async (id: string, width: number) => {
      const url = await captureCameraThumbnail(id as CameraId, width);
      if (url && !stopped) setThumbs((prev) => (prev[id] === url ? prev : { ...prev, [id]: url }));
    };

    const tick = async () => {
      if (busy.current || document.hidden) return;
      busy.current = true;
      try {
        // Keep the live (active) camera fresh and crisp, then advance the
        // round-robin over the others at a lighter resolution.
        await grab(activeId, ACTIVE_THUMB_W);
        const next = CAMERA_SHOTS[rrIndex.current % CAMERA_SHOTS.length].id;
        rrIndex.current += 1;
        if (next !== activeId) await grab(next, INACTIVE_THUMB_W);
      } finally {
        busy.current = false;
      }
    };

    void tick(); // populate immediately on entering the builder
    const timer = window.setInterval(() => { void tick(); }, REFRESH_MS);
    return () => { stopped = true; clearInterval(timer); };
  }, [show, state.engineReady, activeId, captureCameraThumbnail]);

  if (!show) return null;

  return (
    <div
      data-testid="camera-strip"
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
        const thumb = thumbs[cam.id];
        return (
          <button
            key={cam.id}
            onClick={() => dispatch({ type: 'SET_CAMERA', id: cam.id })}
            style={{ flexShrink: 0, width: 96, display: 'flex', flexDirection: 'column', gap: 4, background: 'transparent' }}
          >
            <div
              data-testid={`camera-thumb-${cam.id}`}
              style={{
                aspectRatio: '16/9',
                background: 'var(--bg-viewport)',
                border: `2px solid ${active ? 'var(--status-ok)' : 'var(--border-subtle)'}`,
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {thumb ? (
                <img
                  src={thumb}
                  alt={`${cam.label} view`}
                  data-thumb="live"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: active ? 'var(--status-ok)' : 'var(--text-muted)' }}>
                  <Eye size={16} />
                  <span style={{ fontSize: 7 }}>Rendering…</span>
                </div>
              )}
              <span
                style={{
                  position: 'absolute', left: 3, bottom: 3,
                  fontSize: 7, fontWeight: 600, letterSpacing: '0.04em',
                  padding: '1px 3px', borderRadius: 2,
                  background: 'rgba(0,0,0,0.55)',
                  color: active ? 'var(--status-ok)' : '#fff',
                }}
              >
                {cam.shortLabel}
              </span>
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
