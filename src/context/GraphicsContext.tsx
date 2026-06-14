import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import type { GraphicItem } from '@/graphics/graphicsTypes';

interface GraphicsContextValue {
  graphics: GraphicItem[];
  selectedId: string | null;
  onAirIds: string[];
  addGraphic: (item: GraphicItem) => void;
  removeGraphic: (id: string) => void;
  patchGraphic: (id: string, patch: Partial<GraphicItem>) => void;
  selectGraphic: (id: string | null) => void;
  setOnAir: (id: string, on: boolean) => void;
  isOnAir: (id: string) => boolean;
}

const GraphicsContext = createContext<GraphicsContextValue | null>(null);

export function GraphicsProvider({ children }: { children: ReactNode }) {
  const [graphics, setGraphics] = useState<GraphicItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onAirIds, setOnAirIds] = useState<string[]>([]);

  const addGraphic = useCallback((item: GraphicItem) => {
    setGraphics((prev) => [...prev, item]);
    setSelectedId(item.id);
  }, []);

  const removeGraphic = useCallback((id: string) => {
    setGraphics((prev) => prev.filter((g) => g.id !== id));
    setOnAirIds((prev) => prev.filter((x) => x !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const patchGraphic = useCallback((id: string, patch: Partial<GraphicItem>) => {
    setGraphics((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }, []);

  const selectGraphic = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const setOnAir = useCallback((id: string, on: boolean) => {
    setOnAirIds((prev) => (on ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
  }, []);

  const isOnAir = useCallback((id: string) => onAirIds.includes(id), [onAirIds]);

  return (
    <GraphicsContext.Provider
      value={{ graphics, selectedId, onAirIds, addGraphic, removeGraphic, patchGraphic, selectGraphic, setOnAir, isOnAir }}
    >
      {children}
    </GraphicsContext.Provider>
  );
}

export function useGraphics() {
  const ctx = useContext(GraphicsContext);
  if (!ctx) throw new Error('useGraphics must be used within GraphicsProvider');
  return ctx;
}
