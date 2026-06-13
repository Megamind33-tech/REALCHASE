import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Engine,
  FilesInputStore,
  FreeCamera,
  GizmoManager,
  Mesh,
  MeshBuilder,
  ImportMeshAsync,
  PointerEventTypes,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { loadScene, type SceneLoaderQualitySelector } from 'babylonjs-editor-tools';
import {
  applyCameraLens,
  applyDeskVisuals,
  bindEngineResize,
  buildDefaultStudioScene,
} from './defaultStudioScene';
import { QUALITY_PROFILES } from './qualityProfile';
import type { CameraId, DeskSceneRefs, SceneNodeInfo, TransformMode } from './sceneRegistry';
import { LAYER_TO_OBJECT } from './sceneRegistry';
import type { DeskProperties, QualityMode } from '@/context/shellTypes';

export type StudioEngineListener = (event: StudioEngineEvent) => void;

export type StudioEngineEvent =
  | { type: 'ready' }
  | { type: 'fps'; value: number }
  | { type: 'selected'; objectId: string | null }
  | { type: 'scene-graph'; nodes: SceneNodeInfo[] }
  | { type: 'error'; message: string };

export class StudioEngine {
  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private gizmoManager: GizmoManager | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private listeners = new Set<StudioEngineListener>();
  private refs: DeskSceneRefs | null = null;
  private cameras = new Map<CameraId, ArcRotateCamera>();
  private activeCameraId: CameraId = 'cam1';
  private selectedId: string | null = 'desk';
  private transformMode: TransformMode = 'select';
  private qualityMode: QualityMode = 'balanced';
  private orthoCamera: FreeCamera | null = null;
  private viewportMode: '3d' | '2d' = '3d';
  private deskProps: DeskProperties | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private disposed = false;
  private packNodes: Array<AbstractMesh | TransformNode> = [];

