import { useApp } from '../context/AppContext';
import { formatDate, formatTime, money, tint, CURRENCY_SUFFIX } from '../lib/format';
import { haptic } from '../lib/telegram';

export default function TxItem({ tx, showDate = true }) {
  const { openSheet } = useApp();
  const isIncome = tx.type === 'INCOME';
  const color = tx.sector ? tx.sector.color : '#64748B';
  const title = tx.category ? tx.category.name : tx.sector ? tx.sector.name : 'Amal';
  const sub = [tx.category && tx.sector ? tx.sector.name : null, tx.note].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      className="tx-item"
      onClick={() => {
        haptic.light();
        openSheet('tx-view', { tx });
      }}
    >
      <span className="tx-icon" style={{ background: tint(color, 0.13) }}>
        {tx.category ? tx.category.icon : tx.sector ? tx.sector.icon : '•'}
      </span>
      <span className="tx-main">
        <span className="tx-title ellipsis">{title}</span>
        <span className="tx-sub ellipsis">{sub || (isIncome ? 'Daromad' : 'Harajat')}</span>
      </span>
      <span className="tx-right">
        <span className={`tx-amount ${isIncome ? 'green' : 'red'}`}>
          {isIncome ? '+' : '−'}
          {money(tx.amount, 'UZS', { suffix: false })}
        </span>
        <span className="tx-date">
          {tx.currency !== 'UZS'
            ? `${money(tx.rawAmount, tx.currency, { suffix: false })} ${CURRENCY_SUFFIX[tx.currency] || tx.currency}`
            : showDate
            ? formatDate(tx.occurredAt)
            : formatTime(tx.occurredAt)}
        </span>
      </span>
    </button>
  );
}
