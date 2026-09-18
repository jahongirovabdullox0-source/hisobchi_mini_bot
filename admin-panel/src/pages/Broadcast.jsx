import { useState } from 'react';
import { api } from '../api';
import { useLoad } from '../hooks';
import { useToast } from '../components/ui';

export default function Broadcast() {
  const toast = useToast();
  const { data: info } = useLoad(() => api.info(), []);
  const { data: users } = useLoad(() => api.users({ page: 1, pageSize: 5 }), []);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const send = async () => {
    if (!text.trim()) return;
    if (!window.confirm(`Xabar ${users ? users.total : 'barcha'} ta foydalanuvchiga yuboriladi. Davom etasizmi?`)) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await api.broadcast(text.trim());
      setResult(res);
      toast(`Yuborildi: ${res.sent} ta`);
      setText('');
    } catch (e) {
      toast(e.message, 'error');
    }
    setBusy(false);
  };

  const botReady = info && info.bot.enabled;

  return (
    <div className="page narrow">
      <div className="page-head">
        <div>
          <h1>Xabar yuborish</h1>
          <div className="muted">Barcha foydalanuvchilarga bot orqali e'lon yoki eslatma yuboring</div>
        </div>
      </div>

      {info && !botReady && <div className="banner warn">⚠️ Bot ulanmagan — xabar yuborib bo'lmaydi.</div>}

      <div className="panel">
        <label className="field">
          <span>Xabar matni</span>
          <textarea
            className="input textarea"
            rows={8}
            maxLength={3500}
            placeholder="Masalan: Assalomu alaykum! Oy yakunlandi — Excel hisobotingizni /excel buyrug'i orqali oling 📥"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="between-row mt-12">
          <span className="muted small">
            {text.length}/3500 · Qabul qiluvchilar: <b>{users ? users.total : '…'}</b> ta
          </span>
          <button className="btn btn-primary" disabled={busy || !text.trim() || !botReady} onClick={send}>
            {busy ? 'Yuborilmoqda...' : '📢 Yuborish'}
          </button>
        </div>
      </div>

      {text.trim() && (
        <div className="panel">
          <div className="muted small mb-8">Ko'rinishi:</div>
          <div className="tg-preview">📢 {text}</div>
        </div>
      )}

      {result && (
        <div className="banner ok">
          ✅ Yuborildi: <b>{result.sent}</b> ta · Yetib bormadi: <b>{result.failed}</b> ta (botni bloklagan bo'lishi mumkin)
        </div>
      )}
    </div>
  );
}