  init(canvas: HTMLCanvasElement) {
    if (this.engine) return;
    this.canvas = canvas;

    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: true,
      antialias: true,
    });

    this.scene = new Scene(this.engine);
    const built = buildDefaultStudioScene(this.scene);
    this.refs = built.refs;
    this.cameras = built.cameras;

    this.gizmoManager = new GizmoManager(this.scene);
    this.gizmoManager.usePointerToAttachGizmos = false;
    this.gizmoManager.positionGizmoEnabled = true;
    this.gizmoManager.rotationGizmoEnabled = false;
    this.gizmoManager.scaleGizmoEnabled = false;

    this.setupPicking();
    this.selectObject('desk');
    this.applyQuality(this.qualityMode);
    this.attachActiveCameraControls();
    this.resizeObserver = bindEngineResize(this.engine, canvas);

    this.engine.runRenderLoop(() => {
      if (this.disposed || !this.scene || !this.engine) return;
      this.scene.render();
    });

    this.emit({ type: 'ready' });
    this.emitSceneGraph();

    let lastFps = 0;
    this.scene.onAfterRenderObservable.add(() => {
      if (!this.engine) return;
      const fps = Math.round(this.engine.getFps());
      if (fps !== lastFps) {
        lastFps = fps;
        this.emit({ type: 'fps', value: fps });
      }
    });
  }

  private setupPicking() {
    if (!this.scene) return;
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) return;
      if (this.transformMode !== 'select') return;
      const pick = pointerInfo.pickInfo;
      if (!pick?.hit || !pick.pickedMesh) return;
      const id = this.resolveObjectId(pick.pickedMesh);
      if (id) this.selectObject(id);
    });
  }

  private resolveObjectId(mesh: AbstractMesh): string | null {
    let current: AbstractMesh | TransformNode | null = mesh;
    while (current) {
      const chaseId = current.metadata?.chaseId as string | undefined;
      if (chaseId && chaseId !== 'desk-screen') return chaseId;
      current = current.parent as AbstractMesh | TransformNode | null;
    }
    return null;
  }

  private findMeshById(id: string): AbstractMesh | TransformNode | null {
    if (!this.scene) return null;
    if (id === 'lights') {
      return this.scene.transformNodes.find((n) => n.metadata?.chaseId === 'lights') ?? null;
    }
    return (
      this.scene.meshes.find((m) => m.metadata?.chaseId === id) ??
      this.scene.transformNodes.find((n) => n.metadata?.chaseId === id) ??
      null
    );
  }

  private emitSceneGraph() {
    this.emit({ type: 'scene-graph', nodes: this.getSceneNodes() });
  }

  private createUniqueNodeId(name: string) {
    const base = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'node';
    let id = base;
    let suffix = 2;
    while (this.findMeshById(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    return id;
  }

  private tagImportedRoots(nodes: Array<AbstractMesh | TransformNode>, sourceName: string) {
    const imported = new Set(nodes);
    nodes.forEach((node) => {
      if (node.parent && imported.has(node.parent as AbstractMesh | TransformNode)) return;
      const id = (node.metadata?.chaseId as string | undefined) ?? this.createUniqueNodeId(node.name || sourceName);
      node.metadata = {
        ...node.metadata,
        chaseId: id,
        displayName: node.metadata?.displayName ?? node.name ?? sourceName,
        imported: true,
      };
    });
  }

  async loadPack(packId: string, onProgress?: (value: number) => void) {
    if (!this.scene) throw new Error('Scene is not ready');

    const scene = this.scene;
    const beforeMeshes = new Set(scene.meshes);
    const beforeTransforms = new Set(scene.transformNodes);
    const quality: Record<QualityMode, SceneLoaderQualitySelector> = {
      low: 'very-low',
      balanced: 'medium',
      high: 'high',
    };

    try {
      await loadScene(`/scenes/${packId}/`, 'scene.babylon', scene, {}, {
        quality: quality[this.qualityMode],
        onProgress,
      });

      this.packNodes.forEach((node) => {
        if (!node.isDisposed()) node.dispose();
      });

      const loadedNodes: Array<AbstractMesh | TransformNode> = [
        ...scene.meshes.filter((node) => !beforeMeshes.has(node)),
        ...scene.transformNodes.filter((node) => !beforeTransforms.has(node)),
      ];
      this.tagImportedRoots(loadedNodes, packId);
      this.packNodes = loadedNodes;
      this.refs?.environmentRoot.setEnabled(false);
      this.setActiveCamera(this.activeCameraId);
      this.emitSceneGraph();
      const firstNode = this.getSceneNodes()[0];
      if (firstNode) this.selectObject(firstNode.id);
      return loadedNodes.length;
    } catch (error) {
      scene.meshes.filter((node) => !beforeMeshes.has(node)).forEach((node) => node.dispose());
      scene.transformNodes.filter((node) => !beforeTransforms.has(node)).forEach((node) => node.dispose());
      this.refs?.environmentRoot.setEnabled(true);
      const message = error instanceof Error ? error.message : `Unable to load studio pack ${packId}`;
      this.emit({ type: 'error', message });
      throw error;
    }
  }

  async importGltfFiles(files: File[]) {
    if (!this.scene) throw new Error('Scene is not ready');
    const assets = files.filter((file) => /\.(glb|gltf)$/i.test(file.name));
    if (assets.length === 0) throw new Error('Drop a .glb or .gltf file');

    files.forEach((file) => {
      FilesInputStore.FilesToLoad[file.name.toLowerCase()] = file;
    });

    let importedCount = 0;
    let firstImportedId: string | null = null;
    for (const file of assets) {
      const extension = file.name.toLowerCase().endsWith('.glb') ? '.glb' : '.gltf';
      const result = await ImportMeshAsync(file, this.scene, {
        pluginExtension: extension,
        name: file.name,
      });
      const nodes: Array<AbstractMesh | TransformNode> = [...result.meshes, ...result.transformNodes];
      this.tagImportedRoots(nodes, file.name.replace(/\.(glb|gltf)$/i, ''));
      firstImportedId ??= nodes.find((node) => node.metadata?.imported === true)?.metadata?.chaseId ?? null;
      importedCount += result.meshes.length;
    }

    this.emitSceneGraph();
    if (firstImportedId) this.selectObject(firstImportedId);
    return importedCount;
  }

  selectObject(id: string) {
    const changed = this.selectedId !== id;
    this.selectedId = id;
    const target = this.findMeshById(id);
    if (this.gizmoManager) {
      if (target instanceof Mesh) {
        this.gizmoManager.attachToMesh(target);
      } else if (target instanceof TransformNode) {
        this.gizmoManager.attachToNode(target);
      } else {
        this.gizmoManager.attachToMesh(null);
      }
    }
    if (changed) this.emit({ type: 'selected', objectId: id });
  }

  selectLayer(layerId: string) {
    this.selectObject(LAYER_TO_OBJECT[layerId] ?? layerId);
  }

  setTransformMode(mode: TransformMode) {
    this.transformMode = mode;
    if (!this.gizmoManager) return;
    this.gizmoManager.positionGizmoEnabled = mode === 'translate' || mode === 'select';
    this.gizmoManager.rotationGizmoEnabled = mode === 'rotate';
    this.gizmoManager.scaleGizmoEnabled = mode === 'scale';
  }

  focusSelection() {
    const cam = this.cameras.get(this.activeCameraId);
    const target = this.findMeshById(this.selectedId ?? 'desk');
    if (!cam || !target) return;
    const pos = target instanceof Mesh ? target.getAbsolutePosition() : target.getAbsolutePosition();
    cam.setTarget(pos);
  }

  setActiveCamera(id: CameraId) {
    const next = this.cameras.get(id);
    if (!next || !this.scene) return;
    this.cameras.get(this.activeCameraId)?.detachControl();
    this.cameras.get(this.activeCameraId)?.setEnabled(false);
    next.setEnabled(true);
    this.scene.activeCamera = next;
    this.activeCameraId = id;
    if (this.viewportMode === '3d') {
      next.attachControl(this.canvas, true);
    }
    if (this.deskProps) {
      applyCameraLens(next, this.deskProps.focalLength, this.deskProps.depthOfField);
    }
  }

  private attachActiveCameraControls() {
    const cam = this.cameras.get(this.activeCameraId);
    if (cam && this.canvas && this.viewportMode === '3d') {
      cam.attachControl(this.canvas, true);
    }
  }

  setViewportMode(mode: '3d' | '2d') {
    this.viewportMode = mode;
    if (!this.scene) return;
    if (mode === '2d') {
      this.cameras.forEach((c) => {
        c.detachControl();
        c.setEnabled(false);
      });
      if (!this.orthoCamera) {
        this.orthoCamera = new FreeCamera('orthoTop', new Vector3(0, 20, 0), this.scene);
        this.orthoCamera.setTarget(Vector3.Zero());
        this.orthoCamera.mode = 1;
        this.orthoCamera.orthoTop = 10;
        this.orthoCamera.orthoBottom = -10;
        this.orthoCamera.orthoLeft = -14;
        this.orthoCamera.orthoRight = 14;
      }
      this.cameras.forEach((c) => c.setEnabled(false));
      this.orthoCamera.setEnabled(true);
      this.scene.activeCamera = this.orthoCamera;
    } else {
      this.orthoCamera?.setEnabled(false);
      this.setActiveCamera(this.activeCameraId);
    }
  }

  applyDeskProperties(props: DeskProperties) {
    this.deskProps = props;
    if (!this.refs) return;
    applyDeskVisuals(this.refs, {
      deskColor: props.deskColor,
      deskGlow: props.deskGlow,
      deskScreen: props.deskScreen,
      deskScreenText: props.deskScreenText,
      floorReflection: props.floorReflection,
      envRotation: props.envRotation,
    });
    const cam = this.cameras.get(this.activeCameraId);
    if (cam) applyCameraLens(cam, props.focalLength, props.depthOfField);
  }

  applyQuality(mode: QualityMode) {
    this.qualityMode = mode;
    if (!this.engine || !this.scene) return;
    const profile = QUALITY_PROFILES[mode];
    this.engine.setHardwareScalingLevel(1 / profile.hardwareScaling);
    this.scene.shadowsEnabled = profile.shadowsEnabled;
    this.scene.meshes.forEach((m) => {
      if (m.material) m.material.needDepthPrePass = false;
    });
    if (this.refs) {
      const s = profile.reflectivity * 0.4;
      this.refs.floorMaterial.specularColor = new Color3(s, s, s * 1.2);
    }
  }

  addSceneObject(objectId: string): boolean {
    if (!this.scene || !this.refs) return false;
    const existing = this.findMeshById(objectId);
    if (existing) {
      this.selectObject(objectId);
      return true;
    }

    let mesh: Mesh;
    switch (objectId) {
      case 'screen': {
        mesh = MeshBuilder.CreatePlane('verticalScreen', { width: 1.2, height: 2.2 }, this.scene);
        mesh.position.set(-2, 1.5, 3);
        break;
      }
      case 'chair': {
        mesh = MeshBuilder.CreateBox('guestChair', { width: 0.6, height: 0.9, depth: 0.6 }, this.scene);
        mesh.position.set(2.5, 0.45, 2);
        break;
      }
      case 'pillar': {
        mesh = MeshBuilder.CreateCylinder('extraPillar', { height: 3, diameter: 0.2 }, this.scene);
        mesh.position.set(-4, 1.5, 4);
        break;
      }
      default:
        return false;
    }
    const mat = new StandardMaterial(`${objectId}Mat`, this.scene);
    mat.diffuseColor = new Color3(0.3, 0.32, 0.38);
    mesh.material = mat;
    mesh.metadata = { chaseId: objectId, displayName: objectId };
    mesh.parent = this.refs.environmentRoot;
    this.selectObject(objectId);
    this.emitSceneGraph();
    return true;
  }

  getSceneNodes(): SceneNodeInfo[] {
    if (!this.scene) return [];
    const nodes = new Map<string, SceneNodeInfo>();
    this.scene.meshes.forEach((m) => {
      const id = m.metadata?.chaseId as string | undefined;
      if (id && m.name && id !== 'desk-screen' && m.isEnabled(true)) {
        nodes.set(id, { id, name: m.metadata.displayName ?? m.name, type: 'mesh' });
      }
    });
    this.scene.transformNodes.forEach((n) => {
      const id = n.metadata?.chaseId as string | undefined;
      if (id && n.isEnabled(true)) {
        nodes.set(id, { id, name: n.metadata.displayName ?? n.name, type: 'transform' });
      }
    });
    return [...nodes.values()];
  }

  /** The canvas this engine is bound to, or null before init/after dispose. */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  subscribe(listener: StudioEngineListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: StudioEngineEvent) {
    this.listeners.forEach((l) => l(event));
  }

  dispose() {
    this.disposed = true;
    this.resizeObserver?.disconnect();
    this.gizmoManager?.dispose();
    this.scene?.dispose();
    this.engine?.dispose();
    this.engine = null;
    this.scene = null;
    this.canvas = null;
  }
}
