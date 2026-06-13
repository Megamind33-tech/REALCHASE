import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'ghost' | 'secondary' | 'primary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  ghost: { background: 'transparent' },
  secondary: { background: 'var(--bg-panel-raised)', border: '1px solid var(--border-subtle)' },
  primary: { background: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)' },
  danger: { background: 'var(--status-rec)', border: '1px solid var(--status-error)', color: '#fff', fontWeight: 600 },
};

export function Button({ variant = 'ghost', children, style, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        height: 'var(--btn-h, 24px)',
        padding: '0 8px',
        borderRadius: 3,
        fontSize: 11,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        ...variantStyles[variant],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (variant === 'ghost' && !props.disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-panel-raised)';
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'ghost') {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }
      }}
    >
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  children: ReactNode;
}

export function IconButton({ label, active, children, style, ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      style={{
        width: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 3,
        color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
        background: active ? 'var(--accent-blue-dim)' : 'transparent',
        border: active ? '1px solid var(--accent-blue)' : '1px solid transparent',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
