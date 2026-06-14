import { useRef } from 'react';
import {
  LayoutGrid, Camera, Sun, User, Scan, Palette, ChevronRight, Move, RotateCw, Maximize2, Box, Folder, Link2, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { Tabs, Slider, Toggle } from '@/components/ui/Controls';
import { useShell } from '@/context/ShellContext';
import { useSceneNodes, useImportedAssets, useAssetGroups, useEditorBridge } from '@/context/EditorBridgeContext';
import type { InspectorSubTab, TransformMode } from '@/context/shellTypes';
import type { ImportedAsset, AssetGroup } from '@/integrations/render-engine/types';
import { formatBytes } from '@/integrations/render-engine/assetImport';
import { TIMELINE_LAYERS } from '@/data/mock/studioData';

const SUB_TABS: { id: InspectorSubTab; icon: typeof LayoutGrid; label: string }[] = [
  { id: 'layout', icon: LayoutGrid, label: 'Layout' },
  { id: 'camera', icon: Camera, label: 'Camera' },
  { id: 'light', icon: Sun, label: 'Light' },
  { id: 'presenter', icon: User, label: 'Presenter' },
  { id: 'keying', icon: Scan, label: 'Keying' },
  { id: 'materials', icon: Palette, label: 'Materials' },
];

const LAYOUT_PRESETS = ['Standard', 'Wide', 'Split', 'Minimal'];

export function Inspector() {
  const { state, dispatch } = useShell();
  const sceneNodes = useSceneNodes();
  const assets = useImportedAssets();
  const groups = useAssetGroups();
  const selectedAsset = assets.find((a) => a.id === state.selectedObjectId) ?? null;
  const selectedGroup = groups.find((g) => g.id === state.selectedObjectId) ?? null;

  if (state.rightPanelCollapsed || state.activeModule === 'settings' || state.activeModule === 'switcher') return null;

  const { desk } = state;

  return (
    <aside
      style={{
        width: 'var(--inspector-w)',
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        position: 'relative',
      }}
    >
      <button
        onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
        aria-label="Collapse inspector"
        style={{
          position: 'absolute',
          left: -10,
          top: '30%',
          zIndex: 10,
          width: 10,
          height: 40,
          background: 'var(--bg-panel-raised)',
          border: '1px solid var(--border-subtle)',
          borderRight: 'none',
          borderRadius: '3px 0 0 3px',
          color: 'var(--text-muted)',
        }}
      >
        <ChevronRight size={10} />
      </button>

      <div style={{ padding: 8, borderBottom: '1px solid var(--border-subtle)' }}>
        <Tabs
          tabs={[
            { id: 'inspector' as const, label: 'Inspector' },
            { id: 'layers' as const, label: 'Layers' },
          ]}
          active={state.inspectorTab}
          onChange={(tab) => dispatch({ type: 'SET_INSPECTOR_TAB', tab })}
          uppercase
        />
      </div>

      {state.inspectorTab === 'inspector' ? (
        <>
          <div
            style={{
              display: 'flex',
              gap: 2,
              padding: '6px 8px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            {SUB_TABS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => dispatch({ type: 'SET_INSPECTOR_SUB_TAB', tab: id })}
                title={label}
                aria-label={label}
                style={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                  background: state.inspectorSubTab === id ? 'var(--accent-blue-dim)' : 'transparent',
                  color: state.inspectorSubTab === id ? 'var(--accent-blue)' : 'var(--text-muted)',
                  border: state.inspectorSubTab === id ? '1px solid var(--accent-blue)' : '1px solid transparent',
                }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          <div className="scroll-y" style={{ flex: 1, padding: 8 }}>
            {selectedGroup && (
              <GroupInspector
                group={selectedGroup}
                transformMode={state.transformMode}
                onTransformMode={(mode) => dispatch({ type: 'SET_TRANSFORM_MODE', mode })}
              />
            )}
            {selectedAsset && (
              <AssetInspector
                asset={selectedAsset}
                transformMode={state.transformMode}
                onTransformMode={(mode) => dispatch({ type: 'SET_TRANSFORM_MODE', mode })}
              />
            )}

            <div className="section-label" style={{ marginBottom: 8 }}>
              {state.selectedObjectId === 'desk' ? 'News Desk' : state.selectedObjectId}
            </div>

            {state.inspectorSubTab === 'layout' && (
              <>
                <div className="section-label" style={{ marginBottom: 6 }}>
                  Layout Presets <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· not wired yet</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, marginBottom: 12, opacity: 0.5 }}>
                  {LAYOUT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      disabled
                      title={`${preset} layout — not wired yet`}
                      style={{
                        padding: 8,
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 3,
                        fontSize: 9,
                        background: 'var(--bg-panel-raised)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <Slider label="Environment Rotation" value={desk.envRotation} unit="°" onChange={(v) => dispatch({ type: 'UPDATE_DESK', patch: { envRotation: v } })} />
                <Slider label="Floor Reflection" value={desk.floorReflection} unit="%" onChange={(v) => dispatch({ type: 'UPDATE_DESK', patch: { floorReflection: v } })} />
                <label style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>Desk Model</label>
                <select
                  value={desk.deskModel}
                  onChange={(e) => dispatch({ type: 'UPDATE_DESK', patch: { deskModel: e.target.value } })}
                  style={{ width: '100%', marginBottom: 8, fontSize: 10 }}
                >
                  <option>Curved Broadcast</option>
                  <option>Straight Modern</option>
                  <option>Glass Top</option>
                </select>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>Desk Color</label>
                <input
                  type="color"
                  value={desk.deskColor}
                  onChange={(e) => dispatch({ type: 'UPDATE_DESK', patch: { deskColor: e.target.value } })}
                  style={{ width: '100%', height: 24, marginBottom: 8, padding: 0 }}
                />
                <Toggle label="Desk Glow" checked={desk.deskGlow} onChange={(v) => dispatch({ type: 'UPDATE_DESK', patch: { deskGlow: v } })} />
                <Toggle label="Desk Screen" checked={desk.deskScreen} onChange={(v) => dispatch({ type: 'UPDATE_DESK', patch: { deskScreen: v } })} />
                <label style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>Desk Screen Text</label>
                <input
                  value={desk.deskScreenText}
                  onChange={(e) => dispatch({ type: 'UPDATE_DESK', patch: { deskScreenText: e.target.value } })}
                  style={{ width: '100%', fontSize: 10 }}
                />
              </>
            )}

            {state.inspectorSubTab === 'camera' && (
              <>
                <Slider label="Focal Length" value={desk.focalLength} min={14} max={200} unit="mm" onChange={(v) => dispatch({ type: 'UPDATE_DESK', patch: { focalLength: v } })} />
                <Slider label="Depth of Field" value={desk.depthOfField} unit="%" onChange={(v) => dispatch({ type: 'UPDATE_DESK', patch: { depthOfField: v } })} />
                <Slider label="Parallax" value={desk.parallax} unit="%" onChange={(v) => dispatch({ type: 'UPDATE_DESK', patch: { parallax: v } })} />
              </>
            )}

            {state.inspectorSubTab === 'light' && <NotWired feature="Studio lighting controls" />}

            {state.inspectorSubTab === 'presenter' && <NotWired feature="Presenter / talent adjustments" />}

            {state.inspectorSubTab === 'keying' && <NotWired feature="Chroma keying" />}

            {state.inspectorSubTab === 'materials' && <NotWired feature="Material editing" />}
          </div>
        </>
      ) : (
        <div className="scroll-y" style={{ flex: 1, padding: 4 }}>
          {(state.engineReady && sceneNodes.length > 0 ? sceneNodes : TIMELINE_LAYERS.map((l) => ({ id: l.id, name: l.name }))).map(
            (node) => (
            <button
              key={node.id}
              onClick={() => dispatch({ type: 'SET_LAYER', id: node.id })}
              style={{
                width: '100%',
                padding: '6px 8px',
                textAlign: 'left',
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: state.selectedLayerId === node.id ? 'var(--accent-blue-dim)' : 'transparent',
                color: state.selectedLayerId === node.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: TIMELINE_LAYERS.find((l) => l.id === node.id)?.color ?? '#64748b',
                  borderRadius: 1,
                }}
              />
              {node.name}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

const DEG = 180 / Math.PI;

function Vec3Row({ label, values, unit, onChange }: {
  label: string; values: [number, number, number]; unit?: string;
  onChange: (next: [number, number, number]) => void;
}) {
  const axes = ['X', 'Y', 'Z'] as const;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>
        <span>{label}</span>{unit && <span>{unit}</span>}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {axes.map((axis, i) => (
          <input
            key={axis}
            type="number"
            step={0.1}
            value={Number.isFinite(values[i]) ? Math.round(values[i] * 1000) / 1000 : 0}
            aria-label={`${label} ${axis}`}
            onChange={(e) => {
              const next: [number, number, number] = [...values];
              next[i] = parseFloat(e.currentTarget.value);
              if (Number.isFinite(next[i])) onChange(next);
            }}
            style={{ width: '33%', minWidth: 0, fontSize: 9, padding: '2px 4px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 2, color: 'var(--text-primary)' }}
          />
        ))}
      </div>
    </div>
  );
}

const TRANSFORM_TOOLS: { id: TransformMode; icon: typeof Move; label: string }[] = [
  { id: 'translate', icon: Move, label: 'Move' },
  { id: 'rotate', icon: RotateCw, label: 'Rotate' },
  { id: 'scale', icon: Maximize2, label: 'Scale' },
];

function AssetInspector({ asset, transformMode, onTransformMode }: {
  asset: ImportedAsset; transformMode: TransformMode; onTransformMode: (mode: TransformMode) => void;
}) {
  const { setAssetTransform, setAssetReferenceMode, setAssetReferencePath, relinkAsset } = useEditorBridge();
  const relinkRef = useRef<HTMLInputElement>(null);
  const t = asset.transform;
  const rotDeg: [number, number, number] = [t.rotation[0] * DEG, t.rotation[1] * DEG, t.rotation[2] * DEG];
  return (
    <div
      data-testid="asset-inspector"
      style={{ border: '1px solid var(--accent-blue)', borderRadius: 4, padding: 8, marginBottom: 10, background: 'var(--bg-panel-raised)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Box size={13} style={{ color: 'var(--accent-blue)' }} />
        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={asset.name}>{asset.name}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', fontSize: 9, color: 'var(--text-muted)', marginBottom: 8 }}>
        <span>Type</span><span className="mono" style={{ textAlign: 'right' }}>{asset.format.toUpperCase()} model</span>
        <span>File size</span><span className="mono" style={{ textAlign: 'right' }}>{formatBytes(asset.fileBytes)}</span>
        <span>Meshes</span><span className="mono" style={{ textAlign: 'right' }}>{asset.meshCount}</span>
        <span>Vertices</span><span className="mono" style={{ textAlign: 'right' }}>{asset.vertexCount.toLocaleString()}</span>
      </div>

      {asset.heavy && (
        <div data-testid="heavy-asset-warning" style={{ fontSize: 9, color: 'var(--status-warn)', border: '1px solid var(--status-warn)', borderRadius: 3, padding: 6, marginBottom: 8, lineHeight: 1.4 }}>
          Heavy asset ({asset.heavyReason}). It can lower the studio frame rate — simplify or remove it if the viewport stutters.
        </div>
      )}

      {/* Storage / external-reference controls */}
      <div data-testid="asset-storage" style={{ marginBottom: 8 }}>
        {asset.missing ? (
          <div data-testid="missing-asset-warning" style={{ fontSize: 9, color: 'var(--status-rec)', border: '1px solid var(--status-rec)', borderRadius: 3, padding: 6, lineHeight: 1.4 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}><AlertTriangle size={10} /> External file missing</span>
            <div style={{ marginTop: 3, wordBreak: 'break-all', color: 'var(--text-muted)' }}>{asset.referencePath}</div>
            <button
              data-testid="relink-asset-button"
              onClick={() => relinkRef.current?.click()}
              style={{ marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '3px 7px', borderRadius: 3, border: '1px solid var(--status-rec)', background: 'transparent', color: 'var(--status-rec)' }}
            >
              <RefreshCw size={10} /> Relink file
            </button>
            <input
              ref={relinkRef} type="file" accept=".glb,.gltf" hidden aria-label="Relink asset file"
              onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) void relinkAsset(asset.id, f); e.currentTarget.value = ''; }}
            />
          </div>
        ) : (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--text-secondary)', marginBottom: asset.referenceMode ? 4 : 0 }}>
              <input type="checkbox" checked={asset.referenceMode} aria-label="External reference" onChange={(e) => setAssetReferenceMode(asset.id, e.currentTarget.checked)} />
              <Link2 size={10} /> External reference (don&apos;t embed in project)
            </label>
            {asset.referenceMode && (
              <input
                aria-label="Reference path"
                placeholder="https://… or file path"
                value={asset.referencePath}
                onChange={(e) => setAssetReferencePath(asset.id, e.currentTarget.value)}
                style={{ width: '100%', fontSize: 9, padding: '3px 5px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 2, color: 'var(--text-primary)' }}
              />
            )}
            <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 3 }}>
              {asset.embedded ? 'Embedded in project file.' : 'Referenced — resolved from its path on reload.'}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {TRANSFORM_TOOLS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTransformMode(id)}
            aria-label={`${label} tool`}
            title={`${label} tool`}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '4px 0', fontSize: 9,
              borderRadius: 3, border: `1px solid ${transformMode === id ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
              background: transformMode === id ? 'var(--accent-blue-dim)' : 'transparent',
              color: transformMode === id ? 'var(--accent-blue)' : 'var(--text-secondary)',
            }}
          >
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      <Vec3Row label="Position" values={t.position} onChange={(v) => setAssetTransform(asset.id, { position: v })} />
      <Vec3Row label="Rotation" unit="°" values={rotDeg} onChange={(v) => setAssetTransform(asset.id, { rotation: [v[0] / DEG, v[1] / DEG, v[2] / DEG] })} />
      <Vec3Row label="Scale" values={t.scaling} onChange={(v) => setAssetTransform(asset.id, { scaling: v })} />
    </div>
  );
}

function GroupInspector({ group, transformMode, onTransformMode }: {
  group: AssetGroup; transformMode: TransformMode; onTransformMode: (mode: TransformMode) => void;
}) {
  // Groups are transformed via the same engine path as assets (the group is a
  // real transform node); moving it preserves every child's local transform.
  const { setAssetTransform } = useEditorBridge();
  const t = group.transform;
  const rotDeg: [number, number, number] = [t.rotation[0] * DEG, t.rotation[1] * DEG, t.rotation[2] * DEG];
  return (
    <div
      data-testid="group-inspector"
      style={{ border: '1px solid var(--accent-blue)', borderRadius: 4, padding: 8, marginBottom: 10, background: 'var(--bg-panel-raised)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Folder size={13} style={{ color: 'var(--accent-blue)' }} />
        <span style={{ flex: 1, fontSize: 11, fontWeight: 600 }} title={group.name}>{group.name}</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{group.childIds.length} asset{group.childIds.length === 1 ? '' : 's'}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {TRANSFORM_TOOLS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTransformMode(id)}
            aria-label={`Group ${label} tool`}
            title={`${label} group`}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '4px 0', fontSize: 9,
              borderRadius: 3, border: `1px solid ${transformMode === id ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
              background: transformMode === id ? 'var(--accent-blue-dim)' : 'transparent',
              color: transformMode === id ? 'var(--accent-blue)' : 'var(--text-secondary)',
            }}
          >
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>
      <Vec3Row label="Position" values={t.position} onChange={(v) => setAssetTransform(group.id, { position: v })} />
      <Vec3Row label="Rotation" unit="°" values={rotDeg} onChange={(v) => setAssetTransform(group.id, { rotation: [v[0] / DEG, v[1] / DEG, v[2] / DEG] })} />
      <Vec3Row label="Scale" values={t.scaling} onChange={(v) => setAssetTransform(group.id, { scaling: v })} />
    </div>
  );
}

function NotWired({ feature }: { feature: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--border-active)',
        borderRadius: 4,
        padding: 12,
        fontSize: 10,
        lineHeight: 1.5,
        color: 'var(--text-muted)',
      }}
    >
      <strong style={{ color: 'var(--text-secondary)' }}>{feature}</strong> — not wired yet.
      <br />
      This panel will be connected to real engine state in a later phase. No
      placeholder controls are shown so the UI never implies behaviour that
      isn&apos;t there.
    </div>
  );
}

export function InspectorExpandHandle() {
  const { state, dispatch } = useShell();
  if (!state.rightPanelCollapsed) return null;

  return (
    <button
      onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
      aria-label="Expand inspector"
      style={{
        width: 12,
        background: 'var(--bg-rail)',
        border: 'none',
        borderLeft: '1px solid var(--border-subtle)',
        color: 'var(--text-muted)',
        writingMode: 'vertical-rl',
        fontSize: 9,
      }}
    >
      INSPECTOR
    </button>
  );
}
