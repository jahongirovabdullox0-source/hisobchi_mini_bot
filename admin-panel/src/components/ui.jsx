import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { compact } from '../format';

/* ------------------------------ Toast ------------------------------ */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((text, type = 'success') => {
    clearTimeout(timer.current);
    setToast({ text, type, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.text}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

/* ------------------------------ Modal ------------------------------ */
export function Modal({ title, onClose, children, footer, width = 540 }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-root" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width }}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Yopish">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------ Mayda komponentlar ------------------------------ */
export function StatCard({ label, value, sub, tone = '', icon }) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span className="muted small">{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className={`stat-value ${tone}`}>{value}</div>
      {sub && <div className="muted tiny">{sub}</div>}
    </div>
  );
}

export function Badge({ tone = 'gray', children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Empty({ text = "Ma'lumot yo'q", icon = '🗒️' }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="muted">{text}</div>
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading">
      <span className="spinner" /> Yuklanmoqda...
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="error-box">
      <span>⚠️ {message}</span>
      {onRetry && (
        <button className="btn btn-soft btn-sm" onClick={() => onRetry()}>
          Qayta urinish
        </button>
      )}
    </div>
  );
}

export function Pagination({ page, pages, total, onChange }) {
  return (
    <div className="pagination">
      <span className="muted small">
        Jami: <b>{total}</b> ta{pages > 1 ? ` · ${page}/${pages}-sahifa` : ''}
      </span>
      {pages > 1 && (
        <div className="row gap-6">
          <button className="btn btn-soft btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
            ← Oldingi
          </button>
          <button className="btn btn-soft btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
            Keyingi →
          </button>
        </div>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`switch${checked ? ' on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function LiveBadge({ enabled, onToggle, updatedAt }) {
  return (
    <button className={`live ${enabled ? 'on' : ''}`} onClick={onToggle} title="Avtomatik yangilanish (har 10 soniyada)">
      <span className="live-dot" />
      {enabled ? 'Real vaqt' : "To'xtatilgan"}
      {updatedAt && <span className="muted"> · {updatedAt.toLocaleTimeString('ru-RU')}</span>}
    </button>
  );
}

/* ------------------------------ Grafik ------------------------------ */
export function BarChart({ data = [], height = 200 }) {
  const [active, setActive] = useState(null);
  const max = useMemo(() => Math.max(1, ...data.map((d) => Math.max(d.income, d.expense))), [data]);
  const step = data.length > 16 ? Math.ceil(data.length / 10) : 1;
  const sel = active !== null ? data[active] : null;

  return (
    <div className="chart">
      <div className="chart-head small">
        {sel ? (
          <>
            <b>{sel.title}</b>
            <span>
              <span className="green">↙ {compact(sel.income)}</span> · <span className="red">↗ {compact(sel.expense)}</span> · sof{' '}
              <b className={sel.net < 0 ? 'red' : 'green'}>{compact(sel.net)}</b>
            </span>
          </>
        ) : (
          <span className="muted">Ustun ustiga olib boring — kunlik qiymatlar ko'rinadi</span>
        )}
      </div>
      <div className="bars" style={{ height }} onMouseLeave={() => setActive(null)}>
        <div className="bars-grid">
          <span data-label={compact(max)} />
          <span data-label={compact(max / 2)} />
          <span data-label="0" />
        </div>
        {data.map((d, i) => (
          <div
            key={d.key}
            className={`bars-col${active !== null && active !== i ? ' dim' : ''}`}
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
          >
            <span className="bar in" style={{ height: `${(d.income / max) * 100}%` }} />
            <span className="bar ex" style={{ height: `${(d.expense / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="bars-labels">
        {data.map((d, i) => (
          <span key={d.key}>{i % step === 0 ? d.label : ''}</span>
        ))}
      </div>
    </div>
  );
}
