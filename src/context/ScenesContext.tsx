import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import type { SavedScene } from '@/scenes/sceneTypes';

interface ScenesContextValue {
  scenes: SavedScene[];
  activeSceneId: string | null;
  addScene: (scene: SavedScene) => void;
  removeScene: (id: string) => void;
  renameScene: (id: string, name: string) => void;
  updateScene: (id: string, patch: Partial<SavedScene>) => void;
  setActiveScene: (id: string | null) => void;
  restoreScenes: (scenes: SavedScene[]) => void;
}

const ScenesContext = createContext<ScenesContextValue | null>(null);

export function ScenesProvider({ children }: { children: ReactNode }) {
  const [scenes, setScenes] = useState<SavedScene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  const addScene = useCallback((scene: SavedScene) => {
    setScenes((prev) => [...prev, scene]);
    setActiveSceneId(scene.id);
  }, []);

  const removeScene = useCallback((id: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== id));
    setActiveSceneId((cur) => (cur === id ? null : cur));
  }, []);

  const renameScene = useCallback((id: string, name: string) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, name, updatedAt: Date.now() } : s)));
  }, []);

  const updateScene = useCallback((id: string, patch: Partial<SavedScene>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s)));
  }, []);

  const setActiveScene = useCallback((id: string | null) => {
    setActiveSceneId(id);
  }, []);

  const restoreScenes = useCallback((next: SavedScene[]) => {
    setScenes(next);
    setActiveSceneId(null);
  }, []);

  return (
    <ScenesContext.Provider
      value={{
        scenes,
        activeSceneId,
        addScene,
        removeScene,
        renameScene,
        updateScene,
        setActiveScene,
        restoreScenes,
      }}
    >
      {children}
    </ScenesContext.Provider>
  );
}

export function useScenes() {
  const ctx = useContext(ScenesContext);
  if (!ctx) throw new Error('useScenes must be used within ScenesProvider');
  return ctx;
}
