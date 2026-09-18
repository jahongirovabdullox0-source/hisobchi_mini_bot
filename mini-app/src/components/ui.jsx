import { useApp } from '../context/AppContext';
import { haptic } from '../lib/telegram';
import Icon from './Icon';

/** Segmentli tanlagich */
export function Segmented({ value, onChange, options, className = '' }) {
  return (
    <div className={`segmented ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`${value === o.value ? 'active' : ''} ${o.tone || ''}`}
          onClick={() => {
            if (value !== o.value) haptic.select();
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Gorizontal skroll qilinadigan teglar */
export function Chips({ value, onChange, options, className = '' }) {
  return (
    <div className={`chips ${className}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={`chip${value === o.value ? ' active' : ''}`}
          style={value === o.value && o.color ? { background: o.color, borderColor: o.color } : undefined}
          onClick={() => {
            haptic.select();
            onChange(o.value);
          }}
        >
          {o.icon && <span className="chip-icon">{o.icon}</span>}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value, color, danger = false }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="progress">
      <span style={{ width: `${pct}%`, background: danger ? 'var(--red)' : color || 'var(--text)' }} />
    </div>
  );
}

export function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`switch${checked ? ' on' : ''}`}
      onClick={() => {
        haptic.select();
        onChange(!checked);
      }}
    >
      <span />
    </button>
  );
}

export function Empty({ icon = '🗒️', title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      {title && <div className="empty-title">{title}</div>}
      {text && <div className="muted small">{text}</div>}
      {action}
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', radius = 10, style }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius, ...style }} />;
}

export function SkeletonList({ rows = 4 }) {
  return (
    <div className="stack gap-12">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="row gap-12">
          <Skeleton width={44} height={44} radius={14} />
          <div className="grow stack gap-6">
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" height={12} />
          </div>
          <Skeleton width={80} height={14} />
        </div>
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="error-box">
      <div>⚠️ {message}</div>
      {onRetry && (
        <button className="btn btn-soft btn-sm" onClick={onRetry}>
          <Icon name="refresh" size={16} /> Qayta urinish
        </button>
      )}
    </div>
  );
}

export function SectionHead({ title, action, onAction }) {
  return (
    <div className="section-head">
      <h2 className="section-title">{title}</h2>
      {action && (
        <button className="link" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

/** Ichki sahifalar uchun sarlavha (orqaga tugmasi bilan) */
export function PageHeader({ title, subtitle, right }) {
  const { pop } = useApp();
  return (
    <div className="page-header">
      <button className="icon-btn" onClick={pop} aria-label="Orqaga">
        <Icon name="back" />
      </button>
      <div className="grow">
        <h1 className="page-title sm">{title}</h1>
        {subtitle && <div className="muted small">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export const PERIOD_OPTIONS = [
  { value: 'today', label: 'Bugun' },
  { value: 'week', label: 'Hafta' },
  { value: 'month', label: 'Oy' },
  { value: 'year', label: 'Yil' },
  { value: 'all', label: 'Hammasi' },
];
