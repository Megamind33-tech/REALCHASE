import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useShell } from '@/context/ShellContext';

export function StatusBar() {
  const { state, dispatch } = useShell();
  const { metrics } = state;
  const warn = state.performanceWarning && !state.performanceWarningDismissed;

  return (
    <footer
      style={{
        height: 'var(--statusbar-h)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        background: 'var(--bg-rail)',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: 10,
        color: 'var(--text-secondary)',
        flexShrink: 0,
        gap: 16,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: warn ? 'var(--status-warn)' : 'var(--status-ok)',
          }}
        />
        Project Status: {warn ? 'Performance Limited' : 'Ready'}
      </span>

      <span className="mono" style={{ flex: 1, textAlign: 'center' }}>
        {metrics.resolution} · {state.engineReady ? `${metrics.fps} fps` : 'Engine starting…'}
      </span>

      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>Auto Save: {state.autosaveMinutes} min ago</span>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_BACKUP' })}
          style={{ color: state.backupEnabled ? 'var(--status-ok)' : 'var(--text-muted)' }}
        >
          Backup: {state.backupEnabled ? 'On' : 'Off'}
        </button>
        {state.activeModule === 'settings' ? (
          <>
            <Button variant="secondary" style={{ height: 18, fontSize: 9 }} onClick={() => dispatch({ type: 'TOGGLE_COMPACT' })}>
              Compact: {state.compactMode ? 'On' : 'Off'}
            </Button>
            <Button variant="secondary" style={{ height: 18, fontSize: 9 }} onClick={() => dispatch({ type: 'TOGGLE_REDUCED_MOTION' })}>
              Reduced Motion: {state.reducedMotion ? 'On' : 'Off'}
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            style={{ height: 18, fontSize: 9, gap: 4 }}
            onClick={() => dispatch({ type: 'SHOW_TOAST', message: 'Live chat panel — coming soon' })}
          >
            <MessageSquare size={12} /> Live Chat
          </Button>
        )}
      </span>
    </footer>
  );
}
