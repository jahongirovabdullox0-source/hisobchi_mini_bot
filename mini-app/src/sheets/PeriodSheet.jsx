import { useState } from 'react';
import Sheet from '../components/Sheet';
import { previousMonthRange, todayIso, toIsoDay } from '../lib/format';

/** Ixtiyoriy davrni tanlash (dan — gacha) */
export default function PeriodSheet({ from: initialFrom, to: initialTo, onApply }) {
  const [from, setFrom] = useState(initialFrom || toIsoDay(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(initialTo || todayIso());

  const presets = [
    { label: "So'nggi 7 kun", from: toIsoDay(new Date(Date.now() - 6 * 86_400_000)), to: todayIso() },
    { label: "So'nggi 30 kun", from: toIsoDay(new Date(Date.now() - 29 * 86_400_000)), to: todayIso() },
    { label: "O'tgan oy", ...previousMonthRange() },
    { label: "So'nggi 90 kun", from: toIsoDay(new Date(Date.now() - 89 * 86_400_000)), to: todayIso() },
  ];

  return (
    <Sheet
      title="📅 Davrni tanlash"
      footer={({ close }) => (
        <button
          className="btn btn-primary btn-lg btn-block"
          disabled={!from || !to}
          onClick={() => {
            onApply(from <= to ? { from, to } : { from: to, to: from });
            close();
          }}
        >
          Qo'llash
        </button>
      )}
    >
      <div className="row gap-8 wrap">
        {presets.map((p) => (
          <button
            key={p.label}
            className={`chip${p.from === from && p.to === to ? ' active' : ''}`}
            onClick={() => {
              setFrom(p.from);
              setTo(p.to);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid-2">
        <label className="field">
          <span className="field-label">Boshlanish</span>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Tugash</span>
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
    </Sheet>
  );
}
