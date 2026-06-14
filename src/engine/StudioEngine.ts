import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Color4,
  Effect,
  Engine,
  FilesInputStore,
  FreeCamera,
  GizmoManager,
  Mesh,
  MeshBuilder,
  ImportMeshAsync,
  type Observer,
  PointerEventTypes,
  RawTexture,
  RenderTargetTexture,
  Scene,
  ShaderMaterial,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector2,
  Vector3,
  Vector4,
  VideoTexture,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { loadScene, type SceneLoaderQualitySelector } from 'babylonjs-editor-tools';
import {
  applyCameraLens,
  applyDeskVisuals,
  bindEngineResize,
  buildDefaultStudioScene,
  focalLengthToFov,
} from './defaultStudioScene';
import { QUALITY_PROFILES } from './qualityProfile';
import { decodeFreeD, type FreeDPose } from './freed';
import type { CameraId, DeskSceneRefs, SceneNodeInfo, TransformMode } from './sceneRegistry';
import { LAYER_TO_OBJECT } from './sceneRegistry';
import type { DeskProperties, QualityMode } from '@/context/shellTypes';
import { DEFAULT_KEYING_SETTINGS, type KeyingSettings, type PlacementMode } from '@/sources/sourceTypes';

export type StudioEngineListener = (event: StudioEngineEvent) => void;

export type TrackingStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type StudioEngineEvent =
  | { type: 'ready' }
  | { type: 'fps'; value: number }
  | { type: 'selected'; objectId: string | null }
  | { type: 'scene-graph'; nodes: SceneNodeInfo[] }
  | { type: 'tracking'; status: TrackingStatus; message?: string }
  | { type: 'error'; message: string };

