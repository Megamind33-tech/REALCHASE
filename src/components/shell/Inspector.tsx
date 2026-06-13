import {
  LayoutGrid, Camera, Sun, User, Scan, Palette, ChevronRight,
} from 'lucide-react';
import { Tabs, Slider, Toggle } from '@/components/ui/Controls';
import { useShell } from '@/context/ShellContext';
import { useSceneNodes } from '@/context/EditorBridgeContext';
import type { InspectorSubTab } from '@/context/shellTypes';
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
            <div className="section-label" style={{ marginBottom: 8 }}>
              {state.selectedObjectId === 'desk' ? 'News Desk' : state.selectedObjectId}
            </div>

            {state.inspectorSubTab === 'layout' && (
              <>
                <div className="section-label" style={{ marginBottom: 6 }}>Layout Presets</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, marginBottom: 12 }}>
                  {LAYOUT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => dispatch({ type: 'SHOW_TOAST', message: `Layout: ${preset}` })}
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
