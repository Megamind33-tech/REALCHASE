import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { StudioEngine, type TrackingStatus } from '@/engine/StudioEngine';
import type { SceneNodeInfo, CameraId } from '@/engine/sceneRegistry';
import type { ImportedAsset, SerializedAsset, AssetTransform } from '@/integrations/render-engine/types';
import { useShell } from './ShellContext';

interface EditorBridgeValue {
  engine: StudioEngine | null;
  initCanvas: (canvas: HTMLCanvasElement) => void;
  setActive: (active: boolean) => void;
  setCameraTracking: (enabled: boolean) => void;
  setTrackingSmoothing: (amount: number) => void;
  connectTracking: (url: string) => void;
  disconnectTracking: () => void;
  trackingStatus: TrackingStatus | 'idle';
  trackingLinked: boolean;
  trackingLabel: string;
  captureOutputStream: (fps?: number) => MediaStream | null;
  sampleKeyColor: () => string | null;
  addObject: (objectId: string) => boolean;
  loadPack: (packId: string, onProgress?: (value: number) => void) => Promise<number>;
  importGltfFiles: (files: File[]) => Promise<number>;
  importAsset: (file: File) => Promise<ImportedAsset>;
  setAssetTransform: (id: string, transform: Partial<AssetTransform>) => void;
  removeAsset: (id: string) => void;
  serializeAssets: () => SerializedAsset[];
  restoreAssets: (assets: SerializedAsset[]) => Promise<{ restored: number; skipped: number }>;
  assets: ImportedAsset[];
  sceneNodes: SceneNodeInfo[];
}

const TRACKING_LABELS: Record<TrackingStatus | 'idle', string> = {
  idle: 'Connect tracking',
  connecting: 'Linking…',
  connected: '● Tracking live',
  disconnected: 'Connect tracking',
  error: 'Retry connect',
};

const EditorBridgeContext = createContext<EditorBridgeValue | null>(null);

export function EditorBridgeProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<StudioEngine | null>(null);
  const [engine, setEngine] = useState<StudioEngine | null>(null);
  const [sceneNodes, setSceneNodes] = useState<SceneNodeInfo[]>([]);
  const [assets, setAssets] = useState<ImportedAsset[]>([]);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus | 'idle'>('idle');
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
      if (event.type === 'tracking') {
        setTrackingStatus(event.status);
      }
      if (event.type === 'assets') {
        setAssets(event.assets);
      }
      if (event.type === 'asset-warning') {
        dispatch({ type: 'SHOW_TOAST', message: event.message });
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

  const setActive = useCallback((active: boolean) => {
    engineRef.current?.setActive(active);
  }, []);

  const setCameraTracking = useCallback((enabled: boolean) => {
    engineRef.current?.setCameraTracking(enabled);
  }, []);

  const setTrackingSmoothing = useCallback((amount: number) => {
    engineRef.current?.setTrackingSmoothing(amount);
  }, []);

  const connectTracking = useCallback((url: string) => {
    engineRef.current?.connectTrackingSource(url);
  }, []);

  const disconnectTracking = useCallback(() => {
    engineRef.current?.disconnectTrackingSource();
  }, []);

  const captureOutputStream = useCallback((fps?: number) => engineRef.current?.captureOutputStream(fps) ?? null, []);

  const sampleKeyColor = useCallback(() => engineRef.current?.sampleProgramKeyColor() ?? null, []);

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

  const importAsset = useCallback((file: File) => {
    const engine = engineRef.current;
    if (!engine) return Promise.reject(new Error('Scene is not ready'));
    return engine.importAsset(file);
  }, []);

  const setAssetTransform = useCallback((id: string, transform: Partial<AssetTransform>) => {
    engineRef.current?.setAssetTransform(id, transform);
  }, []);

  const removeAsset = useCallback((id: string) => {
    engineRef.current?.removeAsset(id);
  }, []);

  const serializeAssets = useCallback(() => engineRef.current?.serializeAssets() ?? [], []);

  const restoreAssets = useCallback((list: SerializedAsset[]) => {
    const engine = engineRef.current;
    if (!engine) return Promise.resolve({ restored: 0, skipped: 0 });
    return engine.restoreAssets(list);
  }, []);

  return (
    <EditorBridgeContext.Provider
      value={{
        engine,
        initCanvas,
        setActive,
        setCameraTracking,
        setTrackingSmoothing,
        connectTracking,
        disconnectTracking,
        trackingStatus,
        trackingLinked: trackingStatus === 'connected' || trackingStatus === 'connecting',
        trackingLabel: TRACKING_LABELS[trackingStatus],
        captureOutputStream,
        sampleKeyColor,
        addObject,
        loadPack,
        importGltfFiles,
        importAsset,
        setAssetTransform,
        removeAsset,
        serializeAssets,
        restoreAssets,
        assets,
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

export function useImportedAssets() {
  return useEditorBridge().assets;
}
