import { DEFAULT_KEYING_SETTINGS, type Source } from '@/sources/sourceTypes';
import type { ShellState } from '@/context/shellTypes';
import type { SceneSnapshot } from '@/integrations/render-engine/types';

const EMPTY_SCENE: SceneSnapshot = { assets: [], groups: [] };

export interface ChaseProjectFile {
  schemaVersion: 1;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  scene: { activeSetId: string; cameraView: string; placements: Array<Record<string, unknown>> };
  /** Imported 3D assets + groups (the multi-asset studio scene). */
  assetScene: SceneSnapshot;
  sources: Array<Record<string, unknown>>;
  programSourceId: string | null;
  previewSourceId: string | null;
  keying: Record<string, unknown>;
  ui: Record<string, unknown>;
}

export function buildProjectFile(shell: ShellState, sources: Source[], previewId: string | null, programId: string | null, assetScene: SceneSnapshot = EMPTY_SCENE): ChaseProjectFile {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    projectName: shell.projectName || 'Untitled CHASE Project',
    createdAt: now,
    updatedAt: now,
    scene: {
      activeSetId: 'default-studio',
      cameraView: shell.activeCameraId,
      placements: sources.map((s) => ({ sourceId: s.id, mode: s.placement, screenTargetId: s.screenTargetId ?? null })),
    },
    assetScene,
    sources: sources.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      status: s.stream ? 'needsReconnect' : s.status,
      createdAt: s.createdAt,
      placement: s.placement,
      screenTargetId: s.screenTargetId ?? null,
      keying: s.keying ?? DEFAULT_KEYING_SETTINGS,
      needsReconnect: Boolean(s.stream) || s.needsReconnect,
    })),
    programSourceId: programId,
    previewSourceId: previewId,
    keying: Object.fromEntries(sources.map((s) => [s.id, s.keying ?? DEFAULT_KEYING_SETTINGS])),
    ui: { viewportMode: shell.viewportMode, qualityMode: shell.qualityMode },
  };
}

export function parseProjectFile(text: string): { sources: Source[]; previewId: string | null; programId: string | null; projectName: string; assetScene: SceneSnapshot } {
  const file = JSON.parse(text) as ChaseProjectFile & { assets?: unknown };
  if (file.schemaVersion !== 1 || !Array.isArray(file.sources) || !file.scene) throw new Error('Invalid .chaseproj schema');
  // Back-compat: PR #23 wrote a flat `assets` array; PR #24+ writes `assetScene`.
  const assetScene: SceneSnapshot = file.assetScene && Array.isArray(file.assetScene.assets)
    ? { assets: file.assetScene.assets, groups: Array.isArray(file.assetScene.groups) ? file.assetScene.groups : [] }
    : { assets: Array.isArray(file.assets) ? (file.assets as SceneSnapshot['assets']) : [], groups: [] };
  const sources = file.sources.map((raw) => ({
    id: String(raw.id),
    name: String(raw.name ?? 'Restored Source'),
    type: raw.type === 'webcam' ? 'webcam' : 'media',
    status: 'idle',
    createdAt: Number(raw.createdAt ?? Date.now()),
    stream: null,
    error: 'Source restored from project; reconnect live media.',
    placement: raw.placement === 'screenInsert' || raw.placement === 'presenterPlate' || raw.placement === 'backgroundPlate' ? raw.placement : 'mediaPlane',
    screenTargetId: typeof raw.screenTargetId === 'string' ? raw.screenTargetId : 'led-main',
    keying: typeof raw.keying === 'object' && raw.keying ? { ...DEFAULT_KEYING_SETTINGS, ...raw.keying } : DEFAULT_KEYING_SETTINGS,
    needsReconnect: true,
  })) satisfies Source[];
  return { sources, previewId: file.previewSourceId, programId: file.programSourceId, projectName: file.projectName, assetScene };
}

export async function saveProjectFile(project: ChaseProjectFile): Promise<string> {
  const text = JSON.stringify(project, null, 2);
  const w = window as typeof window & { __TAURI_INTERNALS__?: unknown; showSaveFilePicker?: (opts: unknown) => Promise<{ createWritable: () => Promise<{ write: (text: string) => Promise<void>; close: () => Promise<void> }> }> };
  if (w.__TAURI_INTERNALS__) {
    const dynImport = new Function('s', 'return import(s)') as (s: string) => Promise<any>;
    const dialog = await dynImport('@tauri-apps/plugin-dialog').catch(() => null);
    const fs = await dynImport('@tauri-apps/plugin-fs').catch(() => null);
    const path = dialog ? await dialog.save({ defaultPath: `${project.projectName}.chaseproj`, filters: [{ name: 'CHASE Project', extensions: ['chaseproj'] }] }) : null;
    if (!path) return 'cancelled';
    await fs.writeTextFile(path, text);
    return String(path);
  }
  if (w.showSaveFilePicker) {
    const handle = await w.showSaveFilePicker({ suggestedName: `${project.projectName}.chaseproj`, types: [{ description: 'CHASE Project', accept: { 'application/json': ['.chaseproj'] } }] });
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    return 'browser-file-system-access';
  }
  localStorage.setItem('chase:lastProject', text);
  return 'localStorage fallback';
}
