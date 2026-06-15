import { useEffect, useRef } from 'react';
import { useShell } from '@/context/ShellContext';
import { useAr } from '@/context/ArContext';
import { useEditorBridge } from '@/context/EditorBridgeContext';
import { clampDataInterval, jsonToFields, type ArElement } from '@/ar/arTypes';

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

  return <ArDataPoller />;
}

/** True when an element is a card that should be polling a live data endpoint:
 *  it is on air, has an https URL, and carries an actual fetchable target. */
function isLivePollTarget(el: ArElement): boolean {
  return (
    el.kind === 'card' &&
    el.onAir &&
    typeof el.dataUrl === 'string' &&
    /^https:\/\//i.test(el.dataUrl.trim())
  );
}

// Drives live data feeds for on-air cards bound to an https:// JSON endpoint.
// Each such card gets its own timer; on every tick we fetch the URL, parse the
// JSON body, map its keys into the card's `fields` via patchElement (which flows
// back through ArSync → the engine redraws the card live), and surface honest
// fetch/parse errors as a toast. Renders nothing.
function ArDataPoller() {
  const { elements, patchElement } = useAr();
  const { dispatch } = useShell();
  // Track the last error string per element so we only toast on a transition,
  // not on every failing poll (which would spam the toast queue).
  const lastErr = useRef<Map<string, string>>(new Map());

  // Snapshot just the polling-relevant config so the effect re-runs only when a
  // card's URL/interval/on-air state changes — not on unrelated field edits.
  const targets = elements
    .filter(isLivePollTarget)
    .map((el) => ({ id: el.id, url: (el.dataUrl as string).trim(), interval: clampDataInterval(el.dataIntervalSec) }));
  const sig = targets.map((t) => `${t.id}|${t.url}|${t.interval}`).join('\n');

  useEffect(() => {
    if (targets.length === 0) return;
    const timers: number[] = [];
    let alive = true;
    const errs = lastErr.current;

    const pollOnce = async (id: string, url: string) => {
      let res: Response;
      try {
        res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      } catch (err) {
        report(id, `Feed fetch failed: ${err instanceof Error ? err.message : 'network error'}`);
        return;
      }
      if (!res.ok) { report(id, `Feed returned HTTP ${res.status} ${res.statusText}`.trim()); return; }
      let body: unknown;
      try {
        body = await res.json();
      } catch (err) {
        report(id, `Feed is not valid JSON: ${err instanceof Error ? err.message : 'parse error'}`);
        return;
      }
      const fields = jsonToFields(body);
      if (Object.keys(fields).length === 0) { report(id, 'Feed JSON has no usable keys.'); return; }
      if (!alive) return;
      // Clear a previously reported error on the first successful poll.
      if (errs.has(id)) { errs.delete(id); dispatch({ type: 'SHOW_TOAST', message: 'AR feed recovered — live data flowing.' }); }
      patchElement(id, { fields });
    };

    const report = (id: string, message: string) => {
      if (!alive) return;
      if (errs.get(id) === message) return; // already reported this exact error
      errs.set(id, message);
      dispatch({ type: 'SHOW_TOAST', message: `AR data: ${message}` });
    };

    for (const t of targets) {
      void pollOnce(t.id, t.url); // immediate first fetch
      const handle = window.setInterval(() => { void pollOnce(t.id, t.url); }, t.interval * 1000);
      timers.push(handle);
    }
    return () => {
      alive = false;
      for (const h of timers) window.clearInterval(h);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, dispatch, patchElement]);

  // Drop stale error entries for elements no longer polling.
  useEffect(() => {
    const live = new Set(targets.map((t) => t.id));
    for (const id of [...lastErr.current.keys()]) if (!live.has(id)) lastErr.current.delete(id);
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
