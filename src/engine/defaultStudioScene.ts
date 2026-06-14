import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  DynamicTexture,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PointLight,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { DeskSceneRefs } from './sceneRegistry';
import { CAMERA_IDS, type CameraId } from './sceneRegistry';

function tag(mesh: Mesh, chaseId: string, displayName: string) {
  mesh.metadata = { chaseId, displayName };
  mesh.name = displayName;
}

export interface DefaultSceneResult {
  refs: DeskSceneRefs;
  cameras: Map<CameraId, ArcRotateCamera>;
}

export function buildDefaultStudioScene(scene: Scene): DefaultSceneResult {
  scene.clearColor = new Color4(0.02, 0.02, 0.03, 1);

  const environmentRoot = new TransformNode('environment', scene);

  // Floor
  const floor = MeshBuilder.CreateGround('floor', { width: 24, height: 18, subdivisions: 2 }, scene);
  floor.parent = environmentRoot;
  floor.position.y = 0;
  const floorMat = new StandardMaterial('floorMat', scene);
  floorMat.diffuseColor = new Color3(0.08, 0.08, 0.1);
  floorMat.specularColor = new Color3(0.15, 0.15, 0.2);
  floorMat.reflectionTexture = null;
  floor.material = floorMat;

  // Floor ring
  const floorRing = MeshBuilder.CreateTorus('floorRing', { diameter: 8, thickness: 0.08, tessellation: 48 }, scene);
  floorRing.parent = environmentRoot;
  floorRing.position.y = 0.05;
  floorRing.rotation.x = Math.PI / 2;
  const ringMat = new StandardMaterial('ringMat', scene);
  ringMat.emissiveColor = new Color3(0.1, 0.5, 0.35);
  ringMat.diffuseColor = new Color3(0.05, 0.2, 0.15);
  floorRing.material = ringMat;
  tag(floorRing, 'floor', 'Floor Ring');

  // Back LED walls
  const ledMain = MeshBuilder.CreatePlane('ledMain', { width: 10, height: 4 }, scene);
  ledMain.parent = environmentRoot;
  ledMain.position.set(0, 3, 7);
  const ledMainMat = new StandardMaterial('ledMainMat', scene);
  ledMainMat.emissiveColor = new Color3(0.05, 0.15, 0.4);
  ledMainMat.diffuseColor = new Color3(0.02, 0.05, 0.15);
  ledMain.material = ledMainMat;
  tag(ledMain, 'led-main', 'LED Wall Main');

  const ledSide = MeshBuilder.CreatePlane('ledSide', { width: 4, height: 3 }, scene);
  ledSide.parent = environmentRoot;
  ledSide.position.set(-6, 2.5, 4);
  ledSide.rotation.y = 0.6;
  ledSide.material = ledMainMat.clone('ledSideMat');
  tag(ledSide, 'led-side', 'LED Wall Side');

  // News desk
  const desk = MeshBuilder.CreateBox('newsDesk', { width: 4.2, height: 0.85, depth: 1.4 }, scene);
  desk.parent = environmentRoot;
  desk.position.set(0, 0.425, 1.5);
  const deskMat = new StandardMaterial('deskMat', scene);
  deskMat.diffuseColor = Color3.FromHexString('#1a1a2e');
  deskMat.specularColor = new Color3(0.2, 0.2, 0.25);
  desk.material = deskMat;
  tag(desk, 'desk', 'News Desk');

  const deskScreen = MeshBuilder.CreatePlane('deskScreen', { width: 1.8, height: 0.5 }, scene);
  deskScreen.parent = desk;
  deskScreen.position.set(0, 0.55, -0.71);
  deskScreen.rotation.x = -0.15;
  const screenMat = new StandardMaterial('deskScreenMat', scene);
  screenMat.emissiveColor = new Color3(0.1, 0.25, 0.6);
  screenMat.diffuseColor = new Color3(0.02, 0.05, 0.12);
  deskScreen.material = screenMat;
  tag(deskScreen, 'desk-screen', 'Desk Screen');

  updateDeskScreenTexture(deskScreen, 'CHASE NEWS');

  // Pillar lights
  const pillarRoot = new TransformNode('pillarLights', scene);
  pillarRoot.parent = environmentRoot;
  const accentLights: PointLight[] = [];
  [-3.5, 3.5].forEach((x) => {
    const pillar = MeshBuilder.CreateCylinder('pillar', { height: 4, diameter: 0.25 }, scene);
    pillar.parent = pillarRoot;
    pillar.position.set(x, 2, 5);
    const pMat = new StandardMaterial(`pillarMat_${x}`, scene);
    pMat.emissiveColor = new Color3(0.4, 0.45, 0.55);
    pillar.material = pMat;

    const pl = new PointLight(`pillarLight_${x}`, new Vector3(x, 3.5, 5), scene);
    pl.intensity = 0.8;
    pl.diffuse = new Color3(0.7, 0.75, 1);
    accentLights.push(pl);
  });
  pillarRoot.metadata = { chaseId: 'lights', displayName: 'Pillar Lights' };

  // Key light — the main directional studio light (gives form/shadowing).
  const keyLight = new DirectionalLight('keyLight', new Vector3(-0.4, -1, 0.3), scene);
  keyLight.position = new Vector3(4, 9, -3);
  keyLight.intensity = 1.0;
  keyLight.diffuse = new Color3(1, 0.96, 0.9);

  // Decor plant
  const plantPot = MeshBuilder.CreateCylinder('plantPot', { height: 0.5, diameter: 0.4 }, scene);
  plantPot.parent = environmentRoot;
  plantPot.position.set(4.5, 0.25, 2);
  const plantTop = MeshBuilder.CreateSphere('plantTop', { diameter: 0.9, segments: 8 }, scene);
  plantTop.parent = plantPot;
  plantTop.position.y = 0.55;
  const plantMat = new StandardMaterial('plantMat', scene);
  plantMat.diffuseColor = new Color3(0.15, 0.35, 0.15);
  plantTop.material = plantMat;
  plantPot.material = plantMat;
  tag(plantTop, 'plant', 'Decor Plant');

  // Ambient
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.45;
  hemi.groundColor = new Color3(0.05, 0.05, 0.08);
  hemi.diffuse = new Color3(0.85, 0.88, 0.95);

  const cameras = new Map<CameraId, ArcRotateCamera>();
  const camDefs: Record<CameraId, { alpha: number; beta: number; radius: number; target: Vector3 }> = {
    cam1: { alpha: -Math.PI / 2, beta: 1.1, radius: 14, target: new Vector3(0, 1.2, 1) },
    cam2: { alpha: -Math.PI / 2, beta: 1.25, radius: 5.5, target: new Vector3(0, 0.9, 1.5) },
    cam3: { alpha: -Math.PI / 2 - 0.9, beta: 1.15, radius: 10, target: new Vector3(-2, 2, 4) },
    cam4: { alpha: -Math.PI / 2 + 0.9, beta: 1.15, radius: 10, target: new Vector3(2, 2, 4) },
    cam5: { alpha: -Math.PI / 2, beta: 0.35, radius: 12, target: new Vector3(0, 1, 2) },
    cam6: { alpha: -Math.PI / 2, beta: 1.55, radius: 6, target: new Vector3(0, 0.2, 0) },
  };

  CAMERA_IDS.forEach((id, index) => {
    const def = camDefs[id];
    const cam = new ArcRotateCamera(
      `camera_${id}`,
      def.alpha,
      def.beta,
      def.radius,
      def.target,
      scene,
    );
    cam.minZ = 0.1;
    cam.maxZ = 200;
    cam.metadata = { chaseCameraId: id, displayName: `CAM ${index + 1}` };
    if (index === 0) {
      scene.activeCamera = cam;
    } else {
      cam.setEnabled(false);
    }
    cameras.set(id, cam);
  });

  return {
    refs: {
      desk,
      deskScreen,
      deskMaterial: deskMat,
      floorMaterial: floorMat,
      environmentRoot,
      keyLight,
      hemiLight: hemi,
      accentLights,
    },
    cameras,
  };
}

