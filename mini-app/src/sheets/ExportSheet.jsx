import { useState } from 'react';
import Sheet from '../components/Sheet';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { haptic, isTelegram } from '../lib/telegram';
import { previousMonthRange } from '../lib/format';

const OPTIONS = [
  { id: 'month', icon: '🗓', label: 'Shu oy', body: () => ({ period: 'month' }) },
  { id: 'prev', icon: '⏮', label: "O'tgan oy", body: () => ({ period: 'custom', ...previousMonthRange() }) },
  { id: 'year', icon: '📅', label: 'Shu yil', body: () => ({ period: 'year' }) },
  { id: 'all', icon: '🗂', label: 'Butun davr', body: () => ({ period: 'all' }) },
];

export default function ExportSheet() {
  const { bot, showToast } = useApp();
  const [busy, setBusy] = useState(null);

  const run = async (opt, close) => {
    setBusy(opt.id);
    try {
      const res = await api.exportExcel(opt.body());
      haptic.success();
      showToast(`📥 Excel fayl botga yuborildi (${res.count} ta amal)`);
      close();
    } catch (e) {
      haptic.error();
      showToast(e.message, 'error');
      setBusy(null);
    }
  };

  return (
    <Sheet title="📥 Excel hisobot" subtitle="Fayl Telegram bot chatiga yuboriladi. Har bir yo'nalish alohida varaqda bo'ladi.">
      {({ close }) => (
        <>
          {(!bot.enabled || !isTelegram()) && (
            <div className="notice">
              ℹ️ Excel fayl faqat ilova Telegram bot orqali ochilganda yuboriladi.
            </div>
          )}
          <div className="menu">
            {OPTIONS.map((opt) => (
              <button key={opt.id} className="menu-item" disabled={Boolean(busy)} onClick={() => run(opt, close)}>
                <span className="menu-icon">{opt.icon}</span>
                <span className="grow">{opt.label}</span>
                <span className="muted small">{busy === opt.id ? 'Tayyorlanmoqda...' : '.xlsx'}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
