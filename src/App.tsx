import { ShellProvider } from '@/context/ShellContext';
import { EditorBridgeProvider } from '@/context/EditorBridgeContext';
import { AppShell } from '@/components/shell/AppShell';

export default function App() {
  return (
    <ShellProvider>
      <EditorBridgeProvider>
        <AppShell />
      </EditorBridgeProvider>
    </ShellProvider>
  );
}
