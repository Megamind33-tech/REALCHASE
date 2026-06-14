import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_LIGHTING, type LightingSettings } from '@/engine/lighting';
import { useEditorBridge } from './EditorBridgeContext';
import { useShell } from './ShellContext';

interface LightingContextValue {
  lighting: LightingSettings;
  setLighting: (next: LightingSettings) => void;
  applyPreset: (settings: LightingSettings, name: string) => void;
  activePreset: string | null;
}

const LightingContext = createContext<LightingContextValue | null>(null);

export function LightingProvider({ children }: { children: ReactNode }) {
  const [lighting, setLightingState] = useState<LightingSettings>(DEFAULT_LIGHTING);
  const [activePreset, setActivePreset] = useState<string | null>('Broadcast');
  const { applyLighting } = useEditorBridge();
  const { state } = useShell();
  const lastReady = useRef(false);

  const setLighting = useCallback((next: LightingSettings) => {
    setLightingState(next);
    setActivePreset(null);
    applyLighting(next);
  }, [applyLighting]);

  const applyPreset = useCallback((settings: LightingSettings, name: string) => {
    setLightingState(settings);
    setActivePreset(name);
    applyLighting(settings);
  }, [applyLighting]);

  // The engine is rebuilt when re-entering the Builder; re-apply the current
  // lighting onto a freshly-ready engine so the look persists.
  useEffect(() => {
    if (state.engineReady && !lastReady.current) {
      applyLighting(lighting);
    }
    lastReady.current = state.engineReady;
  }, [state.engineReady, lighting, applyLighting]);

  return (
    <LightingContext.Provider value={{ lighting, setLighting, applyPreset, activePreset }}>
      {children}
    </LightingContext.Provider>
  );
}

export function useLighting() {
  const ctx = useContext(LightingContext);
  if (!ctx) throw new Error('useLighting must be used within LightingProvider');
  return ctx;
}
