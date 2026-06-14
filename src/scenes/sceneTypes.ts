import type { DeskProperties } from '@/context/shellTypes';

/** A single scene node's local transform, captured for scene snapshots. */
export interface NodeTransform {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number]; // Euler radians
  scaling: [number, number, number];
}

/** Engine-side state captured/restored for a saved scene. */
export interface StudioSceneSnapshot {
  nodes: NodeTransform[];
  activeCameraId: string;
}

/** A named scene the user can save and recall. Combines engine snapshot
 *  (object transforms + camera) with the shell-level desk properties. */
export interface SavedScene {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail: string; // data:image/png;base64,…  (empty string if capture failed)
  snapshot: StudioSceneSnapshot;
  desk: DeskProperties;
}

export function makeSceneId(): string {
  return `scene_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
