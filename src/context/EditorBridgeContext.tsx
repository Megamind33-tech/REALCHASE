import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { StudioEngine } from '@/engine/StudioEngine';
import type { SceneNodeInfo, CameraId } from '@/engine/sceneRegistry';
import type { NodeTransform } from '@/scenes/sceneTypes';
import type { GraphicItem } from '@/graphics/graphicsTypes';
import { useShell } from './ShellContext';

interface EditorBridgeValue {
  engine: StudioEngine | null;
  initCanvas: (canvas: HTMLCanvasElement) => void;
  addObject: (objectId: string) => boolean;
  loadPack: (packId: string, onProgress?: (value: number) => void) => Promise<number>;
  importGltfFiles: (files: File[]) => Promise<number>;
  captureNodeTransforms: () => NodeTransform[];
  applyNodeTransforms: (nodes: NodeTransform[]) => { restored: number; missing: number };
  captureThumbnail: (width?: number) => string;
  getActiveCameraId: () => string;
  playGraphic: (item: GraphicItem) => void;
  stopGraphic: (id: string) => void;
  updateGraphic: (item: GraphicItem) => void;
  clearGraphics: () => void;
  sceneNodes: SceneNodeInfo[];
}

const EditorBridgeContext = createContext<EditorBridgeValue | null>(null);

export function EditorBridgeProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<StudioEngine | null>(null);
  const [engine, setEngine] = useState<StudioEngine | null>(null);
  const [sceneNodes, setSceneNodes] = useState<SceneNodeInfo[]>([]);
  const { state, dispatch } = useShell();

  const initCanvas = useCallback((canvas: HTMLCanvasElement) => {
    const current = engineRef.current;
    if (current) {
      // React StrictMode re-invokes this effect with the SAME canvas element —
      // reuse the existing engine instead of building a second one.
      if (current.getCanvas() === canvas) return;
      // The canvas element actually changed (e.g. leaving and re-entering the
      // Builder module remounts ViewportCanvas). Tear the old engine down so the
      // new canvas gets a live render target instead of a blank frame.
      current.dispose();
      engineRef.current = null;
    }
    const instance = new StudioEngine();
    engineRef.current = instance;
    setEngine(instance);
    instance.subscribe((event) => {
      if (event.type === 'ready') {
        dispatch({ type: 'SET_ENGINE_READY', ready: true });
      }
      if (event.type === 'fps') {
        dispatch({ type: 'UPDATE_ENGINE_FPS', fps: event.value });
      }
      if (event.type === 'selected' && event.objectId) {
        dispatch({ type: 'SET_OBJECT', id: event.objectId });
      }
      if (event.type === 'scene-graph') {
        setSceneNodes(event.nodes);
      }
    });
    instance.init(canvas);
  }, [dispatch]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !state.engineReady) return;
    engine.applyQuality(state.qualityMode);
  }, [state.qualityMode, state.engineReady]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !state.engineReady) return;
    engine.setActiveCamera(state.activeCameraId as CameraId);
  }, [state.activeCameraId, state.engineReady]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !state.engineReady) return;
    engine.selectObject(state.selectedObjectId);
  }, [state.selectedObjectId, state.engineReady]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !state.engineReady) return;
    engine.selectLayer(state.selectedLayerId);
  }, [state.selectedLayerId, state.engineReady]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !state.engineReady) return;
    engine.applyDeskProperties(state.desk);
  }, [state.desk, state.engineReady]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !state.engineReady) return;
    engine.setViewportMode(state.viewportMode);
  }, [state.viewportMode, state.engineReady]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !state.engineReady) return;
    engine.setTransformMode(state.transformMode);
  }, [state.transformMode, state.engineReady]);

  const addObject = useCallback((objectId: string) => {
    return engineRef.current?.addSceneObject(objectId) ?? false;
  }, []);

  const loadPack = useCallback((packId: string, onProgress?: (value: number) => void) => {
    const engine = engineRef.current;
    if (!engine) return Promise.reject(new Error('Scene is not ready'));
    return engine.loadPack(packId, onProgress);
  }, []);

  const importGltfFiles = useCallback((files: File[]) => {
    const engine = engineRef.current;
    if (!engine) return Promise.reject(new Error('Scene is not ready'));
    return engine.importGltfFiles(files);
  }, []);

  const captureNodeTransforms = useCallback(() => engineRef.current?.captureNodeTransforms() ?? [], []);

  const applyNodeTransforms = useCallback(
    (nodes: NodeTransform[]) => engineRef.current?.applyNodeTransforms(nodes) ?? { restored: 0, missing: 0 },
    [],
  );

  const captureThumbnail = useCallback((width?: number) => engineRef.current?.captureThumbnail(width) ?? '', []);

  const getActiveCameraId = useCallback(() => engineRef.current?.getActiveCameraId() ?? 'cam1', []);

  const playGraphic = useCallback((item: GraphicItem) => { engineRef.current?.playGraphic(item); }, []);
  const stopGraphic = useCallback((id: string) => { engineRef.current?.stopGraphic(id); }, []);
  const updateGraphic = useCallback((item: GraphicItem) => { engineRef.current?.updateGraphic(item); }, []);
  const clearGraphics = useCallback(() => { engineRef.current?.clearGraphics(); }, []);

  return (
    <EditorBridgeContext.Provider
      value={{
        engine,
        initCanvas,
        addObject,
        loadPack,
        importGltfFiles,
        captureNodeTransforms,
        applyNodeTransforms,
        captureThumbnail,
        getActiveCameraId,
        playGraphic,
        stopGraphic,
        updateGraphic,
        clearGraphics,
        sceneNodes,
      }}
    >
      {children}
    </EditorBridgeContext.Provider>
  );
}

export function useEditorBridge() {
  const ctx = useContext(EditorBridgeContext);
  if (!ctx) throw new Error('useEditorBridge must be used within EditorBridgeProvider');
  return ctx;
}

export function useSceneNodes() {
  return useEditorBridge().sceneNodes;
}
