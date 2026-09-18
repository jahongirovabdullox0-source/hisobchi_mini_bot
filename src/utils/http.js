const { Prisma } = require('@prisma/client');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (msg) => new HttpError(400, msg);
const notFound = (msg = 'Topilmadi') => new HttpError(404, msg);
const forbidden = (msg = "Ruxsat yo'q") => new HttpError(403, msg);

/** async controllerlardagi xatolarni express'ga uzatadi */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function isDecimal(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    (Prisma.Decimal.isDecimal(value) || (typeof value.toNumber === 'function' && 'd' in value && 'e' in value))
  );
}

/** Prisma natijasini JSON uchun tozalaydi (Decimal -> number, BigInt -> string) */
function serialize(value) {
  if (value === null || value === undefined) return value;
  if (isDecimal(value)) return value.toNumber();
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v);
    return out;
  }
  return value;
}

/** Summani tekshiradi va number qaytaradi */
function parseAmount(value, field = 'Summa') {
  if (value === null || value === undefined || value === '') throw badRequest(`${field} kiritilmagan`);
  const n = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) throw badRequest(`${field} noto'g'ri`);
  if (n > 1e15) throw badRequest(`${field} juda katta`);
  return Math.round(n * 100) / 100;
}

function parseId(value, field = 'ID') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw badRequest(`${field} noto'g'ri`);
  return n;
}

function optionalString(value, max = 500) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s.slice(0, max) : null;
}

module.exports = {
  HttpError,
  badRequest,
  notFound,
  forbidden,
  asyncHandler,
  serialize,
  parseAmount,
  parseId,
  optionalString,
};
