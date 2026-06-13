import { useState } from 'react';
import { Search, Filter, ChevronLeft, Box, Monitor, Lamp, Circle, Leaf, Armchair } from 'lucide-react';
import { useShell } from '@/context/ShellContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { Tabs, Chip } from '@/components/ui/Controls';
import {
  CATEGORIES, STUDIO_PACKS, SCENE_OBJECTS, LIGHTING_PRESETS,
} from '@/data/mock/studioData';
import type { AssetTab } from '@/context/shellTypes';

const objectIcons: Record<string, typeof Box> = {
  desk: Box,
  monitor: Monitor,
  lamp: Lamp,
  circle: Circle,
  leaf: Leaf,
  armchair: Armchair,
};

export function AssetPanel() {
  const { state, dispatch } = useShell();
  const { addObject, loadPack, importGltfFiles } = useEditorBridge();
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);

  const handlePackLoad = async (packId: string, packName: string) => {
    setLoadingPackId(packId);
    setLoadProgress(0);
    try {
      const count = await loadPack(packId, setLoadProgress);
      dispatch({ type: 'SHOW_TOAST', message: `${packName} loaded (${count} nodes)` });
    } catch {
      dispatch({
        type: 'SHOW_TOAST',
        message: `Pack unavailable: add public/scenes/${packId}/scene.babylon`,
      });
    } finally {
      setLoadingPackId(null);
      setLoadProgress(0);
    }
  };

  const handleAssetDrop = async (files: File[]) => {
    try {
      const count = await importGltfFiles(files);
      dispatch({ type: 'SHOW_TOAST', message: `Imported ${count} glTF mesh${count === 1 ? '' : 'es'}` });
    } catch (error) {
      dispatch({
        type: 'SHOW_TOAST',
        message: error instanceof Error ? error.message : 'Unable to import glTF asset',
      });
    }
  };

  if (state.activeModule !== 'builder' || state.leftPanelCollapsed) return null;

  const filteredPacks = STUDIO_PACKS.filter((p) => {
    const matchCat = state.categoryFilter === 'ALL' || p.category === state.categoryFilter;
    const matchSearch = !state.assetSearch || p.name.toLowerCase().includes(state.assetSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <aside
      style={{
        width: 'var(--asset-panel-w)',
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <button
        onClick={() => dispatch({ type: 'TOGGLE_LEFT_PANEL' })}
        aria-label="Collapse asset panel"
        style={{
          position: 'absolute',
          right: -10,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 10,
          height: 40,
          background: 'var(--bg-panel-raised)',
          border: '1px solid var(--border-subtle)',
          borderLeft: 'none',
          borderRadius: '0 3px 3px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
      >
        <ChevronLeft size={10} />
      </button>

      <div style={{ padding: 8, borderBottom: '1px solid var(--border-subtle)' }}>
        <Tabs<AssetTab>
          tabs={[
            { id: 'sets', label: 'Sets' },
            { id: 'elements', label: 'Elements' },
            { id: 'assets', label: 'Assets' },
          ]}
          active={state.assetTab}
          onChange={(tab) => dispatch({ type: 'SET_ASSET_TAB', tab })}
        />
      </div>

      <div className="scroll-y" style={{ flex: 1, padding: 8 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 6, top: 7, color: 'var(--text-muted)' }} />
            <input
              placeholder="Search studio sets..."
              value={state.assetSearch}
              onChange={(e) => dispatch({ type: 'SET_ASSET_SEARCH', value: e.target.value })}
              style={{ width: '100%', paddingLeft: 24, fontSize: 10 }}
            />
          </div>
          <button
            aria-label="Filter (not wired yet)"
            title="Filter — not wired yet"
            disabled
            style={{ width: 28, height: 28, border: '1px solid var(--border-subtle)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Filter size={12} />
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              active={state.categoryFilter === cat}
              onClick={() => dispatch({ type: 'SET_CATEGORY', category: cat })}
            />
          ))}
        </div>

        {state.assetTab === 'sets' && (
          <>
            <div className="section-label" style={{ marginBottom: 6 }}>Premium Studio Packs</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
              {filteredPacks.map((pack) => (
                <button
                  key={pack.id}
                  disabled={loadingPackId !== null}
                  onClick={() => void handlePackLoad(pack.id, pack.name)}
                  style={{
                    aspectRatio: '16/10',
                    background: pack.accent,
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 3,
                    padding: 4,
                    textAlign: 'left',
                    fontSize: 9,
                    color: '#fff',
                  }}
                >
                  {loadingPackId === pack.id
                    ? `Loading ${Math.round(loadProgress * 100)}%`
                    : pack.name}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="section-label" style={{ marginBottom: 6 }}>3D Objects</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 16 }}>
          {SCENE_OBJECTS.map((obj) => {
            const Icon = objectIcons[obj.icon] ?? Box;
            return (
              <button
                key={obj.id}
                onClick={() => {
                  dispatch({ type: 'SET_OBJECT', id: obj.id });
                  const added = addObject(obj.id);
                  dispatch({
                    type: 'SHOW_TOAST',
                    message: added ? `${obj.name} ready in scene` : `Selected ${obj.name}`,
                  });
                }}
                style={{
                  padding: '8px 4px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 3,
                  background: state.selectedObjectId === obj.id ? 'var(--accent-blue-dim)' : 'var(--bg-panel-raised)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 9,
                  color: 'var(--text-secondary)',
                }}
              >
                <Icon size={14} />
                {obj.name}
              </button>
            );
          })}
        </div>

        <div className="section-label" style={{ marginBottom: 6 }}>
          Lighting Presets <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· not wired yet</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, opacity: 0.5 }}>
          {LIGHTING_PRESETS.map((preset) => (
            <button
              key={preset.id}
              title={`${preset.name} — not wired yet`}
              disabled
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '2px solid var(--border-subtle)',
                background: preset.color,
              }}
              aria-label={`${preset.name} (not wired yet)`}
            />
          ))}
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void handleAssetDrop(Array.from(e.dataTransfer.files));
          }}
          style={{
            border: '1px dashed var(--border-active)',
            borderRadius: 3,
            padding: 16,
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 10,
          }}
        >
          Drag &amp; drop .glb or .gltf assets into the scene
        </div>
      </div>
    </aside>
  );
}

export function AssetPanelExpandHandle() {
  const { state, dispatch } = useShell();
  if (!state.leftPanelCollapsed || state.activeModule !== 'builder') return null;

  return (
    <button
      onClick={() => dispatch({ type: 'TOGGLE_LEFT_PANEL' })}
      aria-label="Expand asset panel"
      style={{
        width: 12,
        background: 'var(--bg-rail)',
        border: 'none',
        borderRight: '1px solid var(--border-subtle)',
        color: 'var(--text-muted)',
        writingMode: 'vertical-rl',
        fontSize: 9,
        letterSpacing: '0.1em',
      }}
    >
      ASSETS
    </button>
  );
}
