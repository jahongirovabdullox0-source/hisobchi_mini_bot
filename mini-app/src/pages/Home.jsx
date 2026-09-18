import { useState } from 'react';
import Icon from '../components/Icon';
import TxItem from '../components/TxItem';
import { SplitBar } from '../components/Charts';
import { Empty, ErrorBox, PERIOD_OPTIONS, Segmented, SectionHead, Skeleton, SkeletonList } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import { compact, greeting, initials, money, pctText, tint } from '../lib/format';

function Header() {
  const { user, openSheet } = useApp();
  return (
    <header className="home-header">
      <span className="avatar">
        {user.photoUrl ? <img src={user.photoUrl} alt="" /> : initials(`${user.firstName} ${user.lastName || ''}`)}
      </span>
      <div className="grow">
        <div className="muted small">{greeting()} 👋</div>
        <div className="home-name ellipsis">{user.firstName}</div>
      </div>
      <button className="icon-btn soft" onClick={() => openSheet('export')} aria-label="Excel hisobot">
        <Icon name="download" size={20} />
      </button>
    </header>
  );
}

function Stories() {
  const { sectors, push } = useApp();
  return (
    <div className="stories">
      <button className="story" onClick={() => push('history')}>
        <span className="story-ring all">
          <span className="story-icon">🗂</span>
        </span>
        <span className="story-label">Barchasi</span>
      </button>
      {sectors.map((s) => (
        <button
          className="story"
          key={s.id}
          onClick={() => {
            haptic.light();
            push('sector', { id: s.id });
          }}
        >
          <span className="story-ring" style={{ background: `conic-gradient(from 200deg, ${s.color}, ${tint(s.color, 0.25)}, ${s.color})` }}>
            <span className="story-icon">{s.icon}</span>
          </span>
          <span className="story-label">{s.name}</span>
        </button>
      ))}
    </div>
  );
}

function Hero({ data, loading }) {
  const t = data ? data.totals : null;
  const change = data ? data.change : null;
  return (
    <div className="hero">
      <div className="hero-top">
        <span className="hero-label">Sof foyda · {data ? data.range.label : '...'}</span>
        {change && change.net !== null && t && t.count > 0 && (
          <span className={`hero-change ${change.net >= 0 ? 'up' : 'down'}`}>{pctText(change.net)}</span>
        )}
      </div>
      <div className="hero-value">
        {!t && loading ? <Skeleton width="70%" height={36} style={{ opacity: 0.25 }} /> : money(t ? t.net : 0, 'UZS', { sign: true })}
      </div>
      <div className="hero-split">
        <div className="hero-part">
          <span className="hero-dot in">
            <Icon name="income" size={15} stroke={2.4} />
          </span>
          <div>
            <div className="hero-sub">Daromad</div>
            <b>{money(t ? t.income : 0)}</b>
          </div>
        </div>
        <div className="hero-part">
          <span className="hero-dot ex">
            <Icon name="expense" size={15} stroke={2.4} />
          </span>
          <div>
            <div className="hero-sub">Harajat</div>
            <b>{money(t ? t.expense : 0)}</b>
          </div>
        </div>
      </div>
      {data && data.allTime && data.range.period !== 'all' && (
        <div className="hero-foot">
          Butun davr sof foydasi: <b>{money(data.allTime.net, 'UZS', { sign: true })}</b>
        </div>
      )}
    </div>
  );
}

function QuickActions() {
  const { openSheet } = useApp();
  const items = [
    { label: 'Daromad', icon: 'income', color: 'var(--green)', bg: 'var(--green-soft)', go: () => openSheet('tx-form', { type: 'INCOME' }) },
    { label: 'Harajat', icon: 'expense', color: 'var(--red)', bg: 'var(--red-soft)', go: () => openSheet('tx-form', { type: 'EXPENSE' }) },
    { label: 'Qarz', icon: 'users', color: 'var(--blue)', bg: 'var(--blue-soft)', go: () => openSheet('debt-form') },
    { label: 'Reja', icon: 'target', color: 'var(--violet)', bg: 'var(--violet-soft)', go: () => openSheet('budget-form') },
  ];
  return (
    <div className="actions">
      {items.map((a) => (
        <button
          key={a.label}
          className="action"
          onClick={() => {
            haptic.light();
            a.go();
          }}
        >
          <span className="action-icon" style={{ background: a.bg, color: a.color }}>
            <Icon name={a.icon} size={22} stroke={2.2} />
          </span>
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const { user, push, openSheet } = useApp();
  const [period, setPeriod] = useState('month');
  const { data, loading, error, reload } = useApi(() => api.summary({ period }), [period]);

  return (
    <div className="page">
      <Header />
      <Stories />

      <Segmented value={period} onChange={setPeriod} options={PERIOD_OPTIONS} className="mb-12" />
      <Hero data={data} loading={loading} />
      <QuickActions />

      {error && <ErrorBox message={error} onRetry={reload} />}

      {user.transactionsCount < 3 && (
        <div className="tip">
          <span className="tip-icon">⚡</span>
          <div>
            <b>Tezkor yozish</b>
            <div className="small muted">
              Botga shunchaki yozing: <code>-500000 yem</code> yoki <code>+2mln sut</code> — bot o'zi hisoblaydi.
            </div>
          </div>
        </div>
      )}

      <SectionHead title="Yo'nalishlar" />
      {!data && loading ? (
        <SkeletonList rows={4} />
      ) : (
        <div className="stack gap-10">
          {(data ? data.sectors : []).map((s) => (
            <button key={s.id} className="sector-card" onClick={() => push('sector', { id: s.id })}>
              <span className="sector-icon" style={{ background: tint(s.color, 0.14) }}>
                {s.icon}
              </span>
              <span className="grow stack gap-6 minw0">
                <span className="between">
                  <b className="ellipsis">{s.name}</b>
                  <b className={`nowrap ${s.net > 0 ? 'green' : s.net < 0 ? 'red' : 'muted'}`}>{money(s.net, 'UZS', { sign: true })}</b>
                </span>
                <SplitBar income={s.income} expense={s.expense} />
                <span className="between tiny muted">
                  <span>↙ {compact(s.income)}</span>
                  <span>{s.count ? `${s.count} ta amal` : 'amal yo\'q'}</span>
                  <span>↗ {compact(s.expense)}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <SectionHead title="So'nggi amallar" action="Barchasi" onAction={() => push('history')} />
      {!data && loading ? (
        <SkeletonList rows={3} />
      ) : data && data.recent.length ? (
        <div className="card list">
          {data.recent.map((tx) => (
            <TxItem key={tx.id} tx={tx} />
          ))}
        </div>
      ) : (
        <Empty
          icon="📝"
          title="Hali amallar yo'q"
          text="Birinchi daromad yoki harajatingizni qo'shing — hisob-kitobni men qilaman."
          action={
            <button className="btn btn-primary" onClick={() => openSheet('tx-form', { type: 'EXPENSE' })}>
              <Icon name="plus" size={18} /> Amal qo'shish
            </button>
          }
        />
      )}
    </div>
  );
}
