import {
  Save, FolderOpen, FilePlus, Upload, Undo2, Redo2, Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useShell } from '@/context/ShellContext';

export function TopBar() {
  const { state, dispatch } = useShell();
  const { metrics } = state;

  return (
    <header
      style={{
        height: 'var(--topbar-h)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-subtle)',
        gap: 12,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
          CHASE STUDIO PRO
        </span>
        <select
          value={state.projectName}
          onChange={(e) => dispatch({ type: 'SHOW_TOAST', message: `Switched to ${e.target.value}` })}
          style={{ maxWidth: 180, fontSize: 11 }}
          aria-label="Project selector"
        >
          <option value="Apex Evening Broadcast">Apex Evening Broadcast</option>
          <option value="Morning Sports Desk">Morning Sports Desk</option>
          <option value="Talkline Friday">Talkline Friday</option>
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Button onClick={() => dispatch({ type: 'FILE_ACTION', action: 'Save' })}><Save size={14} /> Save</Button>
        <Button onClick={() => dispatch({ type: 'FILE_ACTION', action: 'Open' })}><FolderOpen size={14} /> Open</Button>
        <Button onClick={() => dispatch({ type: 'FILE_ACTION', action: 'New' })}><FilePlus size={14} /> New</Button>
        <Button onClick={() => dispatch({ type: 'FILE_ACTION', action: 'Import' })}><Upload size={14} /> Import</Button>
      </div>

      <div style={{ display: 'flex', gap: 2 }}>
        <Button disabled={state.undoStack <= 0} onClick={() => dispatch({ type: 'UNDO' })} aria-label="Undo">
          <Undo2 size={14} />
        </Button>
        <Button disabled={state.redoStack <= 0} onClick={() => dispatch({ type: 'REDO' })} aria-label="Redo">
          <Redo2 size={14} />
        </Button>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-secondary)' }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: state.performanceWarning ? 'var(--status-warn)' : 'var(--status-ok)',
            }}
          />
          {state.performanceWarning ? 'Performance Limited' : 'System OK'}
        </span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
          {metrics.resolution} · {state.engineReady ? `${metrics.fps} fps` : '— fps'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          variant={state.isRecording ? 'danger' : 'secondary'}
          onClick={() => dispatch({ type: 'TOGGLE_REC' })}
          aria-pressed={state.isRecording}
        >
          <Circle size={10} fill={state.isRecording ? '#fff' : 'var(--status-rec)'} className={state.isRecording ? 'rec-pulse' : ''} />
          REC
        </Button>
        <Button
          variant="danger"
          onClick={() => dispatch({ type: 'TOGGLE_LIVE' })}
          aria-pressed={state.isLive}
          style={{ background: state.isLive ? 'var(--status-error)' : 'var(--status-rec)' }}
        >
          GO LIVE
        </Button>
      </div>
    </header>
  );
}
