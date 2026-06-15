import { useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useShell } from '@/context/ShellContext';
import { HelpOverlay } from '@/components/shell/HelpOverlay';

export function StatusBar() {
  const { state, dispatch } = useShell();
  const { metrics } = state;
  const warn = state.performanceWarning && !state.performanceWarningDismissed;
  const [helpOpen, setHelpOpen] = useState(false);

  // "?" or F1 toggles the Help overlay; ignored while typing in a field so it
  // never eats a literal "?" in a text input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' && e.key !== 'F1') return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      e.preventDefault();
      setHelpOpen((prev) => !prev);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
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
        Engine Status: {state.engineReady ? (warn ? 'Performance Limited' : 'Running') : 'Starting'}
      </span>

      <span className="mono" style={{ flex: 1, textAlign: 'center' }}>
        {metrics.resolution} · {state.engineReady ? `${metrics.fps} fps` : 'Engine starting…'}
      </span>

      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>Autosave/backup disabled until persistent project service is scheduled</span>
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
          <Button variant="ghost" style={{ height: 18, fontSize: 9, gap: 4 }} disabled title="Live chat requires a streaming/output service">Live Chat · Not wired</Button>
        )}
        <Button
          variant="secondary"
          style={{ height: 18, fontSize: 9, gap: 4 }}
          onClick={() => setHelpOpen(true)}
          title="Help & keyboard shortcuts (?)"
          aria-label="Help and keyboard shortcuts"
        >
          <HelpCircle size={11} /> ?
        </Button>
      </span>
    </footer>
    <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
