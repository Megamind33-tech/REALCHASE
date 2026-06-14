import { useState } from 'react';
import { Plus, Trash2, Camera, Check, Pencil, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useShell } from '@/context/ShellContext';
import { useScenes } from '@/context/ScenesContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { makeSceneId, type SavedScene } from '@/scenes/sceneTypes';

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function ScenesPanel() {
  const { state, dispatch } = useShell();
  const { scenes, activeSceneId, addScene, removeScene, renameScene, updateScene, setActiveScene } = useScenes();
  const { captureNodeTransforms, applyNodeTransforms, captureThumbnail, getActiveCameraId, sceneNodes } = useEditorBridge();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const engineReady = state.engineReady;

  const handleCreateScene = () => {
    if (!engineReady) {
      dispatch({ type: 'SHOW_TOAST', message: 'Scene engine not ready yet' });
      return;
    }
    const nodes = captureNodeTransforms();
    const thumbnail = captureThumbnail(320);
    const now = Date.now();
    const scene: SavedScene = {
      id: makeSceneId(),
      name: `Scene ${scenes.length + 1}`,
      createdAt: now,
      updatedAt: now,
      thumbnail,
      snapshot: { nodes, activeCameraId: getActiveCameraId() },
      desk: state.desk,
    };
    addScene(scene);
    dispatch({ type: 'SHOW_TOAST', message: `Saved "${scene.name}" — ${nodes.length} object${nodes.length === 1 ? '' : 's'}` });
  };

  const handleLoadScene = (scene: SavedScene) => {
    if (!engineReady) {
      dispatch({ type: 'SHOW_TOAST', message: 'Scene engine not ready yet' });
      return;
    }
    const { restored, missing } = applyNodeTransforms(scene.snapshot.nodes);
    dispatch({ type: 'SET_CAMERA', id: scene.snapshot.activeCameraId });
    dispatch({ type: 'UPDATE_DESK', patch: scene.desk });
    setActiveScene(scene.id);
    const missingNote = missing ? `, ${missing} object${missing === 1 ? '' : 's'} no longer in scene` : '';
    dispatch({ type: 'SHOW_TOAST', message: `Loaded "${scene.name}" — restored ${restored} object${restored === 1 ? '' : 's'}${missingNote}` });
  };

  const handleUpdateThumbnail = (scene: SavedScene) => {
    if (!engineReady) return;
    const nodes = captureNodeTransforms();
    const thumbnail = captureThumbnail(320);
    updateScene(scene.id, {
      thumbnail,
      snapshot: { nodes, activeCameraId: getActiveCameraId() },
      desk: state.desk,
    });
    dispatch({ type: 'SHOW_TOAST', message: `Re-captured "${scene.name}" from current view` });
  };

  const startRename = (scene: SavedScene) => {
    setEditingId(scene.id);
    setEditName(scene.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameScene(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div data-testid="scenes-surface" className="scroll-y" style={{ flex: 1, minHeight: 0, background: 'var(--bg-viewport)', padding: 16 }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Scenes</h2>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Save the current set layout, camera and desk look as a named scene. Load it later to recall the exact arrangement.
            </p>
          </div>
          <Button variant="secondary" onClick={handleCreateScene} disabled={!engineReady} data-testid="create-scene-button">
            <Plus size={14} /> Save Current Scene
          </Button>
        </div>

        {scenes.length === 0 ? (
          <div
            style={{
              border: '1px dashed var(--border-active)',
              borderRadius: 4,
              padding: 32,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 12,
            }}
          >
            <Layers size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
            <div>No saved scenes yet.</div>
            <div style={{ fontSize: 10, marginTop: 4 }}>
              Arrange your set in the <strong>Builder</strong>, then click <strong>Save Current Scene</strong> to snapshot it.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {scenes.map((scene) => {
              const isActive = scene.id === activeSceneId;
              return (
                <div
                  key={scene.id}
                  data-testid={`scene-card-${scene.id}`}
                  style={{
                    border: `2px solid ${isActive ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: 'var(--bg-panel)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <button
                    onClick={() => handleLoadScene(scene)}
                    title={`Load "${scene.name}"`}
                    data-testid={`load-scene-${scene.id}`}
                    style={{
                      position: 'relative',
                      aspectRatio: '16/9',
                      background: 'var(--bg-viewport)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'block',
                    }}
                  >
                    {scene.thumbnail ? (
                      <img
                        src={scene.thumbnail}
                        alt={`${scene.name} preview`}
                        data-thumb="scene"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 4 }}>
                        <Camera size={20} />
                        <span style={{ fontSize: 9 }}>No preview</span>
                      </div>
                    )}
                    {isActive && (
                      <span
                        style={{
                          position: 'absolute', top: 6, left: 6,
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                          background: 'var(--accent-blue)', color: '#fff',
                        }}
                      >
                        <Check size={10} /> Active
                      </span>
                    )}
                    <span
                      style={{
                        position: 'absolute', bottom: 6, right: 6,
                        fontSize: 8, padding: '1px 5px', borderRadius: 2,
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                      }}
                    >
                      {scene.snapshot.nodes.length} obj · {scene.snapshot.activeCameraId}
                    </span>
                  </button>

                  <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {editingId === scene.id ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.currentTarget.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
                        aria-label={`Rename ${scene.name}`}
                        style={{ fontSize: 11, padding: '3px 5px' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={scene.name}>
                          {scene.name}
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(scene.updatedAt)}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button variant="secondary" onClick={() => handleLoadScene(scene)} style={{ flex: 1, height: 24, fontSize: 10 }}>
                        Load
                      </Button>
                      <Button variant="ghost" onClick={() => handleUpdateThumbnail(scene)} title="Re-capture from current view" style={{ height: 24, width: 28 }} aria-label={`Re-capture ${scene.name}`}>
                        <Camera size={13} />
                      </Button>
                      <Button variant="ghost" onClick={() => startRename(scene)} title="Rename" style={{ height: 24, width: 28 }} aria-label={`Rename ${scene.name}`}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="ghost" onClick={() => removeScene(scene.id)} title="Delete" style={{ height: 24, width: 28 }} aria-label={`Delete ${scene.name}`}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {sceneNodes.length > 0 && (
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 16 }}>
            Current set has <strong>{sceneNodes.length}</strong> selectable object{sceneNodes.length === 1 ? '' : 's'}. Saving captures each one's position, rotation and scale plus the active camera and desk look.
          </p>
        )}
      </div>
    </div>
  );
}
