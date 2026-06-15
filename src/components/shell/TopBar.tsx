import { useRef, useState, useEffect } from 'react';
import {
  Save, FolderOpen, FilePlus, Upload, Undo2, Redo2, Circle, Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useShell } from '@/context/ShellContext';
import { useSources } from '@/context/SourcesContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { useScenes } from '@/context/ScenesContext';
import { useGraphics } from '@/context/GraphicsContext';
import { useAr } from '@/context/ArContext';
import { useLighting } from '@/context/LightingContext';
import { useTimeline } from '@/context/TimelineContext';
import { buildProjectFile, parseProjectFile, saveProjectFile } from '@/projectPersistence';

const DEFAULT_INGEST_URL = 'http://localhost:8889/chase/whip';

export function TopBar() {
  const { state, dispatch } = useShell();
  const {
    sources, previewId, programId, restoreProjectSources,
    capturing, canRecord, recordLabel, toggleCapture,
    onAir, canStream, liveLabel, streamError, toggleAir,
  } = useSources();
  const { serializeScene, restoreScene } = useEditorBridge();
  const { scenes, restoreScenes } = useScenes();
  const { graphics, restoreGraphics } = useGraphics();
  const { elements: arElements, restoreAr } = useAr();
  const { lighting, setLighting } = useLighting();
  const { cues, duration: timelineDuration, restoreCues } = useTimeline();
  const openRef = useRef<HTMLInputElement>(null);
  const [ingestUrl, setIngestUrl] = useState(DEFAULT_INGEST_URL);
  const { metrics } = state;

  // Surface publish failures honestly instead of pretending we went on air.
  useEffect(() => {
    if (streamError) dispatch({ type: 'SHOW_TOAST', message: `Output failed: ${streamError}` });
  }, [streamError, dispatch]);

  const saveProject = async () => {
    try {
      const path = await saveProjectFile(buildProjectFile(state, sources, previewId, programId, serializeScene(), {
        scenes,
        graphics,
        ar: arElements,
        lighting,
        timelineCues: { cues, duration: timelineDuration },
      }));
      dispatch({ type: 'SHOW_TOAST', message: path === 'cancelled' ? 'Save Project cancelled' : `Saved project: ${path}` });
    } catch (error) {
      dispatch({ type: 'SHOW_TOAST', message: `Save Project failed: ${error instanceof Error ? error.message : 'unknown error'}` });
    }
  };

  const openProject = async (file: File | null | undefined) => {
    if (!file) {
      dispatch({ type: 'SHOW_TOAST', message: 'Open Project cancelled' });
      return;
    }
    try {
      const restored = parseProjectFile(await file.text());
      restoreProjectSources(restored.sources, restored.previewId, restored.programId);
      const { restored: ok, missing, groups } = await restoreScene(restored.assetScene);
      const total = restored.assetScene.assets.length;
      const assetNote = total
        ? ` Restored ${ok}/${total} asset${total === 1 ? '' : 's'}${groups ? ` and ${groups} group${groups === 1 ? '' : 's'}` : ''}${missing ? `, ${missing} external file${missing === 1 ? '' : 's'} missing` : ''}.`
        : '';

      // Restore each optional studio section that the file carried. Missing
      // sections are skipped silently (older files). AR + graphics come back
      // off-air — the file never auto-composites into the live Program output.
      const parts: string[] = [];
      if (restored.scenes) { restoreScenes(restored.scenes); if (restored.scenes.length) parts.push(`${restored.scenes.length} scene${restored.scenes.length === 1 ? '' : 's'}`); }
      if (restored.graphics) { restoreGraphics(restored.graphics); if (restored.graphics.length) parts.push(`${restored.graphics.length} graphic${restored.graphics.length === 1 ? '' : 's'} (off-air)`); }
      if (restored.ar) { restoreAr(restored.ar); if (restored.ar.length) parts.push(`${restored.ar.length} AR element${restored.ar.length === 1 ? '' : 's'} (off-air)`); }
      if (restored.lighting) { setLighting(restored.lighting); parts.push('lighting'); }
      if (restored.timelineCues) { restoreCues(restored.timelineCues.cues, restored.timelineCues.duration); if (restored.timelineCues.cues.length) parts.push(`${restored.timelineCues.cues.length} timeline cue${restored.timelineCues.cues.length === 1 ? '' : 's'}`); }
      const extrasNote = parts.length ? ` Also restored ${parts.join(', ')}.` : '';

      dispatch({ type: 'SHOW_TOAST', message: `Opened project: ${restored.projectName}.${assetNote}${extrasNote} Live sources need reconnection.` });
    } catch (error) {
      dispatch({ type: 'SHOW_TOAST', message: `Open Project failed: ${error instanceof Error ? error.message : 'invalid file'}` });
    }
  };

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
        {/* The active project name is real state, but switching between saved
            projects requires the persistent project service. Until then this is
            a read-only display of the open project — disabled, not faked. */}
        <select
          value={state.projectName}
          disabled
          title="Switching saved projects requires the persistent project service. Use Open Project to load a .chaseproj file."
          style={{ maxWidth: 180, fontSize: 11 }}
          aria-label="Active project (read-only until persistent project service)"
        >
          <option value={state.projectName}>{state.projectName}</option>
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Button onClick={() => void saveProject()}><Save size={14} /> Save Project</Button>
        <Button onClick={() => openRef.current?.click()}><FolderOpen size={14} /> Open Project</Button>
        <input ref={openRef} type="file" accept=".chaseproj,application/json" hidden onChange={(e) => void openProject(e.currentTarget.files?.[0])} />
        {/* New / Import need the persistent project service to do real work.
            Disabled honestly rather than firing a no-op toast. */}
        <Button disabled title="New project requires the persistent project service (not connected). Use Open Project to load a saved .chaseproj." aria-label="New project (requires project service)"><FilePlus size={14} /> New</Button>
        <Button disabled title="Import requires the persistent project service (not connected). Use Open Project, or add sources in the Switcher." aria-label="Import (requires project service)"><Upload size={14} /> Import</Button>
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
        {/* Real capture: MediaRecorder writes the Program output to a .webm
            file. Enabled only when a Program source is on air. */}
        <Button
          data-testid="record-status"
          variant={capturing ? 'danger' : 'secondary'}
          disabled={!canRecord && !capturing}
          onClick={() => toggleCapture()}
          aria-pressed={capturing}
          title={canRecord || capturing ? 'Capture the Program output to a .webm file' : 'Put a source on Program to capture'}
        >
          <Circle size={10} fill="var(--status-rec)" className={capturing ? 'rec-pulse' : ''} />
          {recordLabel}
        </Button>
        <input
          type="url"
          value={ingestUrl}
          onChange={(e) => setIngestUrl(e.currentTarget.value)}
          disabled={onAir}
          placeholder="WHIP endpoint URL"
          aria-label="WHIP endpoint URL"
          spellCheck={false}
          style={{ width: 210, fontSize: 11, padding: '4px 8px' }}
        />
        <Button
          data-testid="live-status"
          variant={onAir ? 'danger' : 'secondary'}
          disabled={!canStream && !onAir}
          onClick={() => toggleAir(ingestUrl)}
          aria-pressed={onAir}
          title={canStream || onAir ? 'Publish the Program output to a WHIP ingest server' : 'Put a source on Program to publish'}
        >
          <Radio size={12} className={onAir ? 'rec-pulse' : ''} />
          {liveLabel}
        </Button>
      </div>
    </header>
  );
}
