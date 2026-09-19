import { tg } from './telegram';

// Vercel'da backend boshqa domenda (Render) turadi — manzili VITE_API_URL orqali beriladi.
// Kompyuterda bo'sh: so'rovlar shu domenning o'ziga (Vite proxy yoki Express) boradi.
const API_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const BASE = `${API_URL}/api/client`;

async function request(method, path, { params, body } = {}) {
  let url = BASE + path;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    });
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const headers = API_URL ? {} : { 'ngrok-skip-browser-warning': '1' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (tg && tg.initData) headers['X-Telegram-Init-Data'] = tg.initData;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Server bilan aloqa yo'q. Internet yoki server ishlayotganini tekshiring.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Xatolik yuz berdi (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  bootstrap: () => request('GET', '/bootstrap'),
  updateMe: (body) => request('PATCH', '/me', { body }),

  summary: (params) => request('GET', '/summary', { params }),
  stats: (params) => request('GET', '/stats', { params }),
  sector: (id, params) => request('GET', `/sectors/${id}/summary`, { params }),
  exportExcel: (body) => request('POST', '/export', { body }),

  transactions: (params) => request('GET', '/transactions', { params }),
  transaction: (id) => request('GET', `/transactions/${id}`),
  createTx: (body) => request('POST', '/transactions', { body }),
  updateTx: (id, body) => request('PATCH', `/transactions/${id}`, { body }),
  deleteTx: (id) => request('DELETE', `/transactions/${id}`),

  debts: (params) => request('GET', '/debts', { params }),
  createDebt: (body) => request('POST', '/debts', { body }),
  updateDebt: (id, body) => request('PATCH', `/debts/${id}`, { body }),
  payDebt: (id, body) => request('POST', `/debts/${id}/pay`, { body }),
  deleteDebt: (id) => request('DELETE', `/debts/${id}`),

  budgets: (params) => request('GET', '/budgets', { params }),
  saveBudgets: (body) => request('PUT', '/budgets', { body }),
  copyBudgets: (body) => request('POST', '/budgets/copy', { body }),
};
