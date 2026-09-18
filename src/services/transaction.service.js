const config = require('../config/default');
const Transaction = require('../models/Transaction');
const Sector = require('../models/Sector');
const Category = require('../models/Category');
const Rate = require('../models/Rate');
const { badRequest, notFound, parseAmount, parseId, optionalString } = require('../utils/http');
const { dayToDate, parseDay } = require('../utils/period');
const { isoDay } = require('../utils/format');

const round2 = (n) => Math.round(n * 100) / 100;
const TYPES = ['INCOME', 'EXPENSE'];

function resolveDate(input) {
  if (input.date) {
    if (!parseDay(input.date)) throw badRequest("Sana noto'g'ri");
    // Bugungi sana tanlansa — hozirgi vaqt, aks holda o'sha kunning o'rtasi
    if (input.date === isoDay(new Date())) return new Date();
    return dayToDate(input.date);
  }
  if (input.occurredAt) {
    const d = new Date(input.occurredAt);
    if (Number.isNaN(d.getTime())) throw badRequest("Sana noto'g'ri");
    return d;
  }
  return null;
}

/**
 * Mini App / bot / admin'dan kelgan ma'lumotni tekshirib, bazaga yoziladigan ko'rinishga keltiradi.
 * existing — tahrirlashda eski yozuv (berilmagan maydonlar saqlanib qoladi)
 */
async function buildData(input, existing = null) {
  const type = input.type ?? existing?.type;
  if (!TYPES.includes(type)) throw badRequest("Amal turi noto'g'ri (daromad yoki harajat)");

  const sectorId = parseId(input.sectorId ?? existing?.sectorId, "Yo'nalish");
  const sector = await Sector.findById(sectorId);
  if (!sector) throw badRequest("Yo'nalish topilmadi");

  let categoryId = input.categoryId !== undefined ? input.categoryId : existing?.categoryId ?? null;
  if (categoryId !== null && categoryId !== '' && categoryId !== 0) {
    categoryId = parseId(categoryId, 'Kategoriya');
    const category = await Category.findById(categoryId);
    if (!category) throw badRequest('Kategoriya topilmadi');
    if (category.sectorId !== sectorId) throw badRequest("Kategoriya tanlangan yo'nalishga tegishli emas");
    if (category.type !== type) throw badRequest('Kategoriya amal turiga mos emas');
  } else {
    categoryId = null;
  }

  const currency = String(input.currency ?? existing?.currency ?? 'UZS').toUpperCase();
  if (!config.app.currencies.includes(currency)) throw badRequest("Valyuta noto'g'ri");

  const rawAmount = parseAmount(input.amount ?? existing?.rawAmount);

  let rate;
  if (currency === 'UZS') rate = 1;
  else if (input.rate) rate = parseAmount(input.rate, 'Kurs');
  else if (existing && existing.currency === currency) rate = Number(existing.rate);
  else rate = await Rate.getRate(currency);

  let quantity = input.quantity !== undefined ? input.quantity : existing?.quantity ?? null;
  if (quantity === '' || quantity === null || quantity === 0 || quantity === '0') quantity = null;
  else quantity = parseAmount(quantity, 'Miqdor');

  const unit = input.unit !== undefined ? optionalString(input.unit, 20) : existing?.unit ?? null;
  const note = input.note !== undefined ? optionalString(input.note, 500) : existing?.note ?? null;

  const occurredAt = resolveDate(input) || existing?.occurredAt || new Date();
  const maxFuture = Date.now() + 366 * 86_400_000;
  if (occurredAt.getTime() > maxFuture) throw badRequest('Sana juda uzoq kelajakda');

  return {
    type,
    sectorId,
    categoryId,
    currency,
    rawAmount,
    rate,
    amount: round2(rawAmount * rate),
    quantity,
    unit: quantity ? unit : null,
    note,
    occurredAt,
  };
}

async function createTransaction(userId, input) {
  const data = await buildData(input);
  return Transaction.create({ ...data, userId });
}

async function updateTransaction(userId, id, input) {
  const existing = await Transaction.findForUser(id, userId);
  if (!existing) throw notFound('Amal topilmadi');
  const data = await buildData(input, existing);
  return Transaction.update(id, data);
}

async function deleteTransaction(userId, id) {
  const existing = await Transaction.findForUser(id, userId);
  if (!existing) throw notFound('Amal topilmadi');
  await Transaction.delete(id);
  return existing;
}

module.exports = { buildData, createTransaction, updateTransaction, deleteTransaction };
