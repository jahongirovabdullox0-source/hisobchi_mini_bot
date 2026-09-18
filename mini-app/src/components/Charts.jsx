import { useMemo, useState } from 'react';
import { compact, money } from '../lib/format';
import { haptic } from '../lib/telegram';

/** Daromad (yashil) va harajat (qizil) ustunli diagramma */
export function BarChart({ data = [], height = 150 }) {
  const [active, setActive] = useState(null);
  const max = useMemo(() => Math.max(1, ...data.map((d) => Math.max(d.income, d.expense))), [data]);
  const step = data.length > 16 ? Math.ceil(data.length / 8) : 1;
  const sel = active !== null ? data[active] : null;
  const totals = useMemo(
    () => data.reduce((a, d) => ({ income: a.income + d.income, expense: a.expense + d.expense }), { income: 0, expense: 0 }),
    [data]
  );
  const shown = sel || totals;

  return (
    <div className="barchart">
      <div className="barchart-head">
        <span className="muted small">{sel ? sel.title : 'Davr bo\'yicha jami'}</span>
        <span className="small">
          <b className="green">{compact(shown.income)}</b>
          <span className="muted"> / </span>
          <b className="red">{compact(shown.expense)}</b>
        </span>
      </div>
      <div className="bars" style={{ height }}>
        <div className="bars-grid">
          <span data-label={compact(max)} />
          <span data-label={compact(max / 2)} />
          <span data-label="0" />
        </div>
        {data.map((d, i) => (
          <button
            type="button"
            key={d.key}
            className={`bars-col${active === i ? ' active' : ''}${active !== null && active !== i ? ' dim' : ''}`}
            onClick={() => {
              haptic.select();
              setActive(active === i ? null : i);
            }}
          >
            <span className="bar bar-in" style={{ height: `${(d.income / max) * 100}%` }} />
            <span className="bar bar-ex" style={{ height: `${(d.expense / max) * 100}%` }} />
          </button>
        ))}
      </div>
      <div className="bars-labels">
        {data.map((d, i) => (
          <span key={d.key}>{i % step === 0 ? d.label : ''}</span>
        ))}
      </div>
      <div className="legend-inline">
        <span>
          <i className="dot" style={{ background: 'var(--green)' }} /> Daromad
        </span>
        <span>
          <i className="dot" style={{ background: 'var(--red)' }} /> Harajat
        </span>
      </div>
    </div>
  );
}

/** Doiraviy (donut) diagramma */
export function Donut({ items = [], size = 170, stroke = 22, label, value }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = items.reduce((a, x) => a + x.value, 0);
  const center = size / 2;
  let offset = 0;

  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        {total > 0 &&
          items.map((it, i) => {
            const len = (it.value / total) * c;
            const gap = items.length > 1 ? Math.min(3, len / 3) : 0;
            const el = (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={it.color}
                strokeWidth={stroke}
                strokeDasharray={`${Math.max(0.01, len - gap)} ${c}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${center} ${center})`}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="donut-center">
        <span className="muted tiny">{label}</span>
        <b>{value}</b>
      </div>
    </div>
  );
}

/** Donut + izoh ro'yxati */
export function Breakdown({ items = [], label, currencyTotal }) {
  const total = items.reduce((a, x) => a + x.value, 0);
  return (
    <div className="breakdown">
      <Donut items={items} label={label} value={compact(currencyTotal ?? total)} />
      <div className="legend">
        {items.slice(0, 6).map((it, i) => (
          <div className="legend-item" key={i}>
            <i className="dot" style={{ background: it.color }} />
            <span className="grow ellipsis">
              {it.icon} {it.name}
            </span>
            <b>{total ? Math.round((it.value / total) * 100) : 0}%</b>
          </div>
        ))}
        {items.length > 6 && <div className="muted tiny">+ yana {items.length - 6} ta</div>}
      </div>
    </div>
  );
}

/** Kichik ikki rangli chiziq: daromad va harajat nisbati */
export function SplitBar({ income, expense }) {
  const total = income + expense;
  const inc = total ? (income / total) * 100 : 0;
  return (
    <div className="splitbar" title={`${money(income)} / ${money(expense)}`}>
      <span className="in" style={{ width: `${inc}%` }} />
      <span className="ex" style={{ width: `${total ? 100 - inc : 0}%` }} />
    </div>
  );
}
