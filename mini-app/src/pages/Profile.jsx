import Icon from '../components/Icon';
import { Switch } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import { CURRENCY_SUFFIX, compact, formatDate, initials, rateText } from '../lib/format';

function MenuItem({ icon, label, hint, onClick }) {
  return (
    <button className="menu-item" onClick={onClick}>
      <span className="menu-icon">{icon}</span>
      <span className="grow stack">
        <span>{label}</span>
        {hint && <span className="muted tiny">{hint}</span>}
      </span>
      <Icon name="right" size={18} className="muted" />
    </button>
  );
}

function ToggleItem({ icon, label, hint, checked, onChange }) {
  return (
    <div className="menu-item">
      <span className="menu-icon">{icon}</span>
      <span className="grow stack">
        <span>{label}</span>
        {hint && <span className="muted tiny">{hint}</span>}
      </span>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

export default function Profile() {
  const { user, updateUser, rates, openSheet, push, showToast, bot } = useApp();
  const { data } = useApi(() => api.summary({ period: 'all' }), []);
  const days = Math.max(1, Math.ceil((Date.now() - new Date(user.createdAt).getTime()) / 86_400_000));
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  const toggle = async (key, value) => {
    try {
      await updateUser({ [key]: value });
      haptic.success();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const replayOnboarding = async () => {
    try {
      localStorage.removeItem('hisobchi:onboarded');
    } catch {
      /* e'tiborsiz */
    }
    await updateUser({ onboarded: false }).catch(() => {});
  };

  return (
    <div className="page">
      <div className="profile-head">
        <span className="avatar xl">{user.photoUrl ? <img src={user.photoUrl} alt="" /> : initials(fullName)}</span>
        <div className="profile-name">{fullName}</div>
        <div className="muted small">
          {user.username ? `@${user.username}` : 'Telegram foydalanuvchisi'}
          {user.phone ? ` · ${user.phone}` : ''}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="muted tiny">Amallar</span>
          <b>{data ? data.totals.count : '…'}</b>
        </div>
        <div className="kpi">
          <span className="muted tiny">Biz bilan</span>
          <b>{days} kun</b>
        </div>
        <div className="kpi">
          <span className="muted tiny">Jami foyda</span>
          <b className={data && data.totals.net < 0 ? 'red' : 'green'}>{data ? compact(data.totals.net) : '…'}</b>
        </div>
      </div>

      <div className="menu-title">Hisobotlar</div>
      <div className="menu">
        <MenuItem icon="📜" label="Amallar tarixi" hint="Qidiruv va filtrlar bilan" onClick={() => push('history')} />
        <MenuItem icon="🎯" label="Oylik reja" hint="Daromad maqsadi va harajat chegarasi" onClick={() => openSheet('budget-form')} />
        <MenuItem icon="📥" label="Excel hisobot" hint="Botga .xlsx fayl yuboriladi" onClick={() => openSheet('export')} />
      </div>

      <div className="menu-title">Bildirishnomalar</div>
      <div className="menu">
        <ToggleItem
          icon="✅"
          label="Har bir amaldan so'ng xabar"
          hint="Bot yozilgan amalni tasdiqlaydi"
          checked={user.notifyOnSave}
          onChange={(v) => toggle('notifyOnSave', v)}
        />
        <ToggleItem
          icon="🌙"
          label="Kunlik hisobot"
          hint="Har kuni kechqurun natija va qarz eslatmalari"
          checked={user.dailyReport}
          onChange={(v) => toggle('dailyReport', v)}
        />
      </div>
      {!bot.enabled && <div className="notice">ℹ️ Bot hozircha ulanmagan — xabarlar yuborilmaydi.</div>}

      <div className="menu-title">Valyuta kurslari · Markaziy bank</div>
      <div className="card list">
        {rates
          .filter((r) => r.code !== 'UZS')
          .map((r) => (
            <div className="rate-row" key={r.code}>
              <span className="rate-code">{CURRENCY_SUFFIX[r.code] || r.code}</span>
              <span className="grow stack">
                <b>{r.code}</b>
                <span className="muted tiny">{r.name}</span>
              </span>
              <span className="right stack">
                <b>{rateText(r.rate)}</b>
                <span className="muted tiny">{formatDate(r.updatedAt)}</span>
              </span>
            </div>
          ))}
      </div>

      <div className="menu-title">Ilova</div>
      <div className="menu">
        <MenuItem icon="✨" label="Tanishuvni qayta ko'rish" onClick={replayOnboarding} />
        <MenuItem
          icon="⚡"
          label="Botda tezkor yozish"
          hint="-500000 yem · +2mln sut · +300$ o'tkazma"
          onClick={() => showToast("Botga shunchaki summa va izoh yozing: -500000 yem", 'info')}
        />
      </div>

      <div className="app-version muted tiny">Hisobchi v1.0 · Sizning shaxsiy buxgalteringiz 📒</div>
    </div>
  );
}
