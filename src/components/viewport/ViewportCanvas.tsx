import { useEffect, useRef } from 'react';
import { useEditorBridge, useImportedAssets, useAssetGroups } from '@/context/EditorBridgeContext';
import { useShell } from '@/context/ShellContext';

export function ViewportCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { initCanvas, setActive, importGltfFiles, removeAsset, removeGroup } = useEditorBridge();
  const assets = useImportedAssets();
  const groups = useAssetGroups();
  const { state, dispatch } = useShell();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initCanvas(canvas);
    setActive(true); // resume rendering while the 3D viewport is on screen
    return () => setActive(false); // pause when leaving the Builder/viewport
  }, [initCanvas, setActive]);

  // Delete / Backspace removes the selected imported asset or group from the
  // scene (ignored while typing in a field so it never eats text edits).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      const id = state.selectedObjectId;
      const asset = assets.find((a) => a.id === id);
      const group = groups.find((g) => g.id === id);
      if (asset) { removeAsset(asset.id); dispatch({ type: 'SHOW_TOAST', message: `Removed ${asset.name}` }); e.preventDefault(); }
      else if (group) { removeGroup(group.id); dispatch({ type: 'SHOW_TOAST', message: `Removed group ${group.name}` }); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.selectedObjectId, assets, groups, removeAsset, removeGroup, dispatch]);

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
