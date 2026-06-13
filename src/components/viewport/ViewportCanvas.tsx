import { useEffect, useRef } from 'react';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { useShell } from '@/context/ShellContext';

export function ViewportCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { initCanvas, importGltfFiles } = useEditorBridge();
  const { state, dispatch } = useShell();

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