export function updateDeskScreenTexture(screenMesh: Mesh, text: string) {
  const tex = new DynamicTexture('deskScreenTex', { width: 512, height: 128 }, screenMesh.getScene());
  tex.drawText(text, 40, 80, 'bold 48px Inter', '#ffffff', '#0a1628', true);
  const mat = screenMesh.material as StandardMaterial;
  mat.emissiveTexture = tex;
  mat.emissiveColor = new Color3(1, 1, 1);
}

export function hexToColor3(hex: string): Color3 {
  return Color3.FromHexString(hex.startsWith('#') ? hex : `#${hex}`);
}

export function applyDeskVisuals(
  refs: DeskSceneRefs,
  opts: {
    deskColor: string;
    deskGlow: boolean;
    deskScreen: boolean;
    deskScreenText: string;
    floorReflection: number;
    envRotation: number;
  },
) {
  refs.deskMaterial.diffuseColor = hexToColor3(opts.deskColor);
  refs.deskMaterial.emissiveColor = opts.deskGlow
    ? refs.deskMaterial.diffuseColor.scale(0.15)
    : Color3.Black();

  refs.deskScreen.setEnabled(opts.deskScreen);
  if (opts.deskScreen) {
    updateDeskScreenTexture(refs.deskScreen, opts.deskScreenText);
  }

  const spec = opts.floorReflection / 100;
  refs.floorMaterial.specularColor = new Color3(spec * 0.4, spec * 0.4, spec * 0.5);

  refs.environmentRoot.rotation.y = (opts.envRotation * Math.PI) / 180;
}

export function focalLengthToFov(mm: number): number {
  const sensorHeight = 24;
  return 2 * Math.atan(sensorHeight / (2 * mm));
}

export function applyCameraLens(camera: ArcRotateCamera, focalLength: number, depthOfField: number) {
  camera.fov = focalLengthToFov(focalLength);
  camera.minZ = 0.05 + (100 - depthOfField) * 0.002;
}

/** Resize engine to canvas container. */
export function bindEngineResize(engine: Engine, canvas: HTMLCanvasElement) {
  const observer = new ResizeObserver(() => {
    engine.resize();
  });
  observer.observe(canvas.parentElement ?? canvas);
  return observer;
}
