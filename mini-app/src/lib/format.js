export const MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];
export const MONTHS_TITLE = MONTHS.map((m) => m[0].toUpperCase() + m.slice(1));
export const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

export const CURRENCY_SUFFIX = { UZS: "so'm", USD: '$', EUR: '€', RUB: '₽', KZT: '₸' };

export const PALETTE = ['#16A34A', '#2563EB', '#D97706', '#7C3AED', '#DB2777', '#0891B2', '#65A30D', '#EA580C', '#4F46E5', '#64748B'];

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const NBSP = ' '; // raqam qator oxirida bo'linib ketmasligi uchun

export const groupDigits = (s) => String(s).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

/** 1500000 -> "1 500 000 so'm" */
export function money(value, currency = 'UZS', { sign = false, suffix = true } = {}) {
  const n = num(value);
  const abs = Math.abs(n);
  const withFraction = currency !== 'UZS' && Math.round(abs * 100) % 100 !== 0;
  const [int, frac] = (withFraction ? abs.toFixed(2) : String(Math.round(abs))).split('.');
  let prefix = '';
  if (n < 0) prefix = '−';
  else if (sign && n > 0) prefix = '+';
  const body = `${prefix}${groupDigits(int)}${frac ? `,${frac}` : ''}`;
  return suffix ? `${body}${NBSP}${CURRENCY_SUFFIX[currency] || currency}` : body;
}

/** Valyuta kursi: 11839.59 -> "11 839,59 so'm" (tiyingacha aniq) */
export function rateText(value) {
  const [int, frac] = num(value).toFixed(2).split('.');
  return `${groupDigits(int)}${frac !== '00' ? `,${frac}` : ''}${NBSP}so'm`;
}

/** 1 250 000 -> "1,3 mln" */
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

export function pctText(v) {
  if (v === null || v === undefined) return '';
  return `${v > 0 ? '▲' : v < 0 ? '▼' : ''} ${Math.abs(v)}%`;
}

/** Summa kiritish maydoni: "1500000" -> "1 500 000" */
export function formatAmountInput(raw) {
  let s = String(raw || '').replace(/[^\d.,]/g, '').replace(/\./g, ',');
  const parts = s.split(',');
  const int = parts[0].replace(/^0+(?=\d)/, '');
  const frac = parts.length > 1 ? parts.slice(1).join('').slice(0, 2) : null;
  s = groupDigits(int);
  return frac !== null ? `${s},${frac}` : s;
}

export function parseAmountInput(str) {
  const n = Number(String(str || '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

const pad = (n) => String(n).padStart(2, '0');

export const toIsoDay = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
export const todayIso = () => toIsoDay(new Date());
export const yesterdayIso = () => toIsoDay(new Date(Date.now() - 86_400_000));

export function formatDate(value, { year = true, time = false, weekday = false } = {}) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  let s = `${d.getDate()}-${MONTHS[d.getMonth()]}`;
  if (year && d.getFullYear() !== new Date().getFullYear()) s += `, ${d.getFullYear()}`;
  if (weekday) s += `, ${WEEKDAYS[d.getDay()]}`;
  if (time) s += ` · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return s;
}

export function formatTime(value) {
  const d = new Date(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Bugun", "Kecha" yoki "16-sentabr, chorshanba" */
export function dayLabel(value) {
  const iso = toIsoDay(value);
  if (iso === todayIso()) return 'Bugun';
  if (iso === yesterdayIso()) return 'Kecha';
  return formatDate(value, { weekday: true });
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Xayrli tun';
  if (h < 12) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

/** Rangni shaffof fon uchun: #16A34A -> rgba(...) */
export function tint(hex, alpha = 0.12) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return `rgba(100,116,139,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** O'tgan oy chegaralari (custom davr uchun) */
export function previousMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: toIsoDay(first), to: toIsoDay(last) };
}
