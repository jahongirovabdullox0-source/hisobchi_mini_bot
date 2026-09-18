export const MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

const SUFFIX = { UZS: "so'm", USD: '$', EUR: '€', RUB: '₽', KZT: '₸' };

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const NBSP = ' '; // raqam qator oxirida bo'linib ketmasligi uchun
const group = (s) => String(s).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

export function money(value, currency = 'UZS', { sign = false, suffix = true } = {}) {
  const n = num(value);
  const abs = Math.abs(n);
  const frac = currency !== 'UZS' && Math.round(abs * 100) % 100 !== 0;
  const [i, f] = (frac ? abs.toFixed(2) : String(Math.round(abs))).split('.');
  const prefix = n < 0 ? '−' : sign && n > 0 ? '+' : '';
  const body = `${prefix}${group(i)}${f ? `,${f}` : ''}`;
  return suffix ? `${body}${NBSP}${SUFFIX[currency] || currency}` : body;
}

/** Valyuta kursi: 11839.59 -> "11 839,59 so'm" */
export function rateText(value) {
  const [i, f] = num(value).toFixed(2).split('.');
  return `${group(i)}${f !== '00' ? `,${f}` : ''}${NBSP}so'm`;
}

export function compact(value) {
  const n = num(value);
  const abs = Math.abs(n);
  const s = n < 0 ? '−' : '';
  const fmt = (x) => (Math.round(x * 10) / 10).toString().replace('.', ',');
  if (abs >= 1e9) return `${s}${fmt(abs / 1e9)} mlrd`;
  if (abs >= 1e6) return `${s}${fmt(abs / 1e6)} mln`;
  if (abs >= 1e3) return `${s}${fmt(abs / 1e3)} ming`;
  return `${s}${Math.round(abs)}`;
}

const pad = (n) => String(n).padStart(2, '0');

export function formatDate(value, { time = false } = {}) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  let s = `${d.getDate()}-${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (time) s += `, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return s;
}

export function timeAgo(value) {
  if (!value) return '—';
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (diff < 60) return 'hozirgina';
  if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} kun oldin`;
  return formatDate(value);
}

export const fullName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : '—');

export const clock = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
