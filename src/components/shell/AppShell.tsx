import { ModuleRail } from './ModuleRail';
import { TopBar } from './TopBar';
import { AssetPanel, AssetPanelExpandHandle } from './AssetPanel';
import { Viewport } from './Viewport';
import { CameraStrip } from './CameraStrip';
import { Timeline } from './Timeline';
import { Inspector, InspectorExpandHandle } from './Inspector';
import { OutputPanel } from './OutputPanel';
import { StatusBar } from './StatusBar';
import { useShell } from '@/context/ShellContext';

export function AppShell() {
  const { state } = useShell();
  const showRightColumn = state.activeModule !== 'switcher' && state.activeModule !== 'settings';

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-app)',
      }}
    >
      <TopBar />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <ModuleRail />
        <AssetPanelExpandHandle />
        <AssetPanel />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Viewport />
          <CameraStrip />
          <Timeline />
        </main>

        {showRightColumn && (
          <>
            <InspectorExpandHandle />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                minHeight: 0,
                width: 'var(--inspector-w)',
              }}
            >
              <Inspector />
              <OutputPanel />
            </div>
          </>
        )}
      </div>

      <StatusBar />
    </div>
  );
}
