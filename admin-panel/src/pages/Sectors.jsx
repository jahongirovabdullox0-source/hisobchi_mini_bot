import { useState } from 'react';
import { api } from '../api';
import { useLoad } from '../hooks';
import { Badge, Empty, ErrorBox, Loading, Modal, Toggle, useToast } from '../components/ui';

const EMOJIS = ['🌳', '🐄', '💼', '✈️', '📦', '🌾', '🐑', '🐔', '🐝', '🐟', '🏠', '🚜', '🏪', '🚚', '💻', '🏗️', '🧵', '🍇', '🥛', '💰'];

function SectorModal({ sector, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: sector ? sector.name : '',
    icon: sector ? sector.icon : '📁',
    color: sector ? sector.color : '#2563EB',
    sortOrder: sector ? sector.sortOrder : 0,
    isActive: sector ? sector.isActive : true,
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...form, sortOrder: Number(form.sortOrder) || 0 };
      if (sector) await api.updateSector(sector.id, body);
      else await api.createSector(body);
      toast(sector ? "Yo'nalish yangilandi" : "Yo'nalish qo'shildi");
      onSaved();
      onClose();
    } catch (e) {
      toast(e.message, 'error');
      setBusy(false);
    }
  };

  return (
    <Modal
      title={sector ? "Yo'nalishni tahrirlash" : "Yangi yo'nalish"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-soft" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn btn-primary" disabled={busy || !form.name.trim()} onClick={save}>
            Saqlash
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field span-2">
          <span>Nomi</span>
          <input className="input" value={form.name} maxLength={60} onChange={(e) => set('name', e.target.value)} placeholder="Masalan: Asalarichilik" />
        </label>
        <label className="field">
          <span>Belgi (emoji)</span>
          <input className="input" value={form.icon} maxLength={16} onChange={(e) => set('icon', e.target.value)} />
        </label>
        <label className="field">
          <span>Rang</span>
          <div className="row gap-8">
            <input type="color" className="color-input" value={form.color} onChange={(e) => set('color', e.target.value.toUpperCase())} />
            <input className="input" value={form.color} maxLength={7} onChange={(e) => set('color', e.target.value)} />
          </div>
        </label>
        <div className="field span-2">
          <span>Tezkor tanlash</span>
          <div className="emoji-row">
            {EMOJIS.map((e) => (
              <button key={e} type="button" className={`emoji${form.icon === e ? ' active' : ''}`} onClick={() => set('icon', e)}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Tartib raqami</span>
          <input className="input" type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
        </label>
        <div className="field">
          <span>Faol</span>
          <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} />
        </div>
      </div>
    </Modal>
  );
}

function CategoryModal({ category, sectors, defaults, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    sectorId: category ? category.sectorId : defaults.sectorId,
    type: category ? category.type : defaults.type,
    name: category ? category.name : '',
    icon: category ? category.icon : '•',
    unit: category && category.unit ? category.unit : '',
    sortOrder: category ? category.sortOrder : 0,
    isActive: category ? category.isActive : true,
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...form, sectorId: Number(form.sectorId), sortOrder: Number(form.sortOrder) || 0, unit: form.unit || null };
      if (category) await api.updateCategory(category.id, body);
      else await api.createCategory(body);
      toast(category ? 'Kategoriya yangilandi' : "Kategoriya qo'shildi");
      onSaved();
      onClose();
    } catch (e) {
      toast(e.message, 'error');
      setBusy(false);
    }
  };

  return (
    <Modal
      title={category ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-soft" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn btn-primary" disabled={busy || !form.name.trim()} onClick={save}>
            Saqlash
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field">
          <span>Yo'nalish</span>
          <select className="input" value={form.sectorId} onChange={(e) => set('sectorId', e.target.value)}>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Turi</span>
          <select className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>
            <option value="INCOME">💰 Daromad</option>
            <option value="EXPENSE">💸 Harajat</option>
          </select>
        </label>
        <label className="field span-2">
          <span>Nomi</span>
          <input className="input" value={form.name} maxLength={60} onChange={(e) => set('name', e.target.value)} placeholder="Masalan: Asal sotuvi" />
        </label>
        <label className="field">
          <span>Belgi (emoji)</span>
          <input className="input" value={form.icon} maxLength={16} onChange={(e) => set('icon', e.target.value)} />
        </label>
        <label className="field">
          <span>O'lchov birligi (ixtiyoriy)</span>
          <input className="input" value={form.unit} maxLength={20} onChange={(e) => set('unit', e.target.value)} placeholder="kg, litr, dona, bosh..." />
        </label>
        <label className="field">
          <span>Tartib raqami</span>
          <input className="input" type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
        </label>
        <div className="field">
          <span>Faol</span>
          <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} />
        </div>
      </div>
    </Modal>
  );
}

