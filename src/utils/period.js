const { TZ_OFFSET_MS, localParts, MONTHS } = require('./format');

const PERIODS = ['today', 'week', 'month', 'year', 'all', 'custom'];

const PERIOD_LABELS = {
  today: 'Bugun',
  week: 'Shu hafta',
  month: 'Shu oy',
  year: 'Shu yil',
  all: 'Butun davr',
  custom: 'Tanlangan davr',
};

/** Toshkent vaqtidagi sana -> UTC Date */
function makeLocal(year, month, day = 1) {
  return new Date(Date.UTC(year, month, day) - TZ_OFFSET_MS);
}

/** "2026-09-18" -> {y, m, d} */
function parseDay(value) {
  if (!value || typeof value !== 'string') return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

/** "2026-09-18" -> shu kunning Toshkent vaqti bo'yicha soat 12:00 (UTC Date) */
function dayToDate(value) {
  const p = parseDay(value);
  if (!p) return null;
  return new Date(Date.UTC(p.y, p.m, p.d, 12) - TZ_OFFSET_MS);
}

/**
 * Davr chegaralarini hisoblaydi.
 * @returns {{period, label, start: Date|null, end: Date|null, prevStart: Date|null, prevEnd: Date|null, granularity}}
 */
function getRange(period = 'month', from, to) {
  if (!PERIODS.includes(period)) period = 'month';
  const now = localParts(new Date());
  const { year: y, month: m, day: d, weekday } = now;
  let start;
  let end;
  let prevStart;
  let prevEnd;
  let label = PERIOD_LABELS[period];

  switch (period) {
    case 'today':
      start = makeLocal(y, m, d);
      end = makeLocal(y, m, d + 1);
      prevStart = makeLocal(y, m, d - 1);
      prevEnd = start;
      break;
    case 'week': {
      const diff = (weekday + 6) % 7; // dushanba = 0
      start = makeLocal(y, m, d - diff);
      end = makeLocal(y, m, d - diff + 7);
      prevStart = makeLocal(y, m, d - diff - 7);
      prevEnd = start;
      break;
    }
    case 'month':
      start = makeLocal(y, m, 1);
      end = makeLocal(y, m + 1, 1);
      prevStart = makeLocal(y, m - 1, 1);
      prevEnd = start;
      label = `${MONTHS[m][0].toUpperCase()}${MONTHS[m].slice(1)} ${y}`;
      break;
    case 'year':
      start = makeLocal(y, 0, 1);
      end = makeLocal(y + 1, 0, 1);
      prevStart = makeLocal(y - 1, 0, 1);
      prevEnd = start;
      label = `${y}-yil`;
      break;
    case 'custom': {
      const f = parseDay(from);
      const t = parseDay(to) || f;
      if (!f) return getRange('month');
      start = makeLocal(f.y, f.m, f.d);
      end = makeLocal(t.y, t.m, t.d + 1);
      if (end <= start) {
        start = makeLocal(t.y, t.m, t.d);
        end = makeLocal(f.y, f.m, f.d + 1);
      }
      const len = end.getTime() - start.getTime();
      prevStart = new Date(start.getTime() - len);
      prevEnd = start;
      break;
    }
    case 'all':
    default:
      return {
        period: 'all',
        label: PERIOD_LABELS.all,
        start: null,
        end: null,
        prevStart: null,
        prevEnd: null,
        granularity: 'month',
      };
  }

  const days = (end.getTime() - start.getTime()) / 86_400_000;
  return {
    period,
    label,
    start,
    end,
    prevStart,
    prevEnd,
    granularity: days > 62 ? 'month' : 'day',
  };
}

/** Prisma "where" bo'lagi */
function rangeWhere(range, field = 'occurredAt') {
  if (!range || !range.start) return {};
  return { [field]: { gte: range.start, lt: range.end } };
}

function prevRangeWhere(range, field = 'occurredAt') {
  if (!range || !range.prevStart) return null;
  return { [field]: { gte: range.prevStart, lt: range.prevEnd } };
}

module.exports = { PERIODS, PERIOD_LABELS, getRange, rangeWhere, prevRangeWhere, parseDay, dayToDate, makeLocal };
