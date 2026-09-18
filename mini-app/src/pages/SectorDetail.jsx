import { useState } from 'react';
import Icon from '../components/Icon';
import TxItem from '../components/TxItem';
import { BarChart } from '../components/Charts';
import { Empty, ErrorBox, PERIOD_OPTIONS, PageHeader, Progress, Segmented, SectionHead, Skeleton, SkeletonList } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { money, pctText, tint } from '../lib/format';

function CategoryList({ items, color, emptyText }) {
  if (!items.length) return <div className="muted small pad-y">{emptyText}</div>;
  return (
    <div className="stack gap-12">
      {items.map((c) => (
        <div key={c.id || 'none'} className="stack gap-6">
          <div className="between small">
            <span className="ellipsis">
              {c.icon} {c.name} <span className="muted">· {c.count} ta</span>
            </span>
            <b className="nowrap">{money(c.amount)}</b>
          </div>
          <div className="row gap-8">
            <div className="grow">
              <Progress value={c.share} color={color} />
            </div>
            <span className="tiny muted w-40 right">{c.share}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SectorDetail({ params }) {
  const { sectorsById, openSheet, push } = useApp();
  const [period, setPeriod] = useState('month');
  const { data, loading, error, reload } = useApi(() => api.sector(params.id, { period }), [params.id, period]);
  const sector = (data && data.sector) || sectorsById.get(params.id) || { name: "Yo'nalish", icon: '📁', color: '#64748B' };
  const t = data ? data.totals : null;

  return (
    <div className="page">
      <PageHeader title={`${sector.icon} ${sector.name}`} subtitle={data ? data.range.label : ''} />

      <Segmented value={period} onChange={setPeriod} options={PERIOD_OPTIONS} className="mb-12" />
      {error && <ErrorBox message={error} onRetry={reload} />}

      <div className="sector-hero" style={{ background: tint(sector.color, 0.1), borderColor: tint(sector.color, 0.25) }}>
        <div className="muted small">Sof foyda</div>
        <div className={`sector-hero-value ${t && t.net < 0 ? 'red' : ''}`}>
          {t ? money(t.net, 'UZS', { sign: true }) : <Skeleton width="60%" height={30} />}
        </div>
        {data && data.change && data.change.net !== null && t.count > 0 && (
          <div className="tiny muted">Oldingi davrga nisbatan: {pctText(data.change.net)}</div>
        )}
        <div className="grid-2 mt-12">
          <div className="mini-stat">
            <span className="muted tiny">↙ Daromad</span>
            <b className="green">{money(t ? t.income : 0)}</b>
          </div>
          <div className="mini-stat">
            <span className="muted tiny">↗ Harajat</span>
            <b className="red">{money(t ? t.expense : 0)}</b>
          </div>
        </div>
        {t && t.income > 0 && (
          <div className="tiny muted mt-8">
            Rentabellik: <b>{Math.round(t.margin)}%</b> · {t.count} ta amal
          </div>
        )}
      </div>

      <div className="grid-2 mb-12">
        <button className="btn btn-green-soft" onClick={() => openSheet('tx-form', { type: 'INCOME', sectorId: params.id })}>
          <Icon name="income" size={18} /> Daromad
        </button>
        <button className="btn btn-red-soft" onClick={() => openSheet('tx-form', { type: 'EXPENSE', sectorId: params.id })}>
          <Icon name="expense" size={18} /> Harajat
        </button>
      </div>

      {data && data.series.length > 1 && t.count > 0 && (
        <div className="card card-pad">
          <b className="block mb-8">Dinamika</b>
          <BarChart data={data.series} height={130} />
        </div>
      )}

      <SectionHead title="💰 Daromad manbalari" />
      <div className="card card-pad">
        {data ? (
          <CategoryList items={data.categories.INCOME} color="var(--green)" emptyText="Bu davrda daromad yozilmagan." />
        ) : (
          <SkeletonList rows={2} />
        )}
      </div>

      <SectionHead title="💸 Harajatlar tarkibi" />
      <div className="card card-pad">
        {data ? (
          <CategoryList items={data.categories.EXPENSE} color="var(--red)" emptyText="Bu davrda harajat yozilmagan." />
        ) : (
          <SkeletonList rows={2} />
        )}
      </div>

      <SectionHead
        title="Amallar"
        action="Barchasi"
        onAction={() => push('history', { sectorId: params.id, period: period === 'all' ? '' : period })}
      />
      {!data && loading ? (
        <SkeletonList rows={3} />
      ) : data && data.recent.length ? (
        <div className="card list">
          {data.recent.map((tx) => (
            <TxItem key={tx.id} tx={tx} />
          ))}
        </div>
      ) : (
        <Empty icon={sector.icon} text="Bu davrda amallar yo'q" />
      )}
    </div>
  );
}
