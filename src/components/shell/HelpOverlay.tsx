import { useEffect } from 'react';
import { X, Keyboard, Compass, MousePointer2 } from 'lucide-react';

/**
 * In-app Help / Keyboard-Shortcuts overlay.
 *
 * Every interaction listed here is verified against the actual code:
 *   - Delete/Backspace removal: src/components/viewport/ViewportCanvas.tsx
 *   - Timeline scrub / double-click collapse / transport: src/components/shell/Timeline.tsx
 *   - Drag-and-drop glTF import: ViewportCanvas.tsx + AssetPanel.tsx
 *   - Rename commit (Enter) / cancel (Escape): SceneOutliner.tsx, ScenesPanel.tsx
 * Nothing aspirational is documented.
 */

interface Shortcut {
  keys: string[];
  desc: string;
}

interface ShortcutGroup {
  title: string;
  items: Shortcut[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Global',
    items: [
      { keys: ['?'], desc: 'Open or close this Help panel' },
      { keys: ['F1'], desc: 'Open or close this Help panel' },
      { keys: ['Esc'], desc: 'Close this Help panel' },
    ],
  },
  {
    title: 'Builder viewport',
    items: [
      { keys: ['Delete'], desc: 'Remove the selected imported asset or group from the scene' },
      { keys: ['Backspace'], desc: 'Remove the selected imported asset or group (same as Delete)' },
      { keys: ['Drag + Drop'], desc: 'Drop glTF / GLB files onto the viewport to import them' },
    ],
  },
  {
    title: 'Builder timeline',
    items: [
      { keys: ['Double-click'], desc: 'Double-click the timeline header to collapse or expand it' },
      { keys: ['Click / Drag'], desc: 'Click or drag the ruler to scrub the playhead' },
    ],
  },
  {
    title: 'Renaming (inline fields)',
    items: [
      { keys: ['Enter'], desc: 'Commit a rename in Scenes / Scene Outliner / Switcher source name' },
      { keys: ['Esc'], desc: 'Cancel a rename in Scenes / Scene Outliner' },
    ],
  },
];

/**
 * The transport, switcher, and output controls are all on-screen buttons rather
 * than keyboard-driven, so we document them as a button-tour rather than as
 * keyboard shortcuts to avoid implying shortcuts that do not exist.
 */
const BUTTON_NOTES: string[] = [
  'Timeline transport (jump-to-start, step ±1s, play/pause, stop, loop) lives on the toolbar under the cue list — these are buttons, not keys.',
  'Camera and graphic cues are authored at the playhead with the + Camera / + Gfx On / + Gfx Off buttons; they fire live during playback and scrubbing.',
  'Switcher uses on-screen buttons: stage a source To Preview, then press CUT to send Preview to Program.',
];

const QUICK_START: { step: string; detail: string }[] = [
  { step: 'Add a source', detail: 'In Switcher, add a webcam, screen capture, video file, or image. It appears in the source list with a live status badge.' },
  { step: 'Stage and CUT', detail: 'Click To Preview on a source, then press CUT to send Preview to Program. The Program source is placed in the 3D scene as a real Babylon object.' },
  { step: 'Build the set', detail: 'In Builder, drag-and-drop glTF/GLB files into the viewport, position them, and remove unwanted assets with Delete/Backspace.' },
  { step: 'Add graphics & AR', detail: 'In Graphics, create lower-thirds / logos / tickers; in AR, wire a data endpoint URL to drive AR elements.' },
  { step: 'Cue it on the timeline', detail: 'Move the playhead, add camera or graphic cues with the toolbar buttons, then play — cues fire automatically.' },
  { step: 'Light & mix', detail: 'Adjust lights in Lighting, switch cameras in Cameras, and balance levels in the Audio mixer.' },
  { step: 'Go to Outputs', detail: 'Outputs shows the composite Program preview, recording (MediaRecorder) controls, and stream-destination fields. Capabilities are gated by what the browser and a real output pipeline support.' },
];

export function HelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Help and keyboard shortcuts"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="scroll-y"
        style={{
          width: 'min(880px, 92vw)',
          maxHeight: '86vh',
          overflowY: 'auto',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-panel)',
          }}
        >
          <Keyboard size={18} strokeWidth={1.5} />
          <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>Help &amp; Keyboard Shortcuts</span>
          <button
            onClick={onClose}
            aria-label="Close help"
            title="Close"
            style={{ color: 'var(--text-muted)', background: 'transparent', padding: 4, borderRadius: 3 }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Quick start */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Compass size={14} strokeWidth={1.5} />
              <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quick start</h3>
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {QUICK_START.map((q) => (
                <li key={q.step} style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{q.step}.</strong> {q.detail}
                </li>
              ))}
            </ol>
          </section>

          {/* Shortcut groups */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Keyboard size={14} strokeWidth={1.5} />
              <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Keyboard &amp; pointer</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.title}>
                  <div className="section-label" style={{ marginBottom: 6 }}>{group.title}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {group.items.map((item) => (
                      <div key={item.desc + item.keys.join('+')} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ display: 'flex', gap: 4, flexShrink: 0, minWidth: 92 }}>
                          {item.keys.map((k) => (
                            <kbd
                              key={k}
                              className="mono"
                              style={{
                                fontSize: 9,
                                padding: '2px 6px',
                                borderRadius: 3,
                                background: 'var(--bg-panel-raised)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {k}
                            </kbd>
                          ))}
                        </span>
                        <span style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--text-secondary)' }}>{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Button notes */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <MousePointer2 size={14} strokeWidth={1.5} />
              <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Controls that are buttons, not keys</h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {BUTTON_NOTES.map((note) => (
                <li key={note} style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{note}</li>
              ))}
            </ul>
          </section>

          <div style={{ fontSize: 9, color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
            See docs/USER_GUIDE.md for the full feature walkthrough.
          </div>
        </div>
      </div>
    </div>
  );
}
