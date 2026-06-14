import { useEffect, useRef } from 'react';
import { useShell } from '@/context/ShellContext';
import { useGraphics } from '@/context/GraphicsContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';

// The Babylon engine is rebuilt whenever the user re-enters the Builder module,
// so its live graphics overlay starts empty. This always-mounted helper replays
// every on-air graphic onto a freshly-ready engine so on-air state survives
// module switches. Renders nothing.
export function GraphicsSync() {
  const { state } = useShell();
  const { graphics, onAirIds } = useGraphics();
  const { playGraphic } = useEditorBridge();
  const lastReady = useRef(false);

  useEffect(() => {
    if (state.engineReady && !lastReady.current) {
      // Engine just became ready (first init or re-entry): replay on-air graphics.
      for (const id of onAirIds) {
        const item = graphics.find((g) => g.id === id);
        if (item) playGraphic(item);
      }
    }
    lastReady.current = state.engineReady;
  }, [state.engineReady, onAirIds, graphics, playGraphic]);

  return null;
}
