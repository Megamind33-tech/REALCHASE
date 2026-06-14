import { useRef } from 'react';
import { Search, Filter, ChevronLeft, Box, Monitor, Lamp, Circle, Leaf, Armchair, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { useShell } from '@/context/ShellContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { Tabs, Chip } from '@/components/ui/Controls';
import {
  CATEGORIES, STUDIO_PACKS, SCENE_OBJECTS, LIGHTING_PRESETS,
} from '@/data/mock/studioData';
import type { AssetTab } from '@/context/shellTypes';
import { AssetImportError } from '@/integrations/render-engine/types';
import { formatBytes } from '@/integrations/render-engine/assetImport';

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
  const { addObject, importAsset, assets, removeAsset } = useEditorBridge();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importFiles = async (files: File[]) => {
    const candidates = files.filter((f) => f.size >= 0);
    if (candidates.length === 0) return;
    for (const file of candidates) {
      try {
        const asset = await importAsset(file);
        dispatch({ type: 'SHOW_TOAST', message: `Imported ${asset.name} — ${asset.meshCount} mesh${asset.meshCount === 1 ? '' : 'es'}, ${asset.vertexCount.toLocaleString()} verts` });
      } catch (error) {
        // Precise, honest failure states per the typed import errors.
        const message = error instanceof AssetImportError
          ? error.message
          : error instanceof Error ? error.message : 'Unable to import asset';
        dispatch({ type: 'SHOW_TOAST', message });
      }
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
            <div className="section-label" style={{ marginBottom: 6 }}>Studio Packs · Not available in this build</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: 8 }}>Pack loading expects <span className="mono">public/scenes/&lt;pack-id&gt;/scene.babylon</span>. No packaged scene files are present, so pack actions are disabled instead of pretending to load.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
              {filteredPacks.map((pack) => (
                <button
                  key={pack.id}
                  disabled
                  title={`Pack unavailable: add public/scenes/${pack.id}/scene.babylon`}
                  style={{
                    aspectRatio: '16/10',
                    background: 'var(--bg-panel-raised)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 3,
                    padding: 4,
                    textAlign: 'left',
                    fontSize: 9,
                    color: 'var(--text-muted)',
                  }}
                >
                  {pack.name}
                  <br />
                  <span style={{ fontSize: 8 }}>Requires scene.babylon</span>
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

        <div data-testid="asset-import-panel">
          <div className="section-label" style={{ marginBottom: 6 }}>Import 3D Asset</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
            multiple
            hidden
            data-testid="asset-file-input"
            aria-label="Import 3D asset file"
            onChange={(e) => { void importFiles(Array.from(e.currentTarget.files ?? [])); e.currentTarget.value = ''; }}
          />
          <button
            data-testid="import-asset-button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 6px', fontSize: 10, color: 'var(--text-secondary)',
              border: '1px solid var(--border-active)', borderRadius: 3, background: 'var(--bg-panel-raised)',
            }}
          >
            <Upload size={12} /> Import .glb / .gltf
          </button>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); void importFiles(Array.from(e.dataTransfer.files)); }}
            style={{
              marginTop: 6, border: '1px dashed var(--border-subtle)', borderRadius: 3,
              padding: 10, textAlign: 'center', color: 'var(--text-muted)', fontSize: 9,
            }}
          >
            …or drop a .glb / .gltf file here
          </div>

          {assets.length > 0 && (
            <div data-testid="imported-asset-list" style={{ marginTop: 10 }}>
              <div className="section-label" style={{ marginBottom: 6 }}>In Scene · {assets.length}</div>
              {assets.map((a) => {
                const selected = state.selectedObjectId === a.id;
                return (
                  <div
                    key={a.id}
                    data-testid={`imported-asset-${a.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', marginBottom: 3,
                      borderRadius: 3, fontSize: 10,
                      background: selected ? 'var(--accent-blue-dim)' : 'var(--bg-panel-raised)',
                      border: `1px solid ${selected ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    <button
                      onClick={() => dispatch({ type: 'SET_OBJECT', id: a.id })}
                      title={`${a.name} · ${a.format.toUpperCase()} · ${formatBytes(a.fileBytes)} · ${a.vertexCount.toLocaleString()} verts`}
                      style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', color: selected ? 'var(--accent-blue)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {a.name}
                    </button>
                    {a.heavy && (
                      <span title={`Heavy asset: ${a.heavyReason}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--status-warn)', fontSize: 8 }}>
                        <AlertTriangle size={10} /> Heavy
                      </span>
                    )}
                    <span className="mono" style={{ fontSize: 8, color: 'var(--text-muted)' }}>{formatBytes(a.fileBytes)}</span>
                    <button
                      onClick={() => { removeAsset(a.id); dispatch({ type: 'SHOW_TOAST', message: `Removed ${a.name}` }); }}
                      aria-label={`Remove ${a.name}`}
                      title={`Remove ${a.name}`}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
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
