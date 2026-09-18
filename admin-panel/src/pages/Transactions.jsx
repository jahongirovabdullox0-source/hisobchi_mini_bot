import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLoad } from '../hooks';
import { compact, formatDate, fullName, money, num } from '../format';
import { Badge, Empty, ErrorBox, LiveBadge, Loading, Pagination, useToast } from '../components/ui';

const PERIODS = [
  { value: '', label: 'Butun davr' },
  { value: 'today', label: 'Bugun' },
  { value: 'week', label: 'Shu hafta' },
  { value: 'month', label: 'Shu oy' },
  { value: 'year', label: 'Shu yil' },
  { value: 'custom', label: 'Tanlangan sana' },
];

export default function Transactions({ query = {} }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState(query.type || '');
  const [sectorId, setSectorId] = useState(query.sectorId || '');
  const [userId, setUserId] = useState(query.userId || '');
  const [period, setPeriod] = useState(query.period || '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [live, setLive] = useState(false);
  const [exporting, setExporting] = useState(false);

  const sectors = useLoad(() => api.sectors(), []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => setPage(1), [search, type, sectorId, userId, period, from, to, pageSize]);

  const params = {
    q: search,
    type,
    sectorId,
    userId,
    period: period === 'custom' && !from ? '' : period,
    from: period === 'custom' ? from : undefined,
    to: period === 'custom' ? to || from : undefined,
    page,
    pageSize,
  };

  const { data, loading, error, reload, updatedAt } = useLoad(
    () => api.transactions(params),
    [search, type, sectorId, userId, period, from, to, page, pageSize],
    { interval: live ? 10_000 : 0 }
  );

  const remove = async (tx) => {
    if (!window.confirm(`${fullName(tx.user)} ning ${money(tx.amount)} lik amalini o'chirasizmi?`)) return;
    try {
      await api.deleteTx(tx.id);
      toast("Amal o'chirildi");
      reload(true);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const { page: _p, pageSize: _s, ...filters } = params;
      await api.exportTx(filters);
      toast('Excel fayl yuklab olindi 📥');
    } catch (e) {
      toast(e.message, 'error');
    }
    setExporting(false);
  };

  const t = data ? data.totals : null;
  const sectorList = sectors.data || [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Amallar</h1>
          <div className="muted">Barcha foydalanuvchilarning kirim-chiqimlari</div>
        </div>
        <div className="row gap-8">
          <LiveBadge enabled={live} onToggle={() => setLive((v) => !v)} updatedAt={updatedAt} />
          <button className="btn btn-primary" onClick={exportExcel} disabled={exporting}>
            {exporting ? 'Tayyorlanmoqda...' : '📥 Excel'}
          </button>
        </div>
      </div>

      <div className="filters">
        <input className="input search-input" placeholder="🔍 Izoh, kategoriya yoki foydalanuvchi..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Barcha turlar</option>
          <option value="INCOME">💰 Daromad</option>
          <option value="EXPENSE">💸 Harajat</option>
        </select>
        <select className="input" value={sectorId} onChange={(e) => setSectorId(e.target.value)}>
          <option value="">Barcha yo'nalishlar</option>
          {sectorList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.icon} {s.name}
            </option>
          ))}
        </select>
        <select className="input" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {period === 'custom' && (
          <>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        )}
        {userId && (
          <button className="btn btn-soft" onClick={() => setUserId('')}>
            👤 Foydalanuvchi #{userId} ✕
          </button>
        )}
      </div>

      {t && (
        <div className="summary-strip">
          <span>
            Amallar: <b>{t.count}</b>
          </span>
          <span>
            Daromad: <b className="green">{money(t.income)}</b>
          </span>
          <span>
            Harajat: <b className="red">{money(t.expense)}</b>
          </span>
          <span>
            Sof foyda: <b className={t.net < 0 ? 'red' : 'green'}>{money(t.net, 'UZS', { sign: true })}</b>
          </span>
        </div>
      )}

      {error && <ErrorBox message={error} onRetry={reload} />}

      <div className="panel no-pad">
        {!data && loading ? (
          <Loading />
        ) : data && data.items.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Sana</th>
                <th>Foydalanuvchi</th>
                <th>Yo'nalish</th>
                <th>Kategoriya</th>
                <th>Izoh</th>
                <th className="num">Summa</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((tx) => (
                <tr key={tx.id}>
                  <td className="nowrap">
                    {formatDate(tx.occurredAt, { time: true })}
                  </td>
                  <td>
                    <button className="link" onClick={() => setUserId(String(tx.user.id))}>
                      {fullName(tx.user)}
                    </button>
                    {tx.user.phone && <div className="muted tiny">{tx.user.phone}</div>}
                  </td>
                  <td className="nowrap">
                    {tx.sector.icon} {tx.sector.name}
                  </td>
                  <td>{tx.category ? `${tx.category.icon} ${tx.category.name}` : <Badge>Kategoriyasiz</Badge>}</td>
                  <td className="muted ellipsis-cell" title={tx.note || ''}>
                    {tx.note || '—'}
                    {num(tx.quantity) > 0 && (
                      <div className="tiny">
                        ⚖️ {num(tx.quantity)} {tx.unit}
                      </div>
                    )}
                  </td>
                  <td className={`num bold nowrap ${tx.type === 'INCOME' ? 'green' : 'red'}`}>
                    {tx.type === 'INCOME' ? '+' : '−'}
                    {money(tx.amount)}
                    {tx.currency !== 'UZS' && (
                      <div className="muted tiny">
                        {money(tx.rawAmount, tx.currency)} × {compact(tx.rate)}
                      </div>
                    )}
                  </td>
                  <td className="num">
                    <button className="icon-btn danger" onClick={() => remove(tx)} title="O'chirish">
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty text="Filtrga mos amal topilmadi" icon="🔍" />
        )}
      </div>

      {data && (
        <div className="row between-row">
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
          <select className="input input-sm" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {[25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n} tadan
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
