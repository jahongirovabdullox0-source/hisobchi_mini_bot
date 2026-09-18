import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLoad } from '../hooks';
import { formatDate, rateText } from '../format';
import { ErrorBox, Loading, useToast } from '../components/ui';

export default function Rates() {
  const toast = useToast();
  const { data, loading, error, reload } = useLoad(() => api.rates(), []);
  const [values, setValues] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    if (data) setValues(Object.fromEntries(data.map((r) => [r.code, String(r.rate)])));
  }, [data]);

  const save = async (code) => {
    setSaving(code);
    try {
      await api.updateRate(code, { rate: Number(String(values[code]).replace(/\s/g, '').replace(',', '.')) });
      toast(`${code} kursi saqlandi`);
      reload(true);
    } catch (e) {
      toast(e.message, 'error');
    }
    setSaving(null);
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await api.syncRates();
      toast(`Markaziy bank kurslari olindi: ${res.updated.map((u) => u.code).join(', ') || "o'zgarish yo'q"}`);
      reload(true);
    } catch (e) {
      toast(e.message, 'error');
    }
    setSyncing(false);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Valyuta kurslari</h1>
          <div className="muted">
            Chet el valyutasidagi amallar shu kurs bo'yicha so'mga o'giriladi. Kurslar har kuni 09:05 da cbu.uz dan avtomatik yangilanadi.
          </div>
        </div>
        <button className="btn btn-primary" onClick={sync} disabled={syncing}>
          {syncing ? 'Yangilanmoqda...' : '🏦 Markaziy bankdan yangilash'}
        </button>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {!data && loading && <Loading />}

      {data && (
        <div className="panel no-pad">
          <table className="table">
            <thead>
              <tr>
                <th>Valyuta</th>
                <th>Nomi</th>
                <th>Joriy kurs</th>
                <th>Yangi kurs (1 birlik = so'm)</th>
                <th>Yangilangan</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.code}>
                  <td>
                    <b>{r.code}</b> <span className="muted">{r.symbol}</span>
                  </td>
                  <td>{r.name}</td>
                  <td className="bold">{r.code === 'UZS' ? '1' : rateText(r.rate)}</td>
                  <td>
                    {r.code === 'UZS' ? (
                      <span className="muted">Asosiy valyuta</span>
                    ) : (
                      <input
                        className="input input-sm"
                        inputMode="decimal"
                        value={values[r.code] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [r.code]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && save(r.code)}
                      />
                    )}
                  </td>
                  <td className="muted nowrap">{formatDate(r.updatedAt, { time: true })}</td>
                  <td className="num">
                    {r.code !== 'UZS' && (
                      <button
                        className="btn btn-soft btn-sm"
                        disabled={saving === r.code || String(r.rate) === String(values[r.code])}
                        onClick={() => save(r.code)}
                      >
                        Saqlash
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
