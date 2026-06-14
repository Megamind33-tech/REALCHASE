import { useEffect, useRef } from 'react';
import { useShell } from '@/context/ShellContext';
import { useAr } from '@/context/ArContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';

// Pushes the AR element definitions (source of truth in ArContext) into the
// engine, and replays them whenever the engine is rebuilt (Builder re-entry).
// Removed elements are torn down. Renders nothing.
export function ArSync() {
  const { state } = useShell();
  const { elements } = useAr();
  const { upsertArElement, removeArElement } = useEditorBridge();
  const knownIds = useRef<Set<string>>(new Set());
  const lastReady = useRef(false);

  useEffect(() => {
    if (!state.engineReady) { lastReady.current = false; return; }
    const reentered = !lastReady.current;
    lastReady.current = true;

    void reentered;
    const current = new Set(elements.map((e) => e.id));
    // Remove elements deleted from state.
    for (const id of knownIds.current) {
      if (!current.has(id)) removeArElement(id);
    }
    // Upsert is idempotent, so re-applying every element each change also covers
    // the full replay needed after the engine is rebuilt on Builder re-entry.
    for (const el of elements) upsertArElement(el);
    knownIds.current = current;
  }, [state.engineReady, elements, upsertArElement, removeArElement]);

  return null;
}
