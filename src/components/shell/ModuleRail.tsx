import {
  Hammer, Layers, Package, Type, SquareStack, Sun, Camera, Volume2,
  ScrollText, Radio, Settings,
} from 'lucide-react';
import type { ModuleId } from '@/context/shellTypes';
import { useShell } from '@/context/ShellContext';

const MODULES: { id: ModuleId; label: string; icon: typeof Hammer }[] = [
  { id: 'builder', label: 'Builder', icon: Hammer },
  { id: 'scenes', label: 'Scenes', icon: Layers },
  { id: 'assets', label: 'Assets', icon: Package },
  { id: 'graphics', label: 'Graphics', icon: Type },
  { id: 'overlays', label: 'Overlays', icon: SquareStack },
  { id: 'lighting', label: 'Lighting', icon: Sun },
  { id: 'cameras', label: 'Cameras', icon: Camera },
  { id: 'audio', label: 'Audio', icon: Volume2 },
  { id: 'scripts', label: 'Scripts', icon: ScrollText },
  { id: 'outputs', label: 'Outputs', icon: Radio },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function ModuleRail() {
  const { state, dispatch } = useShell();

  return (
    <nav
      style={{
        width: 'var(--rail-w)',
        background: 'var(--bg-rail)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflowY: 'auto',
      }}
      aria-label="Module navigation"
    >
      {MODULES.map(({ id, label, icon: Icon }) => {
        const active = state.activeModule === id;
        return (
          <button
            key={id}
            onClick={() => dispatch({ type: 'SET_MODULE', module: id })}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '8px 4px',
              minHeight: 52,
              background: active ? 'var(--accent-blue-dim)' : 'transparent',
              borderLeft: active ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
            }}
            title={label}
          >
            <Icon size={16} strokeWidth={1.5} />
            <span style={{ fontSize: 9, lineHeight: 1.1, textAlign: 'center', maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
