import { useState } from 'react';
import { api } from '../api';
import { navigate, useLoad } from '../hooks';
import { compact, formatDate, fullName, money, timeAgo } from '../format';
import { BarChart, Badge, Empty, ErrorBox, LiveBadge, Loading, StatCard } from '../components/ui';

function BotStatus() {
  const { data } = useLoad(() => api.info(), []);
  if (!data) return null;
  const b = data.bot;
  if (b.enabled && b.webAppReady) {
    return (
      <div className="banner ok">
        🤖 Bot ishlayapti: <b>@{b.username || '...'}</b> · Mini App: <code>{b.webAppUrl}</code>
      </div>
    );
  }
  return (
    <div className="banner warn">
      {!b.enabled ? (
        <>⚠️ Bot ulanmagan — <code>.env</code> faylida <b>BOT_TOKEN</b> ni to'ldiring va serverni qayta ishga tushiring.</>
      ) : (
        <>
          ⚠️ Bot ishlayapti (<b>@{b.username}</b>), lekin <b>WEBAPP_URL</b> (https ngrok manzili) ko'rsatilmagan — Mini App tugmasi chiqmaydi.
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [live, setLive] = useState(true);
  const { data, loading, error, reload, updatedAt } = useLoad(() => api.overview(), [], { interval: live ? 10_000 : 0 });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Boshqaruv paneli</h1>
          <div className="muted">Barcha foydalanuvchilar bo'yicha umumiy ko'rsatkichlar</div>
        </div>
        <LiveBadge enabled={live} onToggle={() => setLive((v) => !v)} updatedAt={updatedAt} />
      </div>

      <BotStatus />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {!data && loading && <Loading />}

      {data && (
        <>
          <div className="stats-grid">
            <StatCard icon="👥" label="Foydalanuvchilar" value={data.users.total} sub={`Bugun +${data.users.today} · 7 kunda faol: ${data.users.active7d}`} />
            <StatCard icon="🧾" label="Jami amallar" value={data.transactions.total} sub={`Bugun: +${data.transactions.today}`} />
            <StatCard icon="🤝" label="Ochiq qarzlar" value={data.debtsOpen} sub="Barcha foydalanuvchilarda" />
            <StatCard
              icon="🏦"
              label="Butun davr sof foyda"
              value={compact(data.allTime.net)}
              tone={data.allTime.net < 0 ? 'red' : 'green'}
              sub={`Daromad ${compact(data.allTime.income)} · Harajat ${compact(data.allTime.expense)}`}
            />
          </div>

          <div className="stats-grid three">
            <StatCard label={`Daromad · ${data.month.label}`} value={money(data.month.income)} tone="green" />
            <StatCard label={`Harajat · ${data.month.label}`} value={money(data.month.expense)} tone="red" />
            <StatCard
              label={`Sof foyda · ${data.month.label}`}
              value={money(data.month.net, 'UZS', { sign: true })}
              tone={data.month.net < 0 ? 'red' : 'green'}
              sub={data.month.income ? `Rentabellik: ${Math.round(data.month.margin)}%` : null}
            />
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>So'nggi 30 kun dinamikasi</h2>
              <div className="legend">
                <span><i className="dot in" /> Daromad</span>
                <span><i className="dot ex" /> Harajat</span>
              </div>
            </div>
            <BarChart data={data.series} />
          </div>

          <div className="grid-main">
            <div className="panel">
              <div className="panel-head">
                <h2>Yo'nalishlar · {data.month.label}</h2>
              </div>
              <table className="table">
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
                  {data.sectors.map((s) => (
                    <tr key={s.id} className="clickable" onClick={() => navigate('transactions', { sectorId: s.id, period: 'month' })}>
                      <td>
                        <span className="sector-pill" style={{ borderColor: s.color }}>
                          {s.icon} {s.name}
                        </span>
                      </td>
                      <td className="num green">{money(s.income, 'UZS', { suffix: false })}</td>
                      <td className="num red">{money(s.expense, 'UZS', { suffix: false })}</td>
                      <td className={`num bold ${s.net < 0 ? 'red' : ''}`}>{money(s.net, 'UZS', { sign: true, suffix: false })}</td>
                      <td className="num muted">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>Yangi foydalanuvchilar</h2>
                <button className="link" onClick={() => navigate('users')}>
                  Barchasi →
                </button>
              </div>
              {data.newUsers.length ? (
                <div className="list">
                  {data.newUsers.map((u) => (
                    <div className="list-row" key={u.id}>
                      <span className="avatar">{(u.firstName || '?')[0]}</span>
                      <div className="grow">
                        <div className="bold">{fullName(u)}</div>
                        <div className="muted tiny">{u.username ? `@${u.username}` : u.telegramId}</div>
                      </div>
                      <span className="muted tiny">{timeAgo(u.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text="Hali foydalanuvchi yo'q" icon="👤" />
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>So'nggi amallar</h2>
              <button className="link" onClick={() => navigate('transactions')}>
                Barcha amallar →
              </button>
            </div>
            {data.latest.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Vaqt</th>
                    <th>Foydalanuvchi</th>
                    <th>Yo'nalish</th>
                    <th>Kategoriya</th>
                    <th>Izoh</th>
                    <th className="num">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {data.latest.map((t) => (
                    <tr key={t.id}>
                      <td className="nowrap muted">{formatDate(t.createdAt, { time: true })}</td>
                      <td>{fullName(t.user)}</td>
                      <td className="nowrap">
                        {t.sector.icon} {t.sector.name}
                      </td>
                      <td>{t.category ? `${t.category.icon} ${t.category.name}` : <Badge>Kategoriyasiz</Badge>}</td>
                      <td className="muted ellipsis-cell">{t.note || '—'}</td>
                      <td className={`num bold nowrap ${t.type === 'INCOME' ? 'green' : 'red'}`}>
                        {t.type === 'INCOME' ? '+' : '−'}
                        {money(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty text="Hali amallar kiritilmagan" icon="🧾" />
            )}
          </div>
        </>
      )}
    </div>
  );
}
