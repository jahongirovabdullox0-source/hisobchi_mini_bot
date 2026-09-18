import { useEffect, useState } from 'react';
import Sheet from '../components/Sheet';
import { SkeletonList, ErrorBox } from '../components/ui';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import { MONTHS_TITLE, formatAmountInput, money, parseAmountInput, tint } from '../lib/format';

export default function BudgetForm({ year, month }) {
  const { refresh, showToast } = useApp();
  const now = new Date();
  const y = year || now.getFullYear();
  const m = month || now.getMonth() + 1;

  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fill = (data) =>
    setItems(
      data.items.map((it) => ({
        ...it,
        income: it.planIncome ? formatAmountInput(String(it.planIncome)) : '',
        expense: it.planExpense ? formatAmountInput(String(it.planExpense)) : '',
      }))
    );

  useEffect(() => {
    api
      .budgets({ year: y, month: m })
      .then(fill)
      .catch((e) => setError(e.message));
  }, [y, m]);

  const update = (sectorId, key, value) =>
    setItems((list) => list.map((it) => (it.sectorId === sectorId ? { ...it, [key]: formatAmountInput(value) } : it)));

  const copyPrev = async () => {
    try {
      fill(await api.copyBudgets({ year: y, month: m }));
      haptic.success();
      showToast("O'tgan oy rejasi ko'chirildi");
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const save = async (close) => {
    setSaving(true);
    try {
      await api.saveBudgets({
        year: y,
        month: m,
        items: items.map((it) => ({
          sectorId: it.sectorId,
          planIncome: parseAmountInput(it.income),
          planExpense: parseAmountInput(it.expense),
        })),
      });
      haptic.success();
      showToast('Oylik reja saqlandi 🎯');
      refresh();
      close();
    } catch (e) {
      haptic.error();
      showToast(e.message, 'error');
      setSaving(false);
    }
  };

  const totalIncome = (items || []).reduce((a, it) => a + parseAmountInput(it.income), 0);
  const totalExpense = (items || []).reduce((a, it) => a + parseAmountInput(it.expense), 0);

  return (
    <Sheet
      title="🎯 Oylik reja"
      subtitle={`${MONTHS_TITLE[m - 1]} ${y} — har bir yo'nalish uchun kutilayotgan daromad va harajat chegarasi`}
      footer={({ close }) => (
        <button className="btn btn-primary btn-lg btn-block" disabled={!items || saving} onClick={() => save(close)}>
          {saving ? 'Saqlanmoqda...' : `Saqlash · reja foyda ${money(totalIncome - totalExpense, 'UZS', { sign: true })}`}
        </button>
      )}
    >
      {error && <ErrorBox message={error} />}
      {!items && !error && <SkeletonList rows={4} />}
      {items && (
        <>
          <button className="btn btn-soft btn-block btn-sm" onClick={copyPrev}>
            ⏮ O'tgan oy rejasidan nusxa olish
          </button>
          {items.map((it) => (
            <div key={it.sectorId} className="budget-edit" style={{ borderColor: tint(it.color, 0.35) }}>
              <div className="row gap-8 bold">
                <span className="sector-dot" style={{ background: tint(it.color, 0.15) }}>
                  {it.icon}
                </span>
                {it.name}
              </div>
              <div className="grid-2">
                <label className="field">
                  <span className="field-label green">Reja daromad</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    placeholder="0"
                    value={it.income}
                    onChange={(e) => update(it.sectorId, 'income', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label red">Harajat chegarasi</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    placeholder="0"
                    value={it.expense}
                    onChange={(e) => update(it.sectorId, 'expense', e.target.value)}
                  />
                </label>
              </div>
            </div>
          ))}
        </>
      )}
    </Sheet>
  );
}
