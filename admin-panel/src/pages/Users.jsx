import { useEffect, useState } from 'react';
import { api } from '../api';
import { navigate, useLoad } from '../hooks';
import { compact, formatDate, fullName, money, timeAgo } from '../format';
import { Badge, Empty, ErrorBox, Loading, Modal, Pagination, StatCard, useToast } from '../components/ui';

function UserModal({ id, onClose, onChanged }) {
  const toast = useToast();
  const [period, setPeriod] = useState('all');
  const { data, loading, error, reload } = useLoad(() => api.user(id, { period }), [id, period]);
  const [busy, setBusy] = useState(false);

  const toggleBlock = async () => {
    const block = !data.user.isBlocked;
    if (block && !window.confirm(`${fullName(data.user)} ni bloklaysizmi? U botdan va ilovadan foydalana olmaydi.`)) return;
    setBusy(true);
    try {
      await api.updateUser(id, { isBlocked: block });
      toast(block ? 'Foydalanuvchi bloklandi' : 'Blokdan chiqarildi');
      reload(true);
      onChanged();
    } catch (e) {
      toast(e.message, 'error');
    }
    setBusy(false);
  };

  const u = data ? data.user : null;
  const s = data ? data.summary : null;

  return (
    <Modal
      title={u ? `👤 ${fullName(u)}` : 'Foydalanuvchi'}
      onClose={onClose}
      width={860}
      footer={
        u && (
          <>
            <button className="btn btn-soft" onClick={() => navigate('transactions', { userId: u.id })}>
              🧾 Barcha amallari
            </button>
            <button className={`btn ${u.isBlocked ? 'btn-primary' : 'btn-danger'}`} disabled={busy} onClick={toggleBlock}>
              {u.isBlocked ? '✅ Blokdan chiqarish' : '⛔ Bloklash'}
            </button>
          </>
        )
      }
    >
      {error && <ErrorBox message={error} onRetry={reload} />}
      {!data && loading && <Loading />}
      {u && s && (
        <>
          <div className="user-meta">
            <span>{u.username ? `@${u.username}` : '—'}</span>
            <span>📞 {u.phone || "raqam yo'q"}</span>
            <span>🆔 {u.telegramId}</span>
            <span>📅 {formatDate(u.createdAt)}</span>
            <span>🕒 {timeAgo(u.lastSeenAt)}</span>
            {u.isBlocked && <Badge tone="red">Bloklangan</Badge>}
          </div>

          <div className="row gap-8 mb-12">
            {[
              ['all', 'Butun davr'],
              ['year', 'Shu yil'],
              ['month', 'Shu oy'],
              ['week', 'Shu hafta'],
            ].map(([value, label]) => (
              <button key={value} className={`chip${period === value ? ' active' : ''}`} onClick={() => setPeriod(value)}>
                {label}
              </button>
            ))}
          </div>

          <div className="stats-grid three">
            <StatCard label="Daromad" value={money(s.totals.income)} tone="green" />
            <StatCard label="Harajat" value={money(s.totals.expense)} tone="red" />
            <StatCard label="Sof foyda" value={money(s.totals.net, 'UZS', { sign: true })} tone={s.totals.net < 0 ? 'red' : 'green'} sub={`${s.totals.count} ta amal`} />
          </div>

          <h4>Yo'nalishlar bo'yicha</h4>
          <table className="table compact">
            <thead>
              <tr>
                <th>Yo'nalish</th>
                <th className="num">Daromad</th>
                <th className="num">Harajat</th>
                <th className="num">Sof foyda</th>
                <th className="num">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {s.sectors.map((x) => (
                <tr key={x.id}>
                  <td>
                    {x.icon} {x.name}
                  </td>
                  <td className="num green">{compact(x.income)}</td>
                  <td className="num red">{compact(x.expense)}</td>
                  <td className={`num bold ${x.net < 0 ? 'red' : ''}`}>{compact(x.net)}</td>
                  <td className="num muted">{x.count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row gap-8 mt-12">
            <Badge tone="green">Unga qarzdorlar: {money(data.debts.owedToMe)}</Badge>
            <Badge tone="red">Uning qarzlari: {money(data.debts.iOwe)}</Badge>
          </div>

          <h4>So'nggi amallar</h4>
          {data.recent.length ? (
            <table className="table compact">
              <tbody>
                {data.recent.map((t) => (
                  <tr key={t.id}>
                    <td className="nowrap muted">{formatDate(t.occurredAt)}</td>
                    <td>
                      {t.sector.icon} {t.category ? t.category.name : t.sector.name}
                    </td>
                    <td className="muted ellipsis-cell">{t.note || ''}</td>
                    <td className={`num bold nowrap ${t.type === 'INCOME' ? 'green' : 'red'}`}>
                      {t.type === 'INCOME' ? '+' : '−'}
                      {money(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty text="Amallar yo'q" />
          )}
        </>
      )}
    </Modal>
  );
}

export default function Users() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, error, reload } = useLoad(() => api.users({ q: search, page }), [search, page]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Foydalanuvchilar</h1>
          <div className="muted">Botdan foydalanayotgan barcha odamlar</div>
        </div>
      </div>

      <div className="filters">
        <input className="input search-input" placeholder="🔍 Ism, username, telefon yoki Telegram ID..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}

      <div className="panel no-pad">
        {!data && loading ? (
          <Loading />
        ) : data && data.items.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Foydalanuvchi</th>
                <th>Telefon</th>
                <th className="num">Amallar</th>
                <th className="num">Daromad</th>
                <th className="num">Harajat</th>
                <th className="num">Sof foyda</th>
                <th>Ro'yxatdan o'tgan</th>
                <th>Oxirgi faollik</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id} className="clickable" onClick={() => setOpenId(u.id)}>
                  <td>
                    <div className="row gap-8">
                      <span className="avatar">{(u.firstName || '?')[0]}</span>
                      <div>
                        <div className="bold">{fullName(u)}</div>
                        <div className="muted tiny">{u.username ? `@${u.username}` : `ID: ${u.telegramId}`}</div>
                      </div>
                    </div>
                  </td>
                  <td className="nowrap">{u.phone || <span className="muted">—</span>}</td>
                  <td className="num">{u._count.transactions}</td>
                  <td className="num green">{compact(u.totals.income)}</td>
                  <td className="num red">{compact(u.totals.expense)}</td>
                  <td className={`num bold ${u.totals.net < 0 ? 'red' : ''}`}>{compact(u.totals.net)}</td>
                  <td className="nowrap muted">{formatDate(u.createdAt)}</td>
                  <td className="nowrap muted">{timeAgo(u.lastSeenAt)}</td>
                  <td>{u.isBlocked ? <Badge tone="red">Bloklangan</Badge> : <Badge tone="green">Faol</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty text="Foydalanuvchi topilmadi" icon="👤" />
        )}
      </div>

      {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}

      {openId && <UserModal id={openId} onClose={() => setOpenId(null)} onChanged={() => reload(true)} />}
    </div>
  );
}
