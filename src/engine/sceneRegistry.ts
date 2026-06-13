/** Maps CHASE UI object/layer IDs to scene mesh metadata keys. */
export const SCENE_OBJECT_IDS = [
  'desk',
  'screen',
  'pillar',
  'ring',
  'plant',
  'chair',
  'led-main',
  'led-side',
  'lights',
  'floor',
  'presenter',
] as const;

export type SceneObjectId = (typeof SCENE_OBJECT_IDS)[number];

export const LAYER_TO_OBJECT: Record<string, SceneObjectId> = {
  desk: 'desk',
  'led-main': 'led-main',
  'led-side': 'led-side',
  lights: 'lights',
  floor: 'floor',
  plant: 'plant',
  presenter: 'presenter',
};

export const CAMERA_IDS = ['cam1', 'cam2', 'cam3', 'cam4', 'cam5', 'cam6'] as const;

export type CameraId = (typeof CAMERA_IDS)[number];

export interface SceneNodeInfo {
  id: string;
  name: string;
  type: 'mesh' | 'light' | 'camera' | 'transform';
}

export type TransformMode = 'select' | 'translate' | 'rotate' | 'scale';

export interface DeskSceneRefs {
  desk: import('@babylonjs/core').Mesh;
  deskScreen: import('@babylonjs/core').Mesh;
  deskMaterial: import('@babylonjs/core').StandardMaterial;
  floorMaterial: import('@babylonjs/core').StandardMaterial;
  environmentRoot: import('@babylonjs/core').TransformNode;
}
