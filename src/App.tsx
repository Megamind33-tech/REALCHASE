import { ShellProvider } from '@/context/ShellContext';
import { EditorBridgeProvider } from '@/context/EditorBridgeContext';
import { SourcesProvider } from '@/context/SourcesContext';
import { ScenesProvider } from '@/context/ScenesContext';
import { GraphicsProvider } from '@/context/GraphicsContext';
import { AppShell } from '@/components/shell/AppShell';

export default function App() {
  return (
    <ShellProvider>
      <EditorBridgeProvider>
        <SourcesProvider>
          <ScenesProvider>
            <GraphicsProvider>
              <AppShell />
            </GraphicsProvider>
          </ScenesProvider>
        </SourcesProvider>
      </EditorBridgeProvider>
    </ShellProvider>
  );
}
