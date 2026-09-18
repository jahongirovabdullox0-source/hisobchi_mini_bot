import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import TxItem from '../components/TxItem';
import { Chips, Empty, ErrorBox, PageHeader, SkeletonList } from '../components/ui';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { compact, dayLabel, money, num, toIsoDay } from '../lib/format';

const PERIODS = [
  { value: '', label: 'Butun davr' },
  { value: 'today', label: 'Bugun' },
  { value: 'week', label: 'Hafta' },
  { value: 'month', label: 'Oy' },
  { value: 'year', label: 'Yil' },
];

export default function History({ params = {} }) {
  const { sectors, version } = useApp();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState(params.type || '');
  const [sectorId, setSectorId] = useState(params.sectorId || null);
  const [period, setPeriod] = useState(params.period || '');
  const [state, setState] = useState({ items: [], page: 1, pages: 1, total: 0, totals: null, loading: true, error: null });
  const seq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(
    async (page) => {
      const id = ++seq.current;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await api.transactions({
          page,
          pageSize: 30,
          q: search,
          type,
          sectorId: sectorId || undefined,
          period: period || undefined,
        });
        if (id !== seq.current) return;
        setState((s) => ({
          items: page === 1 ? res.items : [...s.items, ...res.items],
          page: res.page,
          pages: res.pages,
          total: res.total,
          totals: res.totals,
          loading: false,
          error: null,
        }));
      } catch (e) {
        if (id === seq.current) setState((s) => ({ ...s, loading: false, error: e.message }));
      }
    },
    [search, type, sectorId, period]
  );

  useEffect(() => {
    load(1);
  }, [load, version]);

  const groups = useMemo(() => {
    const out = [];
    let current = null;
    for (const tx of state.items) {
      const key = toIsoDay(tx.occurredAt);
      if (!current || current.key !== key) {
        current = { key, label: dayLabel(tx.occurredAt), items: [], net: 0 };
        out.push(current);
      }
      current.items.push(tx);
      current.net += tx.type === 'INCOME' ? num(tx.amount) : -num(tx.amount);
    }
    return out;
  }, [state.items]);

  const t = state.totals;

  return (
    <div className="page">
      <PageHeader title="Amallar tarixi" subtitle={state.total ? `${state.total} ta amal` : ' '} />

      <div className="search">
        <Icon name="search" size={18} />
        <input placeholder="Izoh yoki kategoriya bo'yicha qidirish" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && (
          <button onClick={() => setQ('')} aria-label="Tozalash">
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      <Chips
        value={type}
        onChange={setType}
        className="mb-8"
        options={[
          { value: '', label: 'Hammasi' },
          { value: 'INCOME', label: 'Daromad', icon: '💰' },
          { value: 'EXPENSE', label: 'Harajat', icon: '💸' },
        ]}
      />
      <Chips
        value={sectorId}
        onChange={setSectorId}
        className="mb-8"
        options={[{ value: null, label: "Barcha yo'nalishlar" }, ...sectors.map((s) => ({ value: s.id, label: s.name, icon: s.icon, color: s.color }))]}
      />
      <Chips value={period} onChange={setPeriod} className="mb-12" options={PERIODS} />

      {t && t.count > 0 && (
        <div className="totals-strip">
          <span>
            ↙ <b className="green">{compact(t.income)}</b>
          </span>
          <span>
            ↗ <b className="red">{compact(t.expense)}</b>
          </span>
          <span>
            = <b className={t.net < 0 ? 'red' : 'green'}>{money(t.net, 'UZS', { sign: true })}</b>
          </span>
        </div>
      )}

      {state.error && <ErrorBox message={state.error} onRetry={() => load(1)} />}

      {state.loading && !state.items.length ? (
        <SkeletonList rows={6} />
      ) : groups.length ? (
        <>
          {groups.map((g) => (
            <div key={g.key} className="day-group">
              <div className="day-head">
                <span>{g.label}</span>
                <span className={g.net < 0 ? 'red' : 'green'}>{money(g.net, 'UZS', { sign: true })}</span>
              </div>
              <div className="card list">
                {g.items.map((tx) => (
                  <TxItem key={tx.id} tx={tx} showDate={false} />
                ))}
              </div>
            </div>
          ))}
          {state.page < state.pages && (
            <button className="btn btn-soft btn-block" disabled={state.loading} onClick={() => load(state.page + 1)}>
              {state.loading ? 'Yuklanmoqda...' : 'Yana yuklash'}
            </button>
          )}
        </>
      ) : (
        <Empty icon="🔍" title="Hech narsa topilmadi" text="Filtrlarni o'zgartirib ko'ring." />
      )}
    </div>
  );
}
