import { DEFAULT_KEYING_SETTINGS, type Source } from '@/sources/sourceTypes';
import type { ShellState } from '@/context/shellTypes';
import type { SceneSnapshot } from '@/integrations/render-engine/types';
import type { SavedScene } from '@/scenes/sceneTypes';
import type { GraphicItem } from '@/graphics/graphicsTypes';
import type { ArElement } from '@/ar/arTypes';
import type { Cue } from '@/timeline/timelineTypes';
import { DEFAULT_LIGHTING, type LightingSettings } from '@/engine/lighting';

const EMPTY_SCENE: SceneSnapshot = { assets: [], groups: [] };

/** Optional studio sections captured into a saved project alongside the core
 *  source/asset state. Each is independent and tolerated when missing so older
 *  files (schemaVersion 1) still open. */
export interface ProjectExtras {
  /** User-saved Scenes (object transforms + camera + desk props). */
  scenes?: SavedScene[];
  /** Broadcast graphics (lower thirds, tickers, logo bugs). */
  graphics?: GraphicItem[];
  /** On-air AR elements/templates anchored in the studio. */
  ar?: ArElement[];
  /** Studio lighting channels. */
  lighting?: LightingSettings;
  /** Timeline cues + the timeline duration. */
  timelineCues?: { cues: Cue[]; duration: number };
}

export interface ChaseProjectFile {
  schemaVersion: 2;
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
  // --- v2 optional sections (omitted when empty) ---
  scenes?: SavedScene[];
  graphics?: GraphicItem[];
  ar?: ArElement[];
  lighting?: LightingSettings;
  timelineCues?: { cues: Cue[]; duration: number };
}

/** Restored project payload handed back to the Open handler. The optional
 *  sections are present only when the loaded file carried them. */
export interface RestoredProject {
  sources: Source[];
  previewId: string | null;
  programId: string | null;
  projectName: string;
  assetScene: SceneSnapshot;
  scenes?: SavedScene[];
  graphics?: GraphicItem[];
  ar?: ArElement[];
  lighting?: LightingSettings;
  timelineCues?: { cues: Cue[]; duration: number };
}

export function buildProjectFile(
  shell: ShellState,
  sources: Source[],
  previewId: string | null,
  programId: string | null,
  assetScene: SceneSnapshot = EMPTY_SCENE,
  extras: ProjectExtras = {},
): ChaseProjectFile {
  const now = new Date().toISOString();
  const file: ChaseProjectFile = {
    schemaVersion: 2,
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
  // Attach optional sections only when they carry data, keeping files lean and
  // back-compatible. None of these hold secrets (stream keys live elsewhere and
  // are never persisted).
  if (extras.scenes && extras.scenes.length) file.scenes = extras.scenes;
  if (extras.graphics && extras.graphics.length) file.graphics = extras.graphics;
  if (extras.ar && extras.ar.length) {
    // AR is persisted off-air; a file must never auto-composite into Program.
    file.ar = extras.ar.map((e) => ({ ...e, onAir: false }));
  }
  if (extras.lighting) file.lighting = extras.lighting;
  if (extras.timelineCues && extras.timelineCues.cues.length) file.timelineCues = extras.timelineCues;
  return file;
}

export function parseProjectFile(text: string): RestoredProject {
  const file = JSON.parse(text) as Omit<ChaseProjectFile, 'schemaVersion'> & { schemaVersion?: number; assets?: unknown };
  // Tolerate both v1 (sources/asset state only) and v2 (adds optional sections).
  if ((file.schemaVersion !== 1 && file.schemaVersion !== 2) || !Array.isArray(file.sources) || !file.scene) {
    throw new Error('Invalid .chaseproj schema');
  }
  // Back-compat: PR #23 wrote a flat `assets` array; PR #24+ writes `assetScene`.
  const assetScene: SceneSnapshot = file.assetScene && Array.isArray(file.assetScene.assets)
    ? { assets: file.assetScene.assets, groups: Array.isArray(file.assetScene.groups) ? file.assetScene.groups : [] }
    : { assets: Array.isArray(file.assets) ? (file.assets as SceneSnapshot['assets']) : [], groups: [] };
  const validSourceTypes = new Set<Source['type']>(['webcam', 'screen', 'video', 'image', 'media', 'ndi', 'mediamtx']);
  const sources = file.sources.map((raw) => ({
    id: String(raw.id),
    name: String(raw.name ?? 'Restored Source'),
    type: validSourceTypes.has(raw.type as Source['type']) ? raw.type as Source['type'] : 'media',
    status: 'idle',
    createdAt: Number(raw.createdAt ?? Date.now()),
    stream: null,
    error: raw.type === 'image' || raw.type === 'video' || raw.type === 'media'
      ? 'Source restored from project; choose the local file again.'
      : 'Source restored from project; reconnect live media.',
    placement: raw.placement === 'screenInsert' || raw.placement === 'presenterPlate' || raw.placement === 'backgroundPlate' ? raw.placement : 'mediaPlane',
    screenTargetId: typeof raw.screenTargetId === 'string' ? raw.screenTargetId : 'led-main',
    keying: typeof raw.keying === 'object' && raw.keying ? { ...DEFAULT_KEYING_SETTINGS, ...raw.keying } : DEFAULT_KEYING_SETTINGS,
    needsReconnect: true,
  })) satisfies Source[];

  // Optional sections — skip gracefully if absent or malformed.
  const scenes = Array.isArray(file.scenes) ? sanitizeScenes(file.scenes) : undefined;
  const graphics = Array.isArray(file.graphics) ? sanitizeGraphics(file.graphics) : undefined;
  const ar = Array.isArray(file.ar) ? sanitizeAr(file.ar) : undefined;
  const lighting = file.lighting ? sanitizeLighting(file.lighting) : undefined;
  const timelineCues = file.timelineCues && Array.isArray(file.timelineCues.cues)
    ? { cues: sanitizeCues(file.timelineCues.cues), duration: Number.isFinite(file.timelineCues.duration) ? Math.max(1, file.timelineCues.duration) : 60 }
    : undefined;

  return {
    sources,
    previewId: file.previewSourceId,
    programId: file.programSourceId,
    projectName: file.projectName,
    assetScene,
    scenes,
    graphics,
    ar,
    lighting,
    timelineCues,
  };
}

const num3 = (v: unknown, fallback: [number, number, number]): [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(n))
    ? [Number(v[0]), Number(v[1]), Number(v[2])]
    : fallback;

function sanitizeScenes(raw: unknown[]): SavedScene[] {
  return raw
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null && typeof (s as { id?: unknown }).id === 'string')
    .map((s) => s as unknown as SavedScene);
}

