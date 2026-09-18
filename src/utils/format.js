const MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];
const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

const CURRENCY_SUFFIX = { UZS: "so'm", USD: '$', EUR: '€', RUB: '₽', KZT: '₸' };

const TZ_OFFSET_MS = 5 * 60 * 60 * 1000; // Asia/Tashkent (UTC+5, yozgi vaqt yo'q)

/** Decimal / string / null -> number */
function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const NBSP = ' '; // raqam qator oxirida bo'linib ketmasligi uchun

function groupDigits(intStr) {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 1500000 -> "1 500 000 so'm" */
function money(value, currency = 'UZS') {
  const n = toNumber(value);
  const abs = Math.abs(n);
  const useFraction = currency !== 'UZS' && Math.round(abs * 100) % 100 !== 0;
  const fixed = useFraction ? abs.toFixed(2) : String(Math.round(abs));
  const [int, frac] = fixed.split('.');
  const suffix = CURRENCY_SUFFIX[currency] || currency;
  return `${n < 0 ? '−' : ''}${groupDigits(int)}${frac ? ',' + frac : ''}${NBSP}${suffix}`;
}

/** Ishorali summa: +1 500 000 so'm */
function signedMoney(value, currency = 'UZS') {
  const n = toNumber(value);
  return `${n > 0 ? '+' : ''}${money(n, currency)}`;
}

/** Toshkent vaqtidagi sana qismlari */
function localParts(date = new Date()) {
  const l = new Date(new Date(date).getTime() + TZ_OFFSET_MS);
  return {
    year: l.getUTCFullYear(),
    month: l.getUTCMonth(),
    day: l.getUTCDate(),
    weekday: l.getUTCDay(),
    hours: l.getUTCHours(),
    minutes: l.getUTCMinutes(),
  };
}

/** 18-sentabr, 2026 */
function formatDate(date, { withYear = true, withTime = false } = {}) {
  const p = localParts(date);
  let s = `${p.day}-${MONTHS[p.month]}`;
  if (withYear) s += `, ${p.year}`;
  if (withTime) s += ` ${String(p.hours).padStart(2, '0')}:${String(p.minutes).padStart(2, '0')}`;
  return s;
}

/** 2026-09-18 */
function isoDay(date) {
  const p = localParts(date);
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/** Oldingi davrga nisbatan o'zgarish (%) */
function change(current, previous) {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

/** HTML parse_mode uchun xavfsiz matn */
function escapeHtml(text = '') {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = {
  MONTHS,
  MONTHS_SHORT,
  WEEKDAYS,
  TZ_OFFSET_MS,
  toNumber,
  money,
  signedMoney,
  localParts,
  formatDate,
  isoDay,
  percent,
  change,
  escapeHtml,
};
