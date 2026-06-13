import { useEffect, useRef } from 'react';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { useShell } from '@/context/ShellContext';
import { useSources } from '@/context/SourcesContext';

/**
 * Docked Program confidence monitor (DOM <video>).
 *
 * TEMPORARY/COMPLEMENTARY, by design and documented: the real in-scene
 * compositing is the Babylon `program-media` plane driven by a VideoTexture
 * (StudioEngine.setProgramStream). That engine path displays the feed on GPU
 * hardware; the current CI/software-WebGL host cannot sample uploaded textures
 * (the pre-existing desk-screen DynamicTexture renders white too), so this
 * bounded, labelled monitor guarantees the operator/evidence always sees the
 * live Program pixels. It is NOT claimed to be the engine integration and is
 * not a full-screen background — it is a docked monitor over the viewport.
 */
function ProgramMonitor({ stream, label }: { stream: MediaStream; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    void el.play().catch(() => {});
    return () => {
      if (el) el.srcObject = null; // detach only; the Source owns the stream
    };
  }, [stream]);

  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        top: 12,
        width: '32%',
        maxWidth: 380,
        aspectRatio: '16 / 9',
        border: '2px solid var(--status-rec)',
        borderRadius: 4,
        overflow: 'hidden',
        background: '#000',
        zIndex: 3,
        boxShadow: '0 4px 16px rgba(0,0,0,0.55)',
      }}
    >
      <video ref={ref} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <span
        style={{
          position: 'absolute',
          top: 4,
          left: 6,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: '#fff',
          background: 'var(--status-rec)',
          padding: '1px 6px',
          borderRadius: 2,
        }}
      >
        ● PROGRAM · {label}
      </span>
    </div>
  );
}

export function ViewportCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { initCanvas, importGltfFiles } = useEditorBridge();
  const { state, dispatch } = useShell();
  const { programSource } = useSources();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initCanvas(canvas);
  }, [initCanvas]);

  return (
    <div
      id="babylon-viewport"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(event) => {
        event.preventDefault();
        void importGltfFiles(Array.from(event.dataTransfer.files))
          .then((count) => dispatch({
            type: 'SHOW_TOAST',
            message: `Imported ${count} glTF mesh${count === 1 ? '' : 'es'}`,
          }))
          .catch((error: unknown) => dispatch({
            type: 'SHOW_TOAST',
            message: error instanceof Error ? error.message : 'Unable to import glTF asset',
          }));
      }}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--bg-viewport)',
      }}
    >
      <canvas
        ref={canvasRef}
        id="chase-babylon-canvas"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
          outline: 'none',
        }}
      />

      {programSource?.stream && <ProgramMonitor stream={programSource.stream} label={programSource.name} />}

      {state.showSafeArea && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: '5%',
              border: '1px dashed rgba(255,255,255,0.25)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '10%',
              border: '1px dashed rgba(255,255,255,0.15)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
        </>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          fontSize: 9,
          color: 'var(--text-muted)',
          background: 'rgba(0,0,0,0.55)',
          padding: '2px 6px',
          borderRadius: 2,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        {state.engineReady ? (
          <>
            {state.activeCameraId.replace('cam', 'CAM ').toUpperCase()} · {state.qualityMode.toUpperCase()} ·{' '}
            {state.metrics.fps} fps
          </>
        ) : (
          'Initializing scene…'
        )}
      </div>
    </div>
  );
}
