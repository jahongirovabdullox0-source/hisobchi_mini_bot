import { useState } from 'react';
import Icon from '../components/Icon';
import { Chips, Empty, ErrorBox, Progress, Segmented, SkeletonList } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import { formatDate, initials, money, num } from '../lib/format';

function DebtItem({ debt }) {
  const { openSheet } = useApp();
  const total = num(debt.amount);
  const paid = num(debt.paidAmount);
  const left = Math.max(0, total - paid);
  const owedToMe = debt.direction === 'OWED_TO_ME';
  const overdue = !debt.isClosed && debt.dueDate && new Date(debt.dueDate).getTime() < Date.now();

  return (
    <button
      className="debt-item"
      onClick={() => {
        haptic.light();
        openSheet('debt-view', { debt });
      }}
    >
      <span className={`avatar ${owedToMe ? 'green-soft' : 'red-soft'}`}>{initials(debt.person)}</span>
      <span className="grow stack gap-6 minw0">
        <span className="between">
          <b className="ellipsis">{debt.person}</b>
          <b className={debt.isClosed ? 'muted' : owedToMe ? 'green' : 'red'}>{money(left, debt.currency)}</b>
        </span>
        {paid > 0 && <Progress value={(paid / total) * 100} color={owedToMe ? 'var(--green)' : 'var(--red)'} />}
        <span className="between tiny muted">
          <span className="ellipsis">{debt.note || (owedToMe ? 'Sizga qarzdor' : 'Siz qarzdorsiz')}</span>
          {debt.isClosed ? (
            <span className="badge gray">✅ Yopilgan</span>
          ) : debt.dueDate ? (
            <span className={`badge ${overdue ? 'red' : 'gray'}`}>
              {overdue ? '⏰ ' : '🗓 '}
              {formatDate(debt.dueDate)}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

export default function Debts() {
  const { openSheet } = useApp();
  const [status, setStatus] = useState('open');
  const [direction, setDirection] = useState('');
  const { data, loading, error, reload } = useApi(
    () => api.debts({ status, direction: direction || undefined }),
    [status, direction]
  );
  const s = data ? data.summary : null;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Qarz daftari</h1>
          <div className="muted small">Kim kimga qancha qarz — hammasi nazoratda</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => openSheet('debt-form', { direction: direction || 'OWED_TO_ME' })}>
          <Icon name="plus" size={18} /> Qo'shish
        </button>
      </div>

      <div className="grid-2 mb-12">
        <div className="stat-card green-soft">
          <span className="small">🟢 Sizga qarzdorlar</span>
          <b className="green">{money(s ? s.owedToMe : 0)}</b>
        </div>
        <div className="stat-card red-soft">
          <span className="small">🔴 Sizning qarzingiz</span>
          <b className="red">{money(s ? s.iOwe : 0)}</b>
        </div>
      </div>
      {s && s.overdue > 0 && <div className="notice red">⏰ Muddati o'tgan qarzlar: {s.overdue} ta</div>}

      <Segmented
        value={status}
        onChange={setStatus}
        className="mb-12"
        options={[
          { value: 'open', label: 'Ochiq' },
          { value: 'closed', label: 'Yopilgan' },
          { value: 'all', label: 'Hammasi' },
        ]}
      />
      <Chips
        value={direction}
        onChange={setDirection}
        className="mb-12"
        options={[
          { value: '', label: 'Hammasi' },
          { value: 'OWED_TO_ME', label: 'Menga qarzdorlar', icon: '🟢' },
          { value: 'I_OWE', label: 'Mening qarzlarim', icon: '🔴' },
        ]}
      />

      {error && <ErrorBox message={error} onRetry={reload} />}
      {!data && loading ? (
        <SkeletonList rows={4} />
      ) : data && data.items.length ? (
        <div className="card list">
          {data.items.map((d) => (
            <DebtItem key={d.id} debt={d} />
          ))}
        </div>
      ) : (
        <Empty
          icon="🤝"
          title={status === 'closed' ? "Yopilgan qarzlar yo'q" : "Ochiq qarzlar yo'q"}
          text="Qarz bergan yoki olgan bo'lsangiz — shu yerga yozib qo'ying, muddati kelganda bot eslatadi."
          action={
            <button className="btn btn-primary" onClick={() => openSheet('debt-form')}>
              <Icon name="plus" size={18} /> Qarz qo'shish
            </button>
          }
        />
      )}
    </div>
  );
}
