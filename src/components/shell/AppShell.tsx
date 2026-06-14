import { ModuleRail } from './ModuleRail';
import { TopBar } from './TopBar';
import { AssetPanel, AssetPanelExpandHandle } from './AssetPanel';
import { Viewport } from './Viewport';
import { CameraStrip } from './CameraStrip';
import { Timeline } from './Timeline';
import { Inspector, InspectorExpandHandle } from './Inspector';
import { OutputPanel } from './OutputPanel';
import { StatusBar } from './StatusBar';
import { GraphicsSync } from './GraphicsSync';
import { TimelinePlayer } from './TimelinePlayer';
import { useShell } from '@/context/ShellContext';

export function AppShell() {
  const { state } = useShell();
  // The Inspector + Output right column is Builder-centric; every other module
  // now has its own full-surface workspace.
  const showRightColumn = state.activeModule === 'builder';

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
      <GraphicsSync />
      <TimelinePlayer />
    </div>
  );
}
