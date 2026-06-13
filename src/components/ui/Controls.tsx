interface TabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  uppercase?: boolean;
}

export function Tabs<T extends string>({ tabs, active, onChange, uppercase = true }: TabsProps<T>) {
  return (
    <div
      style={{
        display: 'flex',
        border: '1px solid var(--border-subtle)',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1,
            padding: '4px 6px',
            fontSize: uppercase ? 10 : 11,
            fontWeight: 600,
            letterSpacing: uppercase ? '0.06em' : undefined,
            textTransform: uppercase ? 'uppercase' : undefined,
            background: active === tab.id ? 'var(--accent-blue-dim)' : 'transparent',
            color: active === tab.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
            borderBottom: active === tab.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '2px 8px',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 500,
        border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
        background: active ? 'var(--accent-blue-dim)' : 'var(--bg-panel-raised)',
        color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  onChange: (v: number) => void;
}

export function Slider({ label, value, min = 0, max = 100, unit = '', onChange }: SliderProps) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{label}</span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-primary)' }}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
      />
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        cursor: 'pointer',
        fontSize: 10,
        color: 'var(--text-secondary)',
      }}
    >
      {label}
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 28,
          height: 14,
          borderRadius: 7,
          background: checked ? 'var(--accent-blue)' : 'var(--border-active)',
          position: 'relative',
          transition: 'background var(--transition-fast)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 16 : 2,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left var(--transition-fast)',
          }}
        />
      </button>
    </label>
  );
}

interface MeterProps {
  level: number;
  muted?: boolean;
}

export function Meter({ level, muted }: MeterProps) {
  const h = Math.max(2, (level / 100) * 48);
  return (
    <div
      style={{
        width: 4,
        height: 48,
        background: 'var(--bg-app)',
        borderRadius: 1,
        position: 'relative',
        opacity: muted ? 0.35 : 1,
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: h,
          background: level > 85 ? 'var(--status-error)' : level > 65 ? 'var(--status-warn)' : 'var(--status-ok)',
          borderRadius: 1,
        }}
      />
    </div>
  );
}
