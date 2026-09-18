import { useState } from 'react';
import Sheet from '../components/Sheet';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { confirmDialog, haptic } from '../lib/telegram';
import { formatDate, money, num, rateText, tint } from '../lib/format';

function Row({ label, children }) {
  return (
    <div className="detail-row">
      <span className="muted">{label}</span>
      <span className="detail-value">{children}</span>
    </div>
  );
}

export default function TransactionView({ tx }) {
  const { openSheet, refresh, showToast } = useApp();
  const [busy, setBusy] = useState(false);
  const isIncome = tx.type === 'INCOME';
  const color = tx.sector ? tx.sector.color : '#64748B';
  const qty = num(tx.quantity);

  const remove = async (close) => {
    const ok = await confirmDialog("Bu amalni o'chirmoqchimisiz?");
    if (!ok) return;
    setBusy(true);
    try {
      await api.deleteTx(tx.id);
      haptic.success();
      showToast("Amal o'chirildi");
      refresh();
      close();
    } catch (e) {
      haptic.error();
      showToast(e.message, 'error');
      setBusy(false);
    }
  };

  return (
    <Sheet
      footer={({ close }) => (
        <div className="row gap-8">
          <button className="btn btn-soft grow" onClick={() => openSheet('tx-form', { tx })}>
            <Icon name="edit" size={18} /> Tahrirlash
          </button>
          <button className="btn btn-soft grow" onClick={() => openSheet('tx-form', { tx, duplicate: true })}>
            <Icon name="copy" size={18} /> Yana shunday
          </button>
          <button className="btn btn-danger-soft" disabled={busy} onClick={() => remove(close)} aria-label="O'chirish">
            <Icon name="trash" size={18} />
          </button>
        </div>
      )}
    >
      <div className="tx-hero">
        <span className="tx-hero-icon" style={{ background: tint(color, 0.14) }}>
          {tx.category ? tx.category.icon : tx.sector ? tx.sector.icon : '•'}
        </span>
        <div className={`tx-hero-amount ${isIncome ? 'green' : 'red'}`}>
          {isIncome ? '+' : '−'}
          {money(tx.amount)}
        </div>
        <div className="muted">
          {tx.category ? tx.category.name : 'Kategoriyasiz'} · {isIncome ? 'Daromad' : 'Harajat'}
        </div>
      </div>

      <div className="detail-rows">
        <Row label="Yo'nalish">
          {tx.sector ? `${tx.sector.icon} ${tx.sector.name}` : '—'}
        </Row>
        <Row label="Sana">{formatDate(tx.occurredAt, { time: true, weekday: true })}</Row>
        {tx.currency !== 'UZS' && (
          <>
            <Row label="Asl summa">{money(tx.rawAmount, tx.currency)}</Row>
            <Row label="Kurs">1 {tx.currency} = {rateText(tx.rate)}</Row>
          </>
        )}
        {qty > 0 && (
          <>
            <Row label="Miqdor">
              {qty} {tx.unit || ''}
            </Row>
            <Row label="Birlik narxi">
              {money(num(tx.amount) / qty)} / {tx.unit || 'birlik'}
            </Row>
          </>
        )}
        {tx.note && <Row label="Izoh">{tx.note}</Row>}
        <Row label="Kiritilgan">{formatDate(tx.createdAt, { time: true })}</Row>
      </div>
    </Sheet>
  );
}
