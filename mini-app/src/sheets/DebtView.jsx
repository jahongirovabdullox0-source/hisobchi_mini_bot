import { useState } from 'react';
import Sheet from '../components/Sheet';
import Icon from '../components/Icon';
import { Progress } from '../components/ui';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { confirmDialog, haptic } from '../lib/telegram';
import { formatAmountInput, formatDate, initials, money, num, parseAmountInput } from '../lib/format';

export default function DebtView({ debt }) {
  const { openSheet, refresh, showToast } = useApp();
  const [pay, setPay] = useState('');
  const [busy, setBusy] = useState(false);

  const total = num(debt.amount);
  const paid = num(debt.paidAmount);
  const left = Math.max(0, total - paid);
  const progress = total ? (paid / total) * 100 : 0;
  const owedToMe = debt.direction === 'OWED_TO_ME';
  const overdue = !debt.isClosed && debt.dueDate && new Date(debt.dueDate).getTime() < Date.now();

  const run = async (fn, message, close) => {
    setBusy(true);
    try {
      await fn();
      haptic.success();
      showToast(message);
      refresh();
      close();
    } catch (e) {
      haptic.error();
      showToast(e.message, 'error');
      setBusy(false);
    }
  };

  const payAmount = parseAmountInput(pay);

  return (
    <Sheet>
      {({ close }) => (
        <>
          <div className="tx-hero">
            <span className={`avatar lg ${owedToMe ? 'green-soft' : 'red-soft'}`}>{initials(debt.person)}</span>
            <div className="tx-hero-title">{debt.person}</div>
            <div className={`tx-hero-amount ${owedToMe ? 'green' : 'red'}`}>{money(left, debt.currency)}</div>
            <div className="muted small">
              {owedToMe ? 'sizga qaytarishi kerak' : 'siz qaytarishingiz kerak'}
              {debt.isClosed && ' · ✅ yopilgan'}
            </div>
          </div>

          <div className="card card-pad">
            <div className="between small">
              <span className="muted">To'landi</span>
              <b>
                {money(paid, debt.currency)} / {money(total, debt.currency)}
              </b>
            </div>
            <Progress value={progress} color={owedToMe ? 'var(--green)' : 'var(--red)'} />
          </div>

          <div className="detail-rows">
            {debt.dueDate && (
              <div className="detail-row">
                <span className="muted">Qaytarish sanasi</span>
                <span className={`detail-value ${overdue ? 'red' : ''}`}>
                  {formatDate(debt.dueDate)} {overdue && '· muddati o\'tgan'}
                </span>
              </div>
            )}
            {debt.phone && (
              <div className="detail-row">
                <span className="muted">Telefon</span>
                <a className="detail-value link" href={`tel:${debt.phone}`}>
                  <Icon name="phone" size={14} /> {debt.phone}
                </a>
              </div>
            )}
            {debt.note && (
              <div className="detail-row">
                <span className="muted">Izoh</span>
                <span className="detail-value">{debt.note}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="muted">Yozilgan</span>
              <span className="detail-value">{formatDate(debt.createdAt)}</span>
            </div>
          </div>

          {!debt.isClosed && (
            <div className="card card-pad stack gap-8">
              <div className="bold">To'lov kiritish</div>
              <div className="row gap-8">
                <input
                  className="input grow"
                  inputMode="decimal"
                  placeholder={`Masalan: ${money(Math.min(left, 500000), debt.currency, { suffix: false })}`}
                  value={pay}
                  onChange={(e) => setPay(formatAmountInput(e.target.value))}
                />
                <button
                  className="btn btn-primary"
                  disabled={busy || payAmount <= 0}
                  onClick={() => run(() => api.payDebt(debt.id, { amount: payAmount }), "To'lov qo'shildi ✅", close)}
                >
                  Qo'shish
                </button>
              </div>
              <button
                className="btn btn-green btn-block"
                disabled={busy}
                onClick={() => run(() => api.payDebt(debt.id, { full: true }), 'Qarz to\'liq yopildi 🎉', close)}
              >
                <Icon name="check" size={18} /> To'liq yopish ({money(left, debt.currency)})
              </button>
            </div>
          )}

          <div className="row gap-8">
            <button className="btn btn-soft grow" onClick={() => openSheet('debt-form', { debt })}>
              <Icon name="edit" size={18} /> Tahrirlash
            </button>
            {debt.isClosed && (
              <button
                className="btn btn-soft grow"
                disabled={busy}
                onClick={() => run(() => api.updateDebt(debt.id, { isClosed: false }), 'Qarz qayta ochildi', close)}
              >
                <Icon name="refresh" size={18} /> Qayta ochish
              </button>
            )}
            <button
              className="btn btn-danger-soft"
              disabled={busy}
              aria-label="O'chirish"
              onClick={async () => {
                if (await confirmDialog("Bu qarz yozuvini o'chirmoqchimisiz?")) {
                  run(() => api.deleteDebt(debt.id), "Qarz o'chirildi", close);
                }
              }}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