function CategoryTable({ title, tone, items, onEdit, onDelete, onToggle, onAdd }) {
  return (
    <div className="cat-col">
      <div className="cat-col-head">
        <span className={`bold ${tone}`}>{title}</span>
        <button className="btn btn-soft btn-sm" onClick={onAdd}>
          + Qo'shish
        </button>
      </div>
      {items.length ? (
        <table className="table compact">
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className={c.isActive ? '' : 'inactive'}>
                <td className="w-emoji">{c.icon}</td>
                <td>
                  {c.name}
                  {c.unit && <span className="muted tiny"> · {c.unit}</span>}
                </td>
                <td className="num muted tiny nowrap">{c._count.transactions} ta</td>
                <td className="w-toggle">
                  <Toggle checked={c.isActive} onChange={(v) => onToggle(c, v)} />
                </td>
                <td className="num nowrap">
                  <button className="icon-btn" onClick={() => onEdit(c)} title="Tahrirlash">
                    ✏️
                  </button>
                  <button className="icon-btn danger" onClick={() => onDelete(c)} title="O'chirish">
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="muted small pad">Kategoriya yo'q</div>
      )}
    </div>
  );
}

export default function Sectors() {
  const toast = useToast();
  const { data, loading, error, reload } = useLoad(() => api.sectors(), []);
  const [sectorModal, setSectorModal] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);

  const act = async (fn, message) => {
    try {
      const res = await fn();
      toast(res && res.deactivated ? `Amallar mavjud (${res.used} ta) — o'chirish o'rniga nofaol qilindi` : message);
      reload(true);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const sectors = data || [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Yo'nalishlar va kategoriyalar</h1>
          <div className="muted">Bog'dorchilik, chorvachilik, tadbirkorlik... va ularning daromad/harajat turlari</div>
        </div>
        <button className="btn btn-primary" onClick={() => setSectorModal({})}>
          + Yo'nalish qo'shish
        </button>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {!data && loading && <Loading />}
      {data && !sectors.length && <Empty text="Yo'nalishlar yo'q. Seed skriptini ishga tushiring: npm run db:seed" />}

      {sectors.map((s) => (
        <div key={s.id} className={`panel sector-panel${s.isActive ? '' : ' inactive'}`} style={{ borderTopColor: s.color }}>
          <div className="sector-head">
            <span className="sector-icon" style={{ background: `${s.color}1f` }}>
              {s.icon}
            </span>
            <div className="grow">
              <div className="row gap-8">
                <h2>{s.name}</h2>
                {!s.isActive && <Badge>Nofaol</Badge>}
              </div>
              <div className="muted tiny">
                {s._count.transactions} ta amal · {s.categories.length} ta kategoriya · tartib: {s.sortOrder} · <code>{s.slug}</code>
              </div>
            </div>
            <Toggle checked={s.isActive} onChange={(v) => act(() => api.updateSector(s.id, { isActive: v }), v ? 'Faollashtirildi' : 'Nofaol qilindi')} />
            <button className="btn btn-soft btn-sm" onClick={() => setSectorModal({ sector: s })}>
              ✏️ Tahrirlash
            </button>
            <button
              className="btn btn-danger-soft btn-sm"
              onClick={() => {
                if (window.confirm(`«${s.name}» yo'nalishini o'chirasizmi?`)) act(() => api.deleteSector(s.id), "Yo'nalish o'chirildi");
              }}
            >
              🗑
            </button>
          </div>
          <div className="cat-cols">
            {[
              ['INCOME', '💰 Daromad kategoriyalari', 'green'],
              ['EXPENSE', '💸 Harajat kategoriyalari', 'red'],
            ].map(([type, title, tone]) => (
              <CategoryTable
                key={type}
                title={title}
                tone={tone}
                items={s.categories.filter((c) => c.type === type)}
                onAdd={() => setCategoryModal({ defaults: { sectorId: s.id, type } })}
                onEdit={(c) => setCategoryModal({ category: c, defaults: {} })}
                onToggle={(c, v) => act(() => api.updateCategory(c.id, { isActive: v }), v ? 'Faollashtirildi' : 'Nofaol qilindi')}
                onDelete={(c) => {
                  if (window.confirm(`«${c.name}» kategoriyasini o'chirasizmi?`)) act(() => api.deleteCategory(c.id), "Kategoriya o'chirildi");
                }}
              />
            ))}
          </div>
        </div>
      ))}

      {sectorModal && <SectorModal sector={sectorModal.sector} onClose={() => setSectorModal(null)} onSaved={() => reload(true)} />}
      {categoryModal && (
        <CategoryModal
          category={categoryModal.category}
          defaults={categoryModal.defaults}
          sectors={sectors}
          onClose={() => setCategoryModal(null)}
          onSaved={() => reload(true)}
        />
      )}
    </div>
  );
}
