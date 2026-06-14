import { useEffect, useState } from 'react';
import { Headset, Smartphone } from 'lucide-react';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { useShell } from '@/context/ShellContext';

// Real WebXR entry points. Buttons are capability-gated: each is enabled only
// when navigator.xr reports the session mode is actually supported on this
// device/browser (and a secure context). Otherwise it is disabled with an
// honest reason — never a fake "Enter AR" that does nothing.
export function XrControls() {
  const { getXRSupport, enterXR, exitXR } = useEditorBridge();
  const { state, dispatch } = useShell();
  const [support, setSupport] = useState<{ vr: boolean; ar: boolean }>({ vr: false, ar: false });
  const [inXR, setInXR] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!state.engineReady) return;
    void getXRSupport().then((s) => { if (alive) setSupport(s); });
    return () => { alive = false; };
  }, [getXRSupport, state.engineReady]);

  const go = async (mode: 'immersive-vr' | 'immersive-ar') => {
    const ok = await enterXR(mode);
    if (ok) {
      setInXR(true);
      dispatch({ type: 'SHOW_TOAST', message: mode === 'immersive-ar' ? 'Entered AR' : 'Entered VR' });
    } else {
      dispatch({ type: 'SHOW_TOAST', message: `${mode === 'immersive-ar' ? 'AR' : 'VR'} session could not start` });
    }
  };

  const leave = async () => { await exitXR(); setInXR(false); };

  const unsupportedTitle = 'Requires a WebXR device over HTTPS (headset for VR, AR-capable device for AR).';

  if (inXR) {
    return (
      <button
        onClick={() => void leave()}
        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, height: 22, padding: '0 8px', borderRadius: 3, border: '1px solid var(--status-rec)', background: 'var(--accent-blue-dim)', color: 'var(--status-rec)' }}
      >
        Exit XR
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 2 }} data-testid="xr-controls">
      <button
        onClick={() => void go('immersive-vr')}
        disabled={!support.vr}
        title={support.vr ? 'Enter immersive VR' : `VR unavailable. ${unsupportedTitle}`}
        data-testid="enter-vr"
        style={{
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, height: 22, padding: '0 8px', borderRadius: 3,
          border: '1px solid var(--border-subtle)', background: 'var(--bg-panel-raised)',
          color: support.vr ? 'var(--text-secondary)' : 'var(--text-muted)', opacity: support.vr ? 1 : 0.55,
        }}
      >
        <Headset size={13} /> VR
      </button>
      <button
        onClick={() => void go('immersive-ar')}
        disabled={!support.ar}
        title={support.ar ? 'Enter AR (view the set in your space)' : `AR unavailable. ${unsupportedTitle}`}
        data-testid="enter-ar"
        style={{
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, height: 22, padding: '0 8px', borderRadius: 3,
          border: '1px solid var(--border-subtle)', background: 'var(--bg-panel-raised)',
          color: support.ar ? 'var(--text-secondary)' : 'var(--text-muted)', opacity: support.ar ? 1 : 0.55,
        }}
      >
        <Smartphone size={13} /> AR
      </button>
    </div>
  );
}
