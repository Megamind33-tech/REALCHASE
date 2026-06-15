import { useEffect, useRef, useState } from 'react';
import {
  Box, Copy, Trash2, Pencil, AlertTriangle, Link2, FolderPlus, Folder, RefreshCw, Check, Trash,
} from 'lucide-react';
import { useShell } from '@/context/ShellContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { formatBytes } from '@/integrations/render-engine/assetImport';
import type { ImportedAsset } from '@/integrations/render-engine/types';

const rowBtn: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'inline-flex' };

/**
 * Small live thumbnail for an outliner row, rendered off-screen by the engine
 * from the asset's own geometry. Falls back to an honest type icon when the
 * engine can't render one (e.g. a missing external stub). Re-renders when the
 * asset's transform changes so a moved/scaled asset stays recognisable.
 */
function AssetThumb({ asset }: { asset: ImportedAsset }) {
  const { captureAssetThumbnail, engine } = useEditorBridge();
  const [url, setUrl] = useState<string | null>(null);
  const t = asset.transform;
  const key = `${asset.id}|${asset.vertexCount}|${t.position.join(',')}|${t.scaling.join(',')}`;

  useEffect(() => {
    let stopped = false;
    if (asset.missing || !engine) { setUrl(null); return; }
    void captureAssetThumbnail(asset.id, 72).then((u) => { if (!stopped) setUrl(u); });
    return () => { stopped = true; };
    // key folds in the bits that change the rendered look.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, engine]);

  return (
    <div
      data-testid={`asset-thumb-${asset.id}`}
      style={{
        width: 22, height: 22, flexShrink: 0, borderRadius: 3, overflow: 'hidden',
        background: 'var(--bg-viewport)', border: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {url ? (
        <img src={url} alt={`${asset.name} preview`} data-thumb="asset" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <Box size={12} style={{ color: asset.missing ? 'var(--status-rec)' : 'var(--text-muted)' }} />
      )}
    </div>
  );
}

function Badges({ a }: { a: ImportedAsset }) {
  return (
    <>
      {a.missing && <span title="External file missing" style={{ color: 'var(--status-rec)', fontSize: 8, display: 'inline-flex', alignItems: 'center', gap: 2 }}><AlertTriangle size={9} /> Missing</span>}
      {!a.missing && !a.embedded && <span title={`External reference: ${a.referencePath}`} style={{ color: 'var(--accent-blue)', fontSize: 8, display: 'inline-flex', alignItems: 'center', gap: 2 }}><Link2 size={9} /> Ext</span>}
      {a.heavy && <span title={`Heavy: ${a.heavyReason}`} style={{ color: 'var(--status-warn)', fontSize: 8, display: 'inline-flex', alignItems: 'center', gap: 2 }}><AlertTriangle size={9} /> Heavy</span>}
    </>
  );
}

export function SceneOutliner() {
  const { state, dispatch } = useShell();
  const { assets, groups, renameAsset, duplicateAsset, removeAsset, createGroup, removeGroup, relinkAsset, clearImportedAssets } = useEditorBridge();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const relinkRef = useRef<HTMLInputElement>(null);
  const relinkTarget = useRef<string | null>(null);

  if (assets.length === 0 && groups.length === 0) return null;

  const doClearAll = () => {
    const count = clearImportedAssets();
    setConfirmClear(false);
    setChecked(new Set());
    dispatch({ type: 'SHOW_TOAST', message: count > 0 ? `Cleared ${count} imported asset${count === 1 ? '' : 's'}` : 'No imported assets to clear' });
  };

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const beginRename = (a: ImportedAsset) => { setEditingId(a.id); setDraftName(a.name); };
  const commitRename = () => { if (editingId) renameAsset(editingId, draftName); setEditingId(null); };

  const makeGroup = () => {
    const ids = [...checked];
    if (ids.length < 2) return;
    createGroup(ids, groupName.trim() || `Group ${groups.length + 1}`);
    setChecked(new Set());
    setGroupName('');
  };

  const startRelink = (id: string) => { relinkTarget.current = id; relinkRef.current?.click(); };

  const grouped = new Set(assets.filter((a) => a.groupId).map((a) => a.id));
  const ungrouped = assets.filter((a) => !a.groupId);

  const AssetRow = ({ a, indent }: { a: ImportedAsset; indent: boolean }) => {
    const selected = state.selectedObjectId === a.id;
    return (
      <div
        data-testid={`outliner-asset-${a.id}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', marginBottom: 2,
          marginLeft: indent ? 14 : 0, borderRadius: 3, fontSize: 10,
          background: selected ? 'var(--accent-blue-dim)' : 'var(--bg-panel-raised)',
          border: `1px solid ${selected ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
        }}
      >
        <input
          type="checkbox"
          checked={checked.has(a.id)}
          aria-label={`Select ${a.name}`}
          onChange={() => toggleCheck(a.id)}
        />
        <AssetThumb asset={a} />
        {editingId === a.id ? (
          <input
            autoFocus
            aria-label="Asset name"
            value={draftName}
            onChange={(e) => setDraftName(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
            onBlur={commitRename}
            style={{ flex: 1, minWidth: 0, fontSize: 10, padding: '1px 4px' }}
          />
        ) : (
          <button
            onClick={() => dispatch({ type: 'SET_OBJECT', id: a.id })}
            title={`${a.name} · ${a.format.toUpperCase()} · ${formatBytes(a.fileBytes)} · ${a.vertexCount.toLocaleString()} verts`}
            style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', color: selected ? 'var(--accent-blue)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {a.name}
          </button>
        )}
        <Badges a={a} />
        {a.missing ? (
          <button style={rowBtn} aria-label={`Relink ${a.name}`} title="Relink external file" onClick={() => startRelink(a.id)}><RefreshCw size={11} /></button>
        ) : (
          <>
            <button style={rowBtn} aria-label={`Rename ${a.name}`} title="Rename" onClick={() => beginRename(a)}><Pencil size={11} /></button>
            <button style={rowBtn} aria-label={`Duplicate ${a.name}`} title="Duplicate" onClick={() => void duplicateAsset(a.id)}><Copy size={11} /></button>
          </>
        )}
        <button style={rowBtn} aria-label={`Remove ${a.name}`} title="Delete" onClick={() => { removeAsset(a.id); dispatch({ type: 'SHOW_TOAST', message: `Removed ${a.name}` }); }}><Trash2 size={11} /></button>
      </div>
    );
  };

  return (
    <div data-testid="scene-outliner" style={{ marginTop: 10 }}>
      <div className="section-label" style={{ marginBottom: 6 }}>Scene Outliner · {assets.length}</div>

      {checked.size > 0 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 6, alignItems: 'center' }}>
          <input
            aria-label="New group name"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 0, fontSize: 10, padding: '2px 5px' }}
          />
          <button
            data-testid="create-group-button"
            disabled={checked.size < 2}
            onClick={makeGroup}
            title={checked.size < 2 ? 'Select at least two assets to group' : 'Group selected assets'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '3px 6px', borderRadius: 3, border: '1px solid var(--border-active)', background: 'var(--bg-panel-raised)', color: checked.size < 2 ? 'var(--text-muted)' : 'var(--text-secondary)' }}
          >
            <FolderPlus size={11} /> Group ({checked.size})
          </button>
        </div>
      )}

      {groups.map((g) => {
        const selected = state.selectedObjectId === g.id;
        const children = assets.filter((a) => a.groupId === g.id);
        return (
          <div key={g.id} data-testid={`outliner-group-${g.id}`} style={{ marginBottom: 4 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '4px 6px', borderRadius: 3, fontSize: 10,
                background: selected ? 'var(--accent-blue-dim)' : 'transparent',
                border: `1px solid ${selected ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
              }}
            >
              <Folder size={12} style={{ color: 'var(--accent-blue)' }} />
              <button
                onClick={() => dispatch({ type: 'SET_OBJECT', id: g.id })}
                style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', fontWeight: 600, color: selected ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
              >
                {g.name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>· {children.length}</span>
              </button>
              <button style={rowBtn} aria-label={`Ungroup ${g.name}`} title="Ungroup" onClick={() => removeGroup(g.id)}><Check size={11} /></button>
            </div>
            <div style={{ marginTop: 2 }}>
              {children.map((a) => <AssetRow key={a.id} a={a} indent />)}
            </div>
          </div>
        );
      })}

      {ungrouped.filter((a) => !grouped.has(a.id)).map((a) => <AssetRow key={a.id} a={a} indent={false} />)}

      {assets.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {confirmClear ? (
            <div data-testid="clear-all-confirm" style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 9, color: 'var(--text-secondary)' }}>
              <span style={{ flex: 1 }}>Remove all {assets.length} imported asset{assets.length === 1 ? '' : 's'}?</span>
              <button
                data-testid="clear-all-confirm-button"
                onClick={doClearAll}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, padding: '3px 7px', borderRadius: 3, border: '1px solid var(--status-error)', background: 'transparent', color: 'var(--status-error)' }}
              >
                <Trash size={11} /> Clear
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                style={{ fontSize: 9, padding: '3px 7px', borderRadius: 3, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              data-testid="clear-all-button"
              onClick={() => setConfirmClear(true)}
              title="Remove every imported asset and group from the scene"
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 9, padding: '5px 6px', borderRadius: 3, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-muted)' }}
            >
              <Trash size={11} /> Clear all imported assets
            </button>
          )}
        </div>
      )}

      <input
        ref={relinkRef}
        type="file"
        accept=".glb,.gltf"
        hidden
        data-testid="relink-file-input"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          const id = relinkTarget.current;
          if (f && id) void relinkAsset(id, f).then(() => dispatch({ type: 'SHOW_TOAST', message: 'Relinked external asset' }));
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
}