function sanitizeGraphics(raw: unknown[]): GraphicItem[] {
  const types = new Set(['lowerThird', 'ticker', 'logoBug']);
  return raw
    .filter((g): g is Record<string, unknown> => typeof g === 'object' && g !== null
      && typeof (g as { id?: unknown }).id === 'string'
      && types.has(String((g as { type?: unknown }).type)))
    .map((g) => g as unknown as GraphicItem);
}

function sanitizeAr(raw: unknown[]): ArElement[] {
  const kinds = new Set(['card', 'box', 'sphere', 'cylinder', 'text']);
  return raw
    .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null
      && typeof (e as { id?: unknown }).id === 'string'
      && kinds.has(String((e as { kind?: unknown }).kind)))
    .map((e) => ({
      ...(e as unknown as ArElement),
      position: num3(e.position, [0, 0, 0]),
      rotation: num3(e.rotation, [0, 0, 0]),
      scaling: num3(e.scaling, [1, 1, 1]),
      onAir: false, // never restore on-air
    }));
}

function sanitizeLighting(raw: unknown): LightingSettings {
  const r = raw as Partial<LightingSettings> | null;
  const ch = (c: unknown, fallback: { intensity: number; color: string }) => {
    const v = c as { intensity?: unknown; color?: unknown } | null;
    return {
      intensity: v && Number.isFinite(v.intensity) ? Number(v.intensity) : fallback.intensity,
      color: v && typeof v.color === 'string' ? v.color : fallback.color,
    };
  };
  return {
    key: ch(r?.key, DEFAULT_LIGHTING.key),
    ambient: ch(r?.ambient, DEFAULT_LIGHTING.ambient),
    accent: ch(r?.accent, DEFAULT_LIGHTING.accent),
  };
}

function sanitizeCues(raw: unknown[]): Cue[] {
  const types = new Set(['graphicOn', 'graphicOff', 'cameraSwitch']);
  return raw
    .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null
      && typeof (c as { id?: unknown }).id === 'string'
      && types.has(String((c as { type?: unknown }).type))
      && Number.isFinite((c as { time?: unknown }).time)
      && typeof (c as { targetId?: unknown }).targetId === 'string')
    .map((c) => c as unknown as Cue);
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
