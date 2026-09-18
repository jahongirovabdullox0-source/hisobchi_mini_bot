import { useMemo, useState } from 'react';
import Sheet from '../components/Sheet';
import Icon from '../components/Icon';
import { Segmented } from '../components/ui';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import {
  CURRENCY_SUFFIX,
  formatAmountInput,
  money,
  parseAmountInput,
  rateText,
  tint,
  todayIso,
  toIsoDay,
  yesterdayIso,
} from '../lib/format';

const QUICK_UZS = [10_000, 50_000, 100_000, 500_000, 1_000_000];
const QUICK_FX = [10, 50, 100, 500, 1000];

export default function TransactionForm({ type: initialType = 'EXPENSE', sectorId: initialSector, categoryId: initialCategory, tx, duplicate = false }) {
  const { sectors, ratesMap, currencies, refresh, showToast } = useApp();
  const isEdit = Boolean(tx && !duplicate);

  const [type, setType] = useState(tx ? tx.type : initialType);
  const [sectorId, setSectorId] = useState(
    (tx && tx.sectorId) || initialSector || (sectors[0] ? sectors[0].id : null)
  );
  const [categoryId, setCategoryId] = useState(tx ? tx.categoryId : initialCategory ?? null);
  const [amount, setAmount] = useState(tx ? formatAmountInput(String(tx.rawAmount).replace('.', ',')) : '');
  const [currency, setCurrency] = useState(tx ? tx.currency : 'UZS');
  const [date, setDate] = useState(tx && !duplicate ? toIsoDay(tx.occurredAt) : todayIso());
  const [note, setNote] = useState(tx && tx.note ? tx.note : '');
  const [quantity, setQuantity] = useState(tx && tx.quantity ? String(tx.quantity) : '');
  const [unit, setUnit] = useState(tx && tx.unit ? tx.unit : '');
  const [showExtra, setShowExtra] = useState(Boolean(tx && (tx.quantity || tx.currency !== 'UZS')));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sector = sectors.find((s) => s.id === sectorId) || null;
  const categories = useMemo(
    () => (sector ? sector.categories.filter((c) => c.type === type) : []),
    [sector, type]
  );
  const category = categories.find((c) => c.id === categoryId) || null;

  const amountNum = parseAmountInput(amount);
  // Tahrirlashda valyuta o'zgarmasa — amal kiritilgan paytdagi kurs saqlanadi
  const rate = isEdit && tx.currency === currency ? Number(tx.rate) || 1 : ratesMap[currency] || 1;
  const converted = Math.round(amountNum * rate * 100) / 100;
  const qtyNum = parseAmountInput(quantity);
  const isIncome = type === 'INCOME';
  const canSave = amountNum > 0 && sectorId && !saving;

  const changeType = (t) => {
    setType(t);
    setCategoryId(null);
  };

  const changeSector = (id) => {
    haptic.select();
    setSectorId(id);
    setCategoryId(null);
  };

  const pickCategory = (c) => {
    haptic.select();
    setCategoryId(c.id === categoryId ? null : c.id);
    if (c.unit && !unit) setUnit(c.unit);
    if (c.unit) setShowExtra(true);
  };

  const addQuick = (v) => {
    haptic.light();
    setAmount(formatAmountInput(String(Math.round((amountNum + v) * 100) / 100).replace('.', ',')));
  };

  const save = async (close) => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    const body = {
      type,
      sectorId,
      categoryId: categoryId || null,
      amount: amountNum,
      currency,
      date,
      note: note.trim() || null,
      quantity: qtyNum > 0 ? qtyNum : null,
      unit: qtyNum > 0 ? unit.trim() || null : null,
    };
    try {
      if (isEdit) await api.updateTx(tx.id, body);
      else await api.createTx(body);
      haptic.success();
      showToast(isEdit ? "O'zgarishlar saqlandi ✅" : isIncome ? "Daromad qo'shildi ✅" : "Harajat qo'shildi ✅");
      refresh();
      close();
    } catch (e) {
      haptic.error();
      setError(e.message);
      setSaving(false);
    }
  };

  const quick = currency === 'UZS' ? QUICK_UZS : QUICK_FX;

  return (
    <Sheet
      title={isEdit ? 'Amalni tahrirlash' : duplicate ? 'Nusxa asosida yangi amal' : 'Yangi amal'}
      footer={({ close }) => (
        <button
          className={`btn btn-lg btn-block ${isIncome ? 'btn-green' : 'btn-primary'}`}
          disabled={!canSave}
          onClick={() => save(close)}
        >
          {saving ? 'Saqlanmoqda...' : amountNum > 0 ? `Saqlash — ${money(converted)}` : 'Summani kiriting'}
        </button>
      )}
    >
      <Segmented
        value={type}
        onChange={changeType}
        className="type-switch"
        options={[
          { value: 'EXPENSE', label: '💸 Harajat', tone: 'tone-red' },
          { value: 'INCOME', label: '💰 Daromad', tone: 'tone-green' },
        ]}
      />

      <div className={`amount-box ${isIncome ? 'income' : 'expense'}`}>
        <div className="amount-row">
          <span className="amount-sign">{isIncome ? '+' : '−'}</span>
          <input
            className="amount-input"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(formatAmountInput(e.target.value))}
            aria-label="Summa"
          />
          <span className="amount-cur">{CURRENCY_SUFFIX[currency] || currency}</span>
        </div>
        {currency !== 'UZS' && (
          <div className="amount-hint">
            ≈ {money(converted)} · 1 {currency} = {rateText(rate)}
          </div>
        )}
        <div className="quick-amounts">
          {quick.map((v) => (
            <button key={v} type="button" onClick={() => addQuick(v)}>
              +{currency === 'UZS' ? (v >= 1_000_000 ? `${v / 1_000_000} mln` : `${v / 1000}k`) : v}
            </button>
          ))}
          {amount && (
            <button type="button" className="clear" onClick={() => setAmount('')} aria-label="Tozalash">
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="form-label">Yo'nalish</div>
      <div className="chips">
        {sectors.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`chip${s.id === sectorId ? ' active' : ''}`}
            style={s.id === sectorId ? { background: s.color, borderColor: s.color } : undefined}
            onClick={() => changeSector(s.id)}
          >
            <span className="chip-icon">{s.icon}</span>
            {s.name}
          </button>
        ))}
      </div>

      <div className="form-label">
        Kategoriya <span className="muted">(ixtiyoriy)</span>
      </div>
      {categories.length ? (
        <div className="cat-grid">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`cat-chip${c.id === categoryId ? ' active' : ''}`}
              style={
                c.id === categoryId && sector
                  ? { borderColor: sector.color, background: tint(sector.color, 0.1), color: 'var(--text)' }
                  : undefined
              }
              onClick={() => pickCategory(c)}
            >
              <span>{c.icon}</span>
              <span className="ellipsis">{c.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="muted small pad-y">Bu yo'nalishda {isIncome ? 'daromad' : 'harajat'} kategoriyasi yo'q.</div>
      )}

      <div className="form-label">Sana</div>
      <div className="row gap-8 wrap">
        <button type="button" className={`chip${date === todayIso() ? ' active' : ''}`} onClick={() => setDate(todayIso())}>
          Bugun
        </button>
        <button
          type="button"
          className={`chip${date === yesterdayIso() ? ' active' : ''}`}
          onClick={() => setDate(yesterdayIso())}
        >
          Kecha
        </button>
        <label className="chip date-chip">
          <Icon name="calendar" size={16} />
          <input type="date" value={date} max={toIsoDay(new Date(Date.now() + 366 * 86_400_000))} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
      </div>

      <div className="form-label">Izoh</div>
      <textarea
        className="input textarea"
        rows={2}
        maxLength={500}
        placeholder={isIncome ? 'Masalan: 200 litr sut, Alisherga' : "Masalan: 20 qop yem, bozordan"}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button type="button" className="link more-toggle" onClick={() => setShowExtra((v) => !v)}>
        {showExtra ? '− Qo\'shimchani yashirish' : '+ Miqdor va valyuta'}
      </button>

      {showExtra && (
        <div className="extra-box">
          <div className="form-label">Valyuta</div>
          <div className="chips">
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip${c === currency ? ' active' : ''}`}
                onClick={() => {
                  haptic.select();
                  setCurrency(c);
                }}
              >
                {c} <span className="muted-inline">{CURRENCY_SUFFIX[c]}</span>
              </button>
            ))}
          </div>

          <div className="form-label">Miqdor</div>
          <div className="row gap-8">
            <input
              className="input grow"
              inputMode="decimal"
              placeholder="Masalan: 20"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/[^\d.,]/g, ''))}
            />
            <input
              className="input unit-input"
              placeholder={category && category.unit ? category.unit : 'kg, litr...'}
              value={unit}
              maxLength={20}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
          {qtyNum > 0 && amountNum > 0 && (
            <div className="muted small pad-y">
              1 {unit || 'birlik'} ≈ <b>{money(converted / qtyNum)}</b>
            </div>
          )}
        </div>
      )}

      {error && <div className="form-error">⚠️ {error}</div>}
    </Sheet>
  );
}
