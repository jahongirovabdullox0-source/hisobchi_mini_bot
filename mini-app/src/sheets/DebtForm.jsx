import { useState } from 'react';
import Sheet from '../components/Sheet';
import { Segmented } from '../components/ui';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import { CURRENCY_SUFFIX, formatAmountInput, money, parseAmountInput, toIsoDay } from '../lib/format';

export default function DebtForm({ debt, direction: initialDirection = 'OWED_TO_ME' }) {
  const { currencies, refresh, showToast } = useApp();
  const isEdit = Boolean(debt);
  const [direction, setDirection] = useState(debt ? debt.direction : initialDirection);
  const [person, setPerson] = useState(debt ? debt.person : '');
  const [phone, setPhone] = useState(debt && debt.phone ? debt.phone : '');
  const [amount, setAmount] = useState(debt ? formatAmountInput(String(debt.amount).replace('.', ',')) : '');
  const [currency, setCurrency] = useState(debt ? debt.currency : 'UZS');
  const [dueDate, setDueDate] = useState(debt && debt.dueDate ? toIsoDay(debt.dueDate) : '');
  const [note, setNote] = useState(debt && debt.note ? debt.note : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const amountNum = parseAmountInput(amount);
  const canSave = person.trim() && amountNum > 0 && !saving;

  const save = async (close) => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    const body = {
      direction,
      person: person.trim(),
      phone: phone.trim() || null,
      amount: amountNum,
      currency,
      dueDate: dueDate || null,
      note: note.trim() || null,
    };
    try {
      if (isEdit) await api.updateDebt(debt.id, body);
      else await api.createDebt(body);
      haptic.success();
      showToast(isEdit ? 'Qarz yangilandi ✅' : "Qarz qo'shildi ✅");
      refresh();
      close();
    } catch (e) {
      haptic.error();
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={isEdit ? 'Qarzni tahrirlash' : 'Yangi qarz'}
      footer={({ close }) => (
        <button className="btn btn-primary btn-lg btn-block" disabled={!canSave} onClick={() => save(close)}>
          {saving ? 'Saqlanmoqda...' : amountNum > 0 ? `Saqlash — ${money(amountNum, currency)}` : 'Saqlash'}
        </button>
      )}
    >
      <Segmented
        value={direction}
        onChange={setDirection}
        options={[
          { value: 'OWED_TO_ME', label: '🟢 Menga qarzdor', tone: 'tone-green' },
          { value: 'I_OWE', label: '🔴 Men qarzdorman', tone: 'tone-red' },
        ]}
      />

      <div className="form-label">{direction === 'OWED_TO_ME' ? 'Kim sizga qarzdor?' : 'Kimdan qarz oldingiz?'}</div>
      <input className="input" placeholder="Ism familiya" value={person} maxLength={100} onChange={(e) => setPerson(e.target.value)} />

      <div className="form-label">Summa</div>
      <div className="row gap-8">
        <input
          className="input grow input-lg"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(formatAmountInput(e.target.value))}
        />
        <select className="input select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c} ({CURRENCY_SUFFIX[c] || c})
            </option>
          ))}
        </select>
      </div>

      <div className="grid-2">
        <div>
          <div className="form-label">Telefon</div>
          <input className="input" inputMode="tel" placeholder="+998..." value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <div className="form-label">Qaytarish sanasi</div>
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <div className="form-label">Izoh</div>
      <textarea className="input textarea" rows={2} maxLength={500} placeholder="Masalan: mol olish uchun" value={note} onChange={(e) => setNote(e.target.value)} />

      {error && <div className="form-error">⚠️ {error}</div>}
    </Sheet>
  );
}
