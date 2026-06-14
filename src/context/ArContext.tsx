import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import type { ArElement } from '@/ar/arTypes';

interface ArContextValue {
  elements: ArElement[];
  selectedId: string | null;
  addElement: (el: ArElement) => void;
  removeElement: (id: string) => void;
  patchElement: (id: string, patch: Partial<ArElement>) => void;
  selectElement: (id: string | null) => void;
  setOnAir: (id: string, onAir: boolean) => void;
}

const ArContext = createContext<ArContextValue | null>(null);

export function ArProvider({ children }: { children: ReactNode }) {
  const [elements, setElements] = useState<ArElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const addElement = useCallback((el: ArElement) => {
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  }, []);
  const removeElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((e) => e.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);
  const patchElement = useCallback((id: string, patch: Partial<ArElement>) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);
  const selectElement = useCallback((id: string | null) => setSelectedId(id), []);
  const setOnAir = useCallback((id: string, onAir: boolean) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, onAir } : e)));
  }, []);

  return (
    <ArContext.Provider value={{ elements, selectedId, addElement, removeElement, patchElement, selectElement, setOnAir }}>
      {children}
    </ArContext.Provider>
  );
}

export function useAr() {
  const ctx = useContext(ArContext);
  if (!ctx) throw new Error('useAr must be used within ArProvider');
  return ctx;
}
