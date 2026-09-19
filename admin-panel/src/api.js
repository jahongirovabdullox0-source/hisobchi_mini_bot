// Vercel'da backend boshqa domenda (Render) turadi — manzili VITE_API_URL orqali beriladi.
// Kompyuterda bo'sh: so'rovlar Vite proxy orqali localhost:5000 ga boradi.
const API_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const BASE = `${API_URL}/api/admin`;
const TOKEN_KEY = 'hisobchi_admin_token';

let unauthorizedHandler = () => {};
export const onUnauthorized = (fn) => {
  unauthorizedHandler = fn;
};

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* brauzer xotirasi yopiq */
  }
}

function buildUrl(path, params) {
  let url = BASE + path;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    });
    const s = qs.toString();
    if (s) url += `?${s}`;
  }
  return url;
}

async function request(method, path, { params, body, raw = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      API_URL
        ? "Server bilan aloqa yo'q. Render'dagi backend ishlayotganini tekshiring (bepul tarifda uyg'onishi 1 daqiqagacha olishi mumkin)."
        : "Server bilan aloqa yo'q. Backend ishga tushganini tekshiring (npm run dev)."
    );
  }

  if (res.status === 401 && path !== '/login') {
    setToken('');
    unauthorizedHandler();
  }

  if (raw) {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Xatolik (${res.status})`);
    }
    return res;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Xatolik (${res.status})`);
  return data;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export const api = {
  login: (password) => request('POST', '/login', { body: { password } }),
  info: () => request('GET', '/info'),
  overview: () => request('GET', '/overview'),

  users: (params) => request('GET', '/users', { params }),
  user: (id, params) => request('GET', `/users/${id}`, { params }),
  updateUser: (id, body) => request('PATCH', `/users/${id}`, { body }),

  transactions: (params) => request('GET', '/transactions', { params }),
  deleteTx: (id) => request('DELETE', `/transactions/${id}`),
  async exportTx(params) {
    const res = await request('GET', '/transactions/export', { params, raw: true });
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = /filename="([^"]+)"/.exec(disposition);
    downloadBlob(await res.blob(), match ? match[1] : 'Hisobchi.xlsx');
  },

  sectors: () => request('GET', '/sectors'),
  createSector: (body) => request('POST', '/sectors', { body }),
  updateSector: (id, body) => request('PATCH', `/sectors/${id}`, { body }),
  deleteSector: (id) => request('DELETE', `/sectors/${id}`),
  createCategory: (body) => request('POST', '/categories', { body }),
  updateCategory: (id, body) => request('PATCH', `/categories/${id}`, { body }),
  deleteCategory: (id) => request('DELETE', `/categories/${id}`),

  rates: () => request('GET', '/rates'),
  updateRate: (code, body) => request('PATCH', `/rates/${code}`, { body }),
  syncRates: () => request('POST', '/rates/sync'),

  broadcast: (text) => request('POST', '/broadcast', { body: { text } }),
};