// Minimal unlit textured shader for the Program media plane. Babylon's
// StandardMaterial texture sampling misbehaves on some software-WebGL backends
// (e.g. SwiftShader in CI), so the live source is drawn with this purpose-built
// shader, which samples reliably on both GPU and software renderers.
const MEDIA_SHADER = 'chaseMedia';
let mediaShaderRegistered = false;
function registerMediaShader() {
  if (mediaShaderRegistered) return;
  Effect.ShadersStore[`${MEDIA_SHADER}VertexShader`] =
    'precision highp float; attribute vec3 position; attribute vec2 uv; uniform mat4 worldViewProjection; varying vec2 vUv; varying vec2 vScreen; void main(){ vUv = uv; vec4 cp = worldViewProjection * vec4(position, 1.0); vScreen = (cp.xy / cp.w) * 0.5 + 0.5; gl_Position = cp; }';
  // Single-pass, single-sample broadcast-style keyer (no extra render passes /
  // no per-frame CPU work) so it stays smooth: keys in CbCr chroma space
  // (luminance-tolerant → clean edges under uneven lighting), with a
  // luminance-preserving despill and a free smootherstep edge.
  Effect.ShadersStore[`${MEDIA_SHADER}FragmentShader`] = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D videoSampler;',
    'uniform int keyMode;',      // 0 disabled, 1 chromaKey, 2 alpha
    'uniform vec3 keyColor;',
    'uniform float similarity;', // base key threshold (chroma distance)
    'uniform float smoothness;', // edge softness
    'uniform float spill;',      // spill suppression amount 0..1
    'uniform float denoise;',    // edge matte denoise (0 = off, no extra taps)
    'uniform float blackClip;',  // matte black point
    'uniform float whiteClip;',  // matte white point
    'uniform vec2 texel;',       // 1 / texture size, for neighbour taps
    'uniform sampler2D bgTexture;', // rendered backdrop (scene minus this plane)
    'uniform float lightWrap;',  // backdrop bleed into subject edges (0 = off)
    'uniform vec4 garbage;',     // garbage matte rect (minX,minY,maxX,maxY); default 0,0,1,1
    'uniform vec3 matchTint;',   // lighting/colour-match tint (default white = no-op)
    'uniform float matchExposure;', // exposure multiplier for colour match
    'uniform float matchAmount;',   // 0 = off
    'uniform float opacity;',
    'uniform int showMatte;',    // 1 => render the alpha matte for calibration
    'varying vec2 vScreen;',     // this fragment's screen position (for backdrop sampling)
    // BT.601 chroma (Cb,Cr) — keying on chroma only ignores brightness, so
    // shadows/highlights on the backdrop don't tear holes in the key.
    'vec2 chroma(vec3 c){ return vec2(-0.168736*c.r - 0.331264*c.g + 0.5*c.b, 0.5*c.r - 0.418688*c.g - 0.081312*c.b); }',
    'float keyAlpha(vec3 c){ float d = distance(chroma(c), chroma(keyColor)); return smoothstep(similarity, similarity + max(smoothness, 0.0001), d); }',
    // Garbage matte: 1 inside the rect (soft edge), 0 outside. Default rect 0..1 → no-op.
    'float garbMask(vec2 p){ float f = 0.012; float mx = smoothstep(garbage.x - f, garbage.x + f, p.x) * (1.0 - smoothstep(garbage.z - f, garbage.z + f, p.x)); float my = smoothstep(garbage.y - f, garbage.y + f, p.y) * (1.0 - smoothstep(garbage.w - f, garbage.w + f, p.y)); return mx * my; }',
    'void main(){',
    '  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);',
    '  vec4 c = texture2D(videoSampler, uv);',
    '  vec3 rgb = c.rgb;',
    '  float alpha = c.a;',
    '  if (keyMode == 1) {',
    '    float a = keyAlpha(c.rgb);',
    // Edge denoise: gated so OFF costs zero extra taps (keeps it smooth).
    '    if (denoise > 0.001) {',
    '      vec2 o = texel * (1.0 + denoise * 3.0);',
    '      a += keyAlpha(texture2D(videoSampler, uv + vec2(o.x, 0.0)).rgb);',
    '      a += keyAlpha(texture2D(videoSampler, uv - vec2(o.x, 0.0)).rgb);',
    '      a += keyAlpha(texture2D(videoSampler, uv + vec2(0.0, o.y)).rgb);',
    '      a += keyAlpha(texture2D(videoSampler, uv - vec2(0.0, o.y)).rgb);',
    '      a /= 5.0;',
    '    }',
    // Matte clip (black/white points) then a free smootherstep edge.
    '    a = clamp((a - blackClip) / max(whiteClip - blackClip, 0.0001), 0.0, 1.0);',
    '    a = a * a * (3.0 - 2.0 * a);',
    '    a *= garbMask(uv);', // crop stray backdrop objects outside the talent area
    '    alpha = a;',
    // Luminance-preserving despill: cap the dominant key channel at the brighter
    // of the other two so fringe loses the key tint without going dark.
    '    vec3 sp = c.rgb;',
    '    if (keyColor.g >= keyColor.r && keyColor.g >= keyColor.b) { sp.g = min(sp.g, max(sp.r, sp.b)); }',
    '    else if (keyColor.b >= keyColor.r && keyColor.b >= keyColor.g) { sp.b = min(sp.b, max(sp.r, sp.g)); }',
    '    else { sp.r = min(sp.r, max(sp.g, sp.b)); }',
    '    rgb = mix(c.rgb, sp, clamp(spill, 0.0, 1.0));',
    // Light-wrap (gated → zero extra sample when off): bleed the real rendered
    // backdrop into translucent subject edges so the source sits in the set.
    '    if (lightWrap > 0.001) {',
    '      vec3 bg = texture2D(bgTexture, vec2(vScreen.x, 1.0 - vScreen.y)).rgb;',
    '      rgb = mix(rgb, bg, clamp(lightWrap * (1.0 - alpha), 0.0, 1.0));',
    '    }',
    // Lighting/colour match: grade the keyed subject toward the set exposure+tint
    // so it sits in the scene instead of looking pasted on. Gated → off = no-op.
    '    if (matchAmount > 0.001) {',
    '      vec3 graded = clamp(rgb * matchTint * matchExposure, 0.0, 1.0);',
    '      rgb = mix(rgb, graded, matchAmount);',
    '    }',
    '  } else if (keyMode == 2) {',
    '    alpha = c.a;',
    '  }',
    '  if (showMatte == 1) { gl_FragColor = vec4(vec3(alpha), 1.0); return; }',
    '  gl_FragColor = vec4(rgb, alpha * opacity);',
    '}',
  ].join('\n');
  mediaShaderRegistered = true;
}

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
  private trackedCamera: FreeCamera | null = null;
  private trackingActive = false;
  private trackingObserver: Observer<Scene> | null = null;
  private trackingSmoothing = 0.4;
  private smoothTarget = new Vector3(0, 1.4, 2);
  private trackingSocket: WebSocket | null = null;
  // FreeD calibration: studio position scale/offset + zoom→focal range.
  private trackingCalibration = { posScale: 1, posOffset: new Vector3(0, 0, 0), focalMin: 14, focalMax: 200 };
  private viewportMode: '3d' | '2d' = '3d';
  private deskProps: DeskProperties | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private disposed = false;
  private renderingPaused = false;
  private visibilityHandler: (() => void) | null = null;
  private lastInteractionAt = 0;
  private frameCounter = 0;
  private baseScaling = 1;
  private adaptiveStep = 0;
  private lowFpsRenders = 0;
  private packNodes: Array<AbstractMesh | TransformNode> = [];
  // Program media (live source rendered as a separate, selectable scene object).
  private programPlane: Mesh | null = null;
  private programTexture: VideoTexture | null = null;
  private programVideoEl: HTMLVideoElement | null = null;
  private programStream: MediaStream | null = null;
  private programPlacement: PlacementMode = 'mediaPlane';
  private backdropRtt: RenderTargetTexture | null = null;
  private dummyBgTexture: RawTexture | null = null;
  private screenInsertTargets = new Set(['led-main', 'led-side', 'desk-screen', 'screen-insert-test']);

  init(canvas: HTMLCanvasElement) {
    if (this.engine) return;
    this.canvas = canvas;

    this.engine = new Engine(canvas, true, {
      // preserveDrawingBuffer disables GL fast paths; we capture via the DOM
      // compositor, not canvas.toDataURL, so it is not needed.
      preserveDrawingBuffer: false,
      stencil: true,
      adaptToDeviceRatio: true,
      antialias: true,
    });

    this.scene = new Scene(this.engine);
    // Picking only happens on POINTERDOWN (see setupPicking); skip the expensive
    // per-pointer-move ray casting Babylon does by default.
    this.scene.skipPointerMovePicking = true;
    const built = buildDefaultStudioScene(this.scene);
    this.refs = built.refs;
    this.cameras = built.cameras;

    this.gizmoManager = new GizmoManager(this.scene);
    this.gizmoManager.usePointerToAttachGizmos = false;
    this.gizmoManager.positionGizmoEnabled = true;
    this.gizmoManager.rotationGizmoEnabled = false;
    this.gizmoManager.scaleGizmoEnabled = false;

    // Freeze materials that never change so Babylon skips their per-frame
    // readiness/dirty checks. The dynamic ones (desk, floor, desk-screen, and
    // the live program shader created later) are intentionally left unfrozen.
    const dynamicMats = new Set(['deskMat', 'floorMat', 'deskScreenMat']);
    this.scene.materials.forEach((m) => { if (!dynamicMats.has(m.name)) m.freeze(); });

    this.setupPicking();
    this.selectObject('desk');
    this.applyQuality(this.qualityMode);
    this.attachActiveCameraControls();
    this.resizeObserver = bindEngineResize(this.engine, canvas);

    this.engine.runRenderLoop(() => {
      if (this.disposed || this.renderingPaused || !this.scene || !this.engine) return;
      // Don't burn GPU/CPU rendering a tab the operator can't see.
      if (typeof document !== 'undefined' && document.hidden) return;
      this.frameCounter += 1;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const live = !!this.programTexture; // a live Program feed needs every frame
      const active = now - this.lastInteractionAt < 1500; // recent camera/gizmo/pointer use
      // Idle (no live feed, no recent interaction): drop to ~10 redraws/sec to
      // save GPU. Any interaction or a live feed restores full rate. Never zero
      // (a heartbeat frame every 6th) so the viewport can't get stuck.
      if (!live && !active && this.frameCounter % 6 !== 0) return;
      this.programTexture?.update(); // pull the latest video frame into the GPU texture
      this.scene.render();
    });

    // Resize the backbuffer when the tab becomes visible again (it may have
    // changed while hidden), and otherwise let the render loop idle.
    this.visibilityHandler = () => {
      if (!document.hidden) this.engine?.resize();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

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
      // Adaptive quality: on sustained low FPS, step the render resolution down
      // (one-way, capped) so the app stays smooth on weak GPUs. Reset only on an
      // explicit quality change (applyQuality), never auto-raised — avoids
      // oscillation.
      if (fps > 0 && fps < 20) this.lowFpsRenders += 1;
      else this.lowFpsRenders = Math.max(0, this.lowFpsRenders - 2);
      if (this.lowFpsRenders > 120 && this.adaptiveStep < 2) {
        this.adaptiveStep += 1;
        this.lowFpsRenders = 0;
        this.applyEffectiveScaling();
      }
    });
  }

  private applyEffectiveScaling() {
    // Higher hardware-scaling level = fewer pixels rendered. baseScaling comes
    // from the quality profile; adaptiveStep adds up to +0.5 on weak GPUs.
    this.engine?.setHardwareScalingLevel(this.baseScaling * (1 + this.adaptiveStep * 0.25));
  }

  /** Mark recent user activity so the render loop runs at full rate (not idle). */
  private markInteraction() {
    this.lastInteractionAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  private setupPicking() {
    if (!this.scene) return;
    this.scene.onPointerObservable.add((pointerInfo) => {
      // Any pointer activity (orbit, gizmo drag, click) keeps the viewport at
      // full frame rate via the idle-throttle check in the render loop.
      this.markInteraction();
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
    this.markInteraction();
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
    this.markInteraction();
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

  /**
   * Camera-tracking integration point. External tracking data (FreeD / mo-sys /
   * NDI etc.) drives the virtual camera by calling this each frame; the set,
   * keyed source, light-wrap and occlusion then stay locked to the move.
   */
  applyCameraPose(position: Vector3, target: Vector3, fov: number) {
    if (!this.trackedCamera) return;
    const s = this.trackingSmoothing;
    if (s > 0.001) {
      // Low-pass the incoming pose to reject tracking jitter (real FreeD/mo-sys
      // data is noisy). Higher smoothing = slower, steadier follow.
      const k = 1 - s;
      Vector3.LerpToRef(this.trackedCamera.position, position, k, this.trackedCamera.position);
      Vector3.LerpToRef(this.smoothTarget, target, k, this.smoothTarget);
      this.trackedCamera.setTarget(this.smoothTarget);
      this.trackedCamera.fov += (fov - this.trackedCamera.fov) * k;
    } else {
      this.trackedCamera.position.copyFrom(position);
      this.trackedCamera.setTarget(target);
      this.smoothTarget.copyFrom(target);
      this.trackedCamera.fov = fov;
    }
  }

  /** Tracking pose smoothing 0..~0.97 (low-pass jitter rejection). */
  setTrackingSmoothing(amount: number) {
    this.trackingSmoothing = Math.min(0.97, Math.max(0, amount));
  }

  /** FreeD studio calibration (position scale/offset + zoom→focal range). */
  setTrackingCalibration(cal: { posScale?: number; posOffset?: [number, number, number]; focalMin?: number; focalMax?: number }) {
    if (typeof cal.posScale === 'number') this.trackingCalibration.posScale = cal.posScale;
    if (cal.posOffset) this.trackingCalibration.posOffset = new Vector3(cal.posOffset[0], cal.posOffset[1], cal.posOffset[2]);
    if (typeof cal.focalMin === 'number') this.trackingCalibration.focalMin = cal.focalMin;
    if (typeof cal.focalMax === 'number') this.trackingCalibration.focalMax = cal.focalMax;
  }

  /** Map a decoded FreeD pose (position + pan/tilt orientation + zoom) into the
   * virtual camera, applying studio calibration. */
  private applyFreeDPose(p: FreeDPose) {
    const cal = this.trackingCalibration;
    const pos = new Vector3(
      p.x * cal.posScale + cal.posOffset.x,
      p.y * cal.posScale + cal.posOffset.y,
      p.z * cal.posScale + cal.posOffset.z,
    );
    const pan = (p.pan * Math.PI) / 180;
    const tilt = (p.tilt * Math.PI) / 180;
    const fwd = new Vector3(Math.sin(pan) * Math.cos(tilt), Math.sin(tilt), Math.cos(pan) * Math.cos(tilt));
    const target = pos.add(fwd.scale(3));
    const focal = cal.focalMin + (p.zoom / 0xffffff) * (cal.focalMax - cal.focalMin);
    this.applyCameraPose(pos, target, focalLengthToFov(focal));
    this.markInteraction();
  }

  /**
   * Enable a tracked virtual camera. With no real tracking hardware attached we
   * feed a clearly-labelled synthetic TEST SIGNAL (a gentle jib/handheld move) so
   * the pipeline can be verified; real tracking data replaces it via
   * applyCameraPose(). Disabling restores the selected studio camera.
   */
  private enableTrackedCamera() {
    if (!this.scene) return;
    if (!this.trackedCamera) {
      this.trackedCamera = new FreeCamera('trackedCam', new Vector3(0, 1.6, -9), this.scene);
      this.trackedCamera.minZ = 0.1;
      this.trackedCamera.maxZ = 200;
    }
    this.cameras.get(this.activeCameraId)?.detachControl();
    this.cameras.forEach((c) => c.setEnabled(false));
    this.orthoCamera?.setEnabled(false);
    this.trackedCamera.setEnabled(true);
    this.scene.activeCamera = this.trackedCamera;
    this.trackingActive = true;
    this.markInteraction();
  }

  /**
   * Connect to a real external camera-tracking source over WebSocket. Each JSON
   * message `{ position:[x,y,z], target:[x,y,z], fov?|focalLength? }` drives the
   * virtual camera via applyCameraPose (smoothing + lens match still apply).
   * This is the production hook — a FreeD/mo-sys/NDI bridge forwards poses here.
   */
  connectTrackingSource(url: string) {
    if (!this.scene) return;
    this.disconnectTrackingSource(false);
    this.emit({ type: 'tracking', status: 'connecting' });
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch (e) {
      this.emit({ type: 'tracking', status: 'error', message: e instanceof Error ? e.message : 'bad URL' });
      return;
    }
    this.trackingSocket = socket;
    socket.binaryType = 'arraybuffer'; // receive raw FreeD packets as bytes
    socket.onopen = () => {
      // Real data drives the camera — drop the synthetic test signal if running.
      if (this.trackingObserver && this.scene) {
        this.scene.onBeforeRenderObservable.remove(this.trackingObserver);
        this.trackingObserver = null;
      }
      this.enableTrackedCamera();
      this.emit({ type: 'tracking', status: 'connected' });
    };
    socket.onmessage = (ev) => {
      try {
        // Binary frame → FreeD (industry standard, forwarded by a UDP→WS bridge).
        if (ev.data instanceof ArrayBuffer) {
          const freed = decodeFreeD(new Uint8Array(ev.data));
          if (freed) this.applyFreeDPose(freed);
          return;
        }
        // Text frame → simple JSON pose.
        const p = JSON.parse(typeof ev.data === 'string' ? ev.data : '') as {
          position?: number[]; target?: number[]; fov?: number; focalLength?: number;
        };
        if (!Array.isArray(p.position) || !Array.isArray(p.target)) return;
        const fov = typeof p.fov === 'number' ? p.fov
          : typeof p.focalLength === 'number' ? focalLengthToFov(p.focalLength)
            : (this.deskProps ? focalLengthToFov(this.deskProps.focalLength) : 0.8);
        this.applyCameraPose(
          new Vector3(p.position[0], p.position[1], p.position[2]),
          new Vector3(p.target[0], p.target[1], p.target[2]),
          fov,
        );
        this.markInteraction();
      } catch { /* ignore malformed tracking frame */ }
    };
    socket.onerror = () => this.emit({ type: 'tracking', status: 'error', message: 'connection error' });
    socket.onclose = () => {
      if (this.trackingSocket === socket) {
        this.trackingSocket = null;
        this.emit({ type: 'tracking', status: 'disconnected' });
      }
    };
  }

  disconnectTrackingSource(restoreCamera = true) {
    if (this.trackingSocket) {
      const s = this.trackingSocket;
      s.onopen = null; s.onmessage = null; s.onerror = null; s.onclose = null;
      try { s.close(); } catch { /* already closing */ }
      this.trackingSocket = null;
    }
    if (restoreCamera && this.trackingActive && !this.trackingObserver) {
      this.trackingActive = false;
      this.trackedCamera?.setEnabled(false);
      this.setActiveCamera(this.activeCameraId);
      this.emit({ type: 'tracking', status: 'disconnected' });
    }
  }

  setCameraTracking(enabled: boolean) {
    if (!this.scene) return;
    this.markInteraction();
    if (enabled) {
      this.enableTrackedCamera();
      if (!this.trackingObserver) {
        this.trackingObserver = this.scene.onBeforeRenderObservable.add(() => {
          if (!this.trackingActive) return;
          // Synthetic tracking test signal (stand-in for FreeD/mo-sys/NDI input):
          // a jib move plus small per-frame noise, like real (noisy) tracking data.
          const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
          const jitter = () => (Math.random() - 0.5) * 0.18;
          // Lens match: virtual camera FOV follows the configured focal length.
          const fov = this.deskProps ? focalLengthToFov(this.deskProps.focalLength) : 0.8;
          this.applyCameraPose(
            new Vector3(Math.sin(t * 0.5) * 2.6 + jitter(), 1.6 + Math.sin(t * 0.37) * 0.4 + jitter(), -9 + Math.sin(t * 0.3) * 1.2 + jitter()),
            new Vector3(jitter() * 0.3, 1.4 + jitter() * 0.2, 2),
            fov,
          );
          this.markInteraction(); // tracked motion = full frame rate (not idle)
        });
      }
    } else {
      this.trackingActive = false;
      if (this.trackingObserver) {
        this.scene.onBeforeRenderObservable.remove(this.trackingObserver);
        this.trackingObserver = null;
      }
      this.trackedCamera?.setEnabled(false);
      this.setActiveCamera(this.activeCameraId);
    }
  }

  setActiveCamera(id: CameraId) {
    this.markInteraction();
    if (this.trackingSocket) {
      const s = this.trackingSocket;
      s.onopen = null; s.onmessage = null; s.onerror = null; s.onclose = null;
      try { s.close(); } catch { /* already closing */ }
      this.trackingSocket = null;
      this.emit({ type: 'tracking', status: 'disconnected' });
    }
    if (this.trackingActive) {
      this.trackingActive = false;
      if (this.trackingObserver && this.scene) {
        this.scene.onBeforeRenderObservable.remove(this.trackingObserver);
        this.trackingObserver = null;
      }
      this.trackedCamera?.setEnabled(false);
    }
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
    this.markInteraction();
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
    this.markInteraction();
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
    this.baseScaling = 1 / profile.hardwareScaling;
    this.adaptiveStep = 0; // explicit quality change resets adaptive step-down
    this.lowFpsRenders = 0;
    this.applyEffectiveScaling();
    this.markInteraction();
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
    this.markInteraction();
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

  /**
   * Render the live Program video as a dedicated, selectable media object inside
   * the studio — a separate scene object, never the set background. Pass null to
   * remove it. The MediaStream lifecycle is owned by the caller (SourcesContext);
   * this method only binds the stream to an off-screen <video> and samples its
   * frames into a DynamicTexture (works identically on GPU and software WebGL).
   *
   * Only `mediaPlane` is implemented in this slice; other placement modes fall
   * back to it until they are wired.
   */
  setProgramStream(
    stream: MediaStream | null,
    placement: PlacementMode = 'mediaPlane',
    screenTargetId = 'led-main',
    keying: KeyingSettings = DEFAULT_KEYING_SETTINGS,
  ) {
    if (!this.scene) return;
    if (!stream) {
      this.clearProgramMedia();
      return;
    }
    this.programPlacement = placement;
    if (placement === 'screenInsert' && !this.screenInsertTargets.has(screenTargetId)) screenTargetId = 'screen-insert-test';
    if (placement === 'screenInsert') this.ensureScreenInsertTarget(screenTargetId);

    // Fast path: same live stream already bound — re-apply placement + keying
    // WITHOUT rebuilding the VideoTexture, so live keying/placement sliders don't
    // flicker or reset the feed.
    if (stream === this.programStream && this.programPlane && this.programTexture && this.programVideoEl?.videoWidth) {
      const mat = this.programPlane.material as ShaderMaterial;
      this.applyProgramPlacement(placement, screenTargetId, this.programVideoEl.videoWidth / this.programVideoEl.videoHeight);
      this.applyKeying(mat, keying, placement);
      return;
    }
    this.programStream = stream;

    if (!this.programVideoEl) {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      // Kept in the DOM AND within the viewport (tiny + near-invisible): browsers
      // suspend frame decoding for off-screen/display:none video, which would
      // starve the texture. This keeps real frames flowing without being seen.
      video.style.cssText =
        'position:fixed;right:0;bottom:0;width:16px;height:16px;opacity:0.01;z-index:0;pointer-events:none;';
      document.body.appendChild(video);
      this.programVideoEl = video;
    }
    this.programVideoEl.srcObject = stream;
    void this.programVideoEl.play().catch(() => {});

    if (!this.programPlane) {
      registerMediaShader();
      const plane = MeshBuilder.CreatePlane(
        'programMedia',
        { width: 1, height: 1, sideOrientation: Mesh.DOUBLESIDE },
        this.scene,
      );
      plane.position = new Vector3(0, 2.6, 3.2); // floating in the set, in front of the LED wall
      plane.rotation.y = Math.PI; // face the default front camera without mirroring
      plane.scaling = new Vector3((16 / 9) * 2, 2, 1); // 16:9 default, 2 units tall

      // Unlit, purpose-built shader that samples the live VideoTexture reliably
      // (StandardMaterial texture sampling fails on some software-WebGL backends).
      const mat = new ShaderMaterial(
        'programMediaMat',
        this.scene,
        { vertex: MEDIA_SHADER, fragment: MEDIA_SHADER },
        { attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'keyMode', 'keyColor', 'similarity', 'smoothness', 'spill', 'denoise', 'blackClip', 'whiteClip', 'texel', 'lightWrap', 'garbage', 'matchTint', 'matchExposure', 'matchAmount', 'opacity', 'showMatte'], samplers: ['videoSampler', 'bgTexture'], needAlphaBlending: true },
      );
      mat.backFaceCulling = false;
      plane.material = mat;

      // Always-on placement frame so the source reads as a separate object.
      plane.enableEdgesRendering();
      plane.edgesWidth = 6;
      plane.edgesColor = new Color4(0.23, 0.51, 0.96, 1);

      plane.metadata = { chaseId: 'program-media', displayName: 'Program Media' };
      mat.setInt('keyMode', 0);
      mat.setVector3('keyColor', new Vector3(0, 1, 0));
      mat.setFloat('similarity', 0.32);
      mat.setFloat('smoothness', 0.08);
      mat.setFloat('spill', 0.5);
      mat.setFloat('denoise', 0);
      mat.setFloat('blackClip', 0);
      mat.setFloat('whiteClip', 1);
      mat.setVector2('texel', new Vector2(1 / 1280, 1 / 720));
      mat.setFloat('lightWrap', 0);
      mat.setVector4('garbage', new Vector4(0, 0, 1, 1));
      mat.setVector3('matchTint', new Vector3(1, 1, 1));
      mat.setFloat('matchExposure', 1);
      mat.setFloat('matchAmount', 0);
      if (!this.dummyBgTexture) {
        this.dummyBgTexture = RawTexture.CreateRGBATexture(new Uint8Array([0, 0, 0, 255]), 1, 1, this.scene, false, false, Texture.NEAREST_SAMPLINGMODE);
      }
      mat.setTexture('bgTexture', this.dummyBgTexture); // backdrop bound only when light-wrap is on
      mat.setFloat('opacity', 1);
      mat.setInt('showMatte', 0);
      this.programPlane = plane;
    }

    const applyTexture = () => {
      if (this.disposed || !this.scene || !this.programPlane || !this.programVideoEl) return;
      const w = this.programVideoEl.videoWidth || 1280;
      const h = this.programVideoEl.videoHeight || 720;
      this.programTexture?.dispose();
      // Canonical live-video integration: a Babylon VideoTexture bound to the
      // managed <video>. Frames are pushed each render tick (see render loop).
      const tex = new VideoTexture('programFeed', this.programVideoEl, this.scene, false, true);
      const mat = this.programPlane.material as ShaderMaterial;
      mat.setTexture('videoSampler', tex);
      mat.setVector2('texel', new Vector2(1 / w, 1 / h)); // neighbour-tap size for matte denoise
      this.applyProgramPlacement(placement, screenTargetId, w / h);
      this.applyKeying(mat, keying, placement);
      this.programTexture = tex;
      // Preserve the source aspect ratio so faces/bodies are never deformed.
      const height = placement === 'screenInsert' ? 1 : 2;
      if (placement !== 'screenInsert') this.programPlane.scaling = new Vector3((w / h) * height, height, 1);
    };

    const video = this.programVideoEl;
    if (video.videoWidth > 0) applyTexture();
    else video.addEventListener('loadedmetadata', applyTexture, { once: true });

    this.emitSceneGraph();
    this.selectObject('program-media'); // surface placement handles immediately
  }

  private ensureScreenInsertTarget(id: string) {
    if (!this.scene || this.findMeshById(id)) return;
    const mesh = MeshBuilder.CreatePlane('screenInsertTestTarget', { width: 3.2, height: 1.8 }, this.scene);
    mesh.position.set(3.2, 2.2, 3.8);
    mesh.rotation.y = Math.PI;
    const mat = new StandardMaterial('screenInsertTestTargetMat', this.scene);
    mat.emissiveColor = new Color3(0.02, 0.08, 0.18);
    mat.diffuseColor = new Color3(0.02, 0.04, 0.08);
    mesh.material = mat;
    mesh.metadata = { chaseId: id, displayName: 'Editable Screen Insert Target', screenInsertTarget: true };
    mesh.parent = this.refs?.environmentRoot ?? null;
    this.emitSceneGraph();
  }

  private applyProgramPlacement(placement: PlacementMode, screenTargetId: string, aspect: number) {
    if (!this.programPlane) return;
    this.programPlane.parent = null;
    if (placement === 'screenInsert') {
      const target = this.findMeshById(screenTargetId);
      if (target instanceof Mesh) {
        this.programPlane.position.copyFrom(target.getAbsolutePosition());
        this.programPlane.rotation.copyFrom(target.rotation);
        // Fit the video (aspect-preserved) to the target screen's real size so
        // a "screen insert" fills its monitor/wall instead of a fixed size.
        const ext = target.getBoundingInfo().boundingBox.extendSizeWorld;
        const tw = Math.max(0.1, ext.x * 2);
        const th = Math.max(0.1, ext.y * 2);
        let h = th;
        let w = th * aspect;
        if (w > tw) { w = tw; h = tw / aspect; }
        this.programPlane.scaling = new Vector3(w, h, 1);
        this.programPlane.position.z -= 0.02; // sit just in front of the screen mesh
        this.programPlane.metadata = { chaseId: 'program-media', displayName: `Program Media → ${target.metadata?.displayName ?? screenTargetId}`, screenInsertTargetId: screenTargetId };
        return;
      }
    }
    this.programPlane.position = placement === 'presenterPlate' ? new Vector3(0, 1.8, 0.2) : new Vector3(0, 2.6, 3.2);
    this.programPlane.rotation.set(0, Math.PI, 0);
    this.programPlane.metadata = { chaseId: 'program-media', displayName: placement === 'presenterPlate' ? 'Presenter Plate' : 'Program Media', placement: this.programPlacement };
  }

  private applyKeying(mat: ShaderMaterial, keying: KeyingSettings, placement: PlacementMode) {
    const mode = placement === 'presenterPlate' ? keying.mode : 'disabled';
    mat.setInt('keyMode', mode === 'chromaKey' ? 1 : mode === 'alpha' ? 2 : 0);
    const color = Color3.FromHexString(keying.keyColor || '#00ff00');
    mat.setVector3('keyColor', new Vector3(color.r, color.g, color.b));
    mat.setFloat('similarity', keying.similarity);
    mat.setFloat('smoothness', keying.smoothness);
    mat.setFloat('spill', keying.spill ?? 0.5);
    mat.setFloat('denoise', keying.denoise ?? 0);
    mat.setFloat('blackClip', keying.blackClip ?? 0);
    mat.setFloat('whiteClip', keying.whiteClip ?? 1);
    const wrap = mode === 'chromaKey' ? (keying.lightWrap ?? 0) : 0;
    mat.setFloat('lightWrap', wrap);
    mat.setVector4('garbage', new Vector4(keying.garbageLeft ?? 0, keying.garbageTop ?? 0, keying.garbageRight ?? 1, keying.garbageBottom ?? 1));
    const mc = Color3.FromHexString(keying.matchColor || '#ffffff');
    mat.setVector3('matchTint', new Vector3(mc.r, mc.g, mc.b));
    mat.setFloat('matchExposure', keying.matchExposure ?? 1);
    mat.setFloat('matchAmount', mode === 'chromaKey' ? (keying.matchAmount ?? 0) : 0);
    this.updateBackdropRtt(wrap > 0.001, mat);
    mat.setFloat('opacity', keying.opacity);
    mat.setInt('showMatte', keying.showMatte ? 1 : 0);
    mat.needAlphaBlending = () => mode !== 'disabled' || keying.opacity < 1;
  }

  /**
   * Light-wrap needs the rendered backdrop, so when it's enabled we render the
   * scene (minus the Program plane) to a HALF-RES render target once per frame
   * and feed it to the shader. Disabled by default → the target isn't created,
   * so there is zero extra render cost unless the operator turns light-wrap on.
   */
  private updateBackdropRtt(enabled: boolean, mat: ShaderMaterial) {
    if (!this.scene || !this.programPlane) return;
    if (enabled) {
      if (!this.backdropRtt) {
        const rtt = new RenderTargetTexture('programBackdrop', { ratio: 0.5 }, this.scene, false);
        rtt.renderList = null; // whole scene...
        rtt.wrapU = Texture.CLAMP_ADDRESSMODE;
        rtt.wrapV = Texture.CLAMP_ADDRESSMODE;
        // ...minus the Program plane itself (so the plane samples what's behind it).
        rtt.onBeforeRenderObservable.add(() => { if (this.programPlane) this.programPlane.isVisible = false; });
        rtt.onAfterRenderObservable.add(() => { if (this.programPlane) this.programPlane.isVisible = true; });
        this.scene.customRenderTargets.push(rtt);
        this.backdropRtt = rtt;
      }
      mat.setTexture('bgTexture', this.backdropRtt);
    } else if (this.backdropRtt) {
      const i = this.scene.customRenderTargets.indexOf(this.backdropRtt);
      if (i >= 0) this.scene.customRenderTargets.splice(i, 1);
      this.backdropRtt.dispose();
      this.backdropRtt = null;
      if (this.dummyBgTexture) mat.setTexture('bgTexture', this.dummyBgTexture);
    }
  }

  private clearProgramMedia() {
    if (this.backdropRtt && this.scene) {
      const i = this.scene.customRenderTargets.indexOf(this.backdropRtt);
      if (i >= 0) this.scene.customRenderTargets.splice(i, 1);
      this.backdropRtt.dispose();
      this.backdropRtt = null;
    }
    this.programTexture?.dispose();
    this.programTexture = null;
    if (this.programPlane) {
      if (this.selectedId === 'program-media') {
        this.gizmoManager?.attachToMesh(null);
        this.selectedId = null;
      }
      this.programPlane.dispose();
      this.programPlane = null;
    }
    if (this.programVideoEl) {
      this.programVideoEl.srcObject = null;
      this.programVideoEl.remove();
      this.programVideoEl = null;
    }
    this.programStream = null;
    this.emitSceneGraph();
  }

  getSceneNodes(): SceneNodeInfo[] {
    if (!this.scene) return [];
    const nodes = new Map<string, SceneNodeInfo>();
    this.scene.meshes.forEach((m) => {
      const id = m.metadata?.chaseId as string | undefined;
      if (id && m.name && m.isEnabled(true)) {
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

  /**
   * Live MediaStream of the rendered Program output (the studio composite with
   * the keyed source), for recording/streaming. Null if the canvas isn't
   * capturable (e.g. the viewport isn't mounted).
   */
  captureOutputStream(fps = 30): MediaStream | null {
    const canvas = this.canvas as (HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }) | null;
    if (!canvas?.captureStream) return null;
    try {
      return canvas.captureStream(fps);
    } catch {
      return null;
    }
  }

  /**
   * Pause/resume the render loop. Paused when the 3D viewport isn't on screen
   * (e.g. the operator is in the Switcher/another module) so the engine doesn't
   * keep rendering to an off-screen canvas.
   */
  setActive(active: boolean) {
    this.renderingPaused = !active;
  }

  /**
   * One-shot: sample the average colour of the Program video's top-left region
   * (typically backdrop) so the operator can auto-pick the key colour. Returns a
   * hex string, or null when there is no live Program video. CPU one-shot — not
   * called per frame.
   */
  sampleProgramKeyColor(): string | null {
    const video = this.programVideoEl;
    if (!video || !video.videoWidth) return null;
    const w = 64;
    const h = 36;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    const bw = Math.max(1, Math.floor(w * 0.25));
    const bh = Math.max(1, Math.floor(h * 0.25));
    const data = ctx.getImageData(0, 0, bw, bh).data;
    let r = 0; let g = 0; let b = 0; let n = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1; }
    const hex = (x: number) => Math.round(x / n).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
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
    // Drop the Program media texture + off-screen video (never stops tracks —
    // SourcesContext owns the MediaStream lifecycle).
    this.backdropRtt?.dispose();
    this.backdropRtt = null;
    this.dummyBgTexture?.dispose();
    this.dummyBgTexture = null;
    this.programTexture?.dispose();
    this.programTexture = null;
    this.programPlane = null;
    if (this.programVideoEl) {
      this.programVideoEl.srcObject = null;
      this.programVideoEl.remove();
      this.programVideoEl = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.trackingObserver) {
      this.scene?.onBeforeRenderObservable.remove(this.trackingObserver);
      this.trackingObserver = null;
    }
    if (this.trackingSocket) {
      const s = this.trackingSocket;
      s.onopen = null; s.onmessage = null; s.onerror = null; s.onclose = null;
      try { s.close(); } catch { /* already closing */ }
      this.trackingSocket = null;
    }
    this.trackingActive = false;
    this.resizeObserver?.disconnect();
    this.gizmoManager?.dispose();
    this.scene?.dispose();
    this.engine?.dispose();
    this.engine = null;
    this.scene = null;
    this.canvas = null;
  }
}
