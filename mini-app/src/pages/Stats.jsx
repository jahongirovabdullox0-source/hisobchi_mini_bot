import { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { BarChart, Breakdown } from '../components/Charts';
import { Chips, Empty, ErrorBox, Progress, Segmented, SectionHead, Skeleton } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { MONTHS_TITLE, PALETTE, compact, formatDate, money, pctText } from '../lib/format';

const PERIODS = [
  { value: 'week', label: 'Hafta' },
  { value: 'month', label: 'Oy' },
  { value: 'year', label: 'Yil' },
  { value: 'all', label: 'Hammasi' },
  { value: 'custom', label: '📅' },
];

function Kpi({ label, value, change, tone, invert = false }) {
  const good = change === null || change === undefined ? null : invert ? change <= 0 : change >= 0;
  return (
    <div className="kpi">
      <span className="muted tiny">{label}</span>
      <b className={tone}>{compact(value)}</b>
      {change !== null && change !== undefined && (
        <span className={`tiny ${good ? 'green' : 'red'}`}>{pctText(change)}</span>
      )}
    </div>
  );
}

function BudgetCard() {
  const { openSheet } = useApp();
  const now = new Date();
  const { data, loading } = useApi(() => api.budgets({ year: now.getFullYear(), month: now.getMonth() + 1 }), []);

  if (loading && !data) return <Skeleton height={120} radius={20} />;
  if (!data) return null;
  const rows = data.items.filter((it) => it.planIncome > 0 || it.planExpense > 0);

  return (
    <div className="card card-pad">
      <div className="between mb-12">
        <div>
          <b>🎯 Oylik reja</b>
          <div className="muted tiny">
            {MONTHS_TITLE[data.month - 1]} {data.year}
          </div>
        </div>
        <button className="btn btn-soft btn-sm" onClick={() => openSheet('budget-form')}>
          {data.hasPlan ? 'Tahrirlash' : 'Reja tuzish'}
        </button>
      </div>
      {!rows.length ? (
        <div className="muted small">
          Har bir yo'nalish uchun kutilayotgan daromad va harajat chegarasini belgilang — bot oshib ketsa ogohlantiradi.
        </div>
      ) : (
        <div className="stack gap-14">
          {rows.map((it) => (
            <div key={it.sectorId} className="stack gap-6">
              <div className="between small">
                <b>
                  {it.icon} {it.name}
                </b>
                {it.overspent && <span className="badge red">Chegaradan oshdi</span>}
              </div>
              {it.planIncome > 0 && (
                <>
                  <div className="between tiny muted">
                    <span>Daromad: {compact(it.actualIncome)} / {compact(it.planIncome)}</span>
                    <span>{Math.round(it.incomeProgress || 0)}%</span>
                  </div>
                  <Progress value={it.incomeProgress} color="var(--green)" />
                </>
              )}
              {it.planExpense > 0 && (
                <>
                  <div className="between tiny muted">
                    <span>Harajat: {compact(it.actualExpense)} / {compact(it.planExpense)}</span>
                    <span>{Math.round(it.expenseProgress || 0)}%</span>
                  </div>
                  <Progress value={it.expenseProgress} color="var(--amber)" danger={it.overspent} />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Stats() {
  const { sectors, openSheet } = useApp();
  const [period, setPeriod] = useState('month');
  const [custom, setCustom] = useState(null);
  const [sectorId, setSectorId] = useState(null);
  const [kind, setKind] = useState('EXPENSE');

  const params = {
    period,
    sectorId: sectorId || undefined,
    ...(period === 'custom' && custom ? custom : {}),
  };
  const { data, loading, error, reload } = useApi(() => api.stats(params), [
    period,
    sectorId,
    custom ? custom.from : '',
    custom ? custom.to : '',
  ]);

  const changePeriod = (p) => {
    if (p === 'custom') {
      openSheet('period', {
        ...(custom || {}),
        onApply: (range) => {
          setCustom(range);
          setPeriod('custom');
        },
      });
      return;
    }
    setPeriod(p);
  };

  const key = kind === 'EXPENSE' ? 'expense' : 'income';
  const breakdown = useMemo(() => {
    if (!data) return [];
    if (!sectorId) {
      return data.sectors
        .filter((s) => s[key] > 0)
        .sort((a, b) => b[key] - a[key])
        .map((s) => ({ name: s.name, icon: s.icon, color: s.color, value: s[key] }));
    }
    return data.categories[kind].map((c, i) => ({ name: c.name, icon: c.icon, color: PALETTE[i % PALETTE.length], value: c.amount }));
  }, [data, sectorId, kind, key]);

  const t = data ? data.totals : null;
  const topCats = data ? data.categories[kind].slice(0, 8) : [];
  const rangeText =
    data && data.range.period === 'custom' && data.range.start
      ? `${formatDate(data.range.start)} — ${formatDate(new Date(new Date(data.range.end).getTime() - 1))}`
      : data
      ? data.range.label
      : '';

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Hisobot</h1>
          <div className="muted small">{rangeText}</div>
        </div>
        <button className="icon-btn soft" onClick={() => openSheet('export')} aria-label="Excel">
          <Icon name="download" size={20} />
        </button>
      </div>

      <Segmented value={period} onChange={changePeriod} options={PERIODS} className="mb-12" />
      <Chips
        value={sectorId}
        onChange={setSectorId}
        className="mb-12"
        options={[{ value: null, label: 'Barchasi', icon: '🗂' }, ...sectors.map((s) => ({ value: s.id, label: s.name, icon: s.icon, color: s.color }))]}
      />

      {error && <ErrorBox message={error} onRetry={reload} />}

      <div className="kpis">
        <Kpi label="Daromad" value={t ? t.income : 0} change={data && data.change ? data.change.income : null} tone="green" />
        <Kpi label="Harajat" value={t ? t.expense : 0} change={data && data.change ? data.change.expense : null} tone="red" invert />
        <Kpi label="Sof foyda" value={t ? t.net : 0} change={data && data.change ? data.change.net : null} tone={t && t.net < 0 ? 'red' : ''} />
      </div>

      <div className="card card-pad">
        <div className="between mb-8">
          <b>Dinamika</b>
          {t && t.income > 0 && <span className="badge gray">Rentabellik {Math.round(t.margin)}%</span>}
        </div>
        {!data && loading ? (
          <Skeleton height={180} />
        ) : data && data.series.length > 1 && t.count > 0 ? (
          <BarChart data={data.series} />
        ) : (
          <div className="muted small pad-y">Grafik uchun ma'lumot yetarli emas.</div>
        )}
      </div>

      <div className="card card-pad">
        <div className="between mb-12">
          <b>{sectorId ? "Kategoriyalar bo'yicha" : "Yo'nalishlar bo'yicha"}</b>
          <Segmented
            value={kind}
            onChange={setKind}
            className="mini"
            options={[
              { value: 'EXPENSE', label: 'Harajat' },
              { value: 'INCOME', label: 'Daromad' },
            ]}
          />
        </div>
        {breakdown.length ? (
          <Breakdown items={breakdown} label={kind === 'EXPENSE' ? 'Harajat' : 'Daromad'} currencyTotal={t ? t[key] : 0} />
        ) : (
          <Empty icon="🍩" text={`Bu davrda ${kind === 'EXPENSE' ? 'harajat' : 'daromad'} yo'q`} />
        )}
      </div>

      {topCats.length > 0 && (
        <>
          <SectionHead title={kind === 'EXPENSE' ? 'Eng katta harajatlar' : 'Asosiy daromad manbalari'} />
          <div className="card card-pad stack gap-14">
            {topCats.map((c) => (
              <div key={`${c.id}-${c.sectorId}`} className="stack gap-6">
                <div className="between small">
                  <span className="ellipsis">
                    {c.icon} <b>{c.name}</b>
                    {!sectorId && c.sectorName && <span className="muted"> · {c.sectorName}</span>}
                  </span>
                  <b className="nowrap">{money(c.amount)}</b>
                </div>
                <div className="row gap-8">
                  <div className="grow">
                    <Progress value={c.share} color={c.color} />
                  </div>
                  <span className="tiny muted w-40 right">{c.share}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {data && data.insights.length > 0 && (
        <>
          <SectionHead title="💡 Xulosalar" />
          <div className="stack gap-8">
            {data.insights.map((x, i) => (
              <div key={i} className={`insight ${x.tone}`}>
                <span className="insight-icon">{x.icon}</span>
                <span>{x.text}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHead title="Reja va nazorat" />
      <BudgetCard />

      <button className="btn btn-soft btn-block mt-16" onClick={() => openSheet('export')}>
        <Icon name="download" size={18} /> Excel hisobot olish
      </button>
    </div>
  );
}
