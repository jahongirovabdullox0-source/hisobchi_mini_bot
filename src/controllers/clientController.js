const config = require('../config/default');
const { isBotEnabled, hasWebApp } = require('../core/bot');
const User = require('../models/User');
const Sector = require('../models/Sector');
const Transaction = require('../models/Transaction');
const Debt = require('../models/Debt');
const Budget = require('../models/Budget');
const Rate = require('../models/Rate');
const report = require('../services/report.service');
const txService = require('../services/transaction.service');
const notify = require('../services/notify.service');
const { buildUserReport } = require('../services/export.service');
const { getRange, dayToDate, parseDay } = require('../utils/period');
const { localParts, toNumber } = require('../utils/format');
const {
  asyncHandler,
  serialize,
  badRequest,
  notFound,
  parseAmount,
  parseId,
  optionalString,
} = require('../utils/http');

const rangeFromQuery = (q) => getRange(q.period || 'month', q.from, q.to);
const optionalId = (v, field) => (v === undefined || v === null || v === '' ? undefined : parseId(v, field));

/* ============================ PROFIL ============================ */

/** Ilova ochilganda kerak bo'ladigan hamma narsa bitta so'rovda */
const bootstrap = asyncHandler(async (req, res) => {
  const [sectors, rates, txCount] = await Promise.all([
    Sector.listWithCategories(),
    Rate.list(),
    Transaction.sumByType({ userId: req.user.id }),
  ]);
  const count = txCount.reduce((a, g) => a + g._count._all, 0);
  res.json(
    serialize({
      user: { ...req.user, transactionsCount: count },
      sectors,
      rates,
      currencies: config.app.currencies,
      bot: { enabled: isBotEnabled(), webApp: hasWebApp() },
    })
  );
});

const updateMe = asyncHandler(async (req, res) => {
  const data = {};
  for (const key of ['onboarded', 'dailyReport', 'notifyOnSave']) {
    if (typeof req.body[key] === 'boolean') data[key] = req.body[key];
  }
  if (req.body.phone !== undefined) data.phone = optionalString(req.body.phone, 20);
  if (!Object.keys(data).length) throw badRequest("O'zgartirish uchun ma'lumot yo'q");
  const user = await User.update(req.user.id, data);
  res.json(serialize({ user }));
});

/* ============================ HISOBOTLAR ============================ */

const summary = asyncHandler(async (req, res) => {
  const data = await report.getSummary(req.user.id, rangeFromQuery(req.query));
  res.json(serialize(data));
});

const stats = asyncHandler(async (req, res) => {
  const sectorId = optionalId(req.query.sectorId, "Yo'nalish");
  const data = await report.getStats(req.user.id, rangeFromQuery(req.query), { sectorId });
  res.json(serialize(data));
});

const sectorDetail = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, "Yo'nalish");
  const sector = await Sector.findById(id);
  if (!sector) throw notFound("Yo'nalish topilmadi");
  const data = await report.getSectorDetail(req.user.id, sector, rangeFromQuery(req.query));
  res.json(serialize(data));
});

/** Excel hisobotni bot orqali foydalanuvchiga yuboradi */
const exportExcel = asyncHandler(async (req, res) => {
  if (!isBotEnabled()) throw badRequest("Bot ulanmagan — Excel faylni yuborib bo'lmaydi");
  if (!notify.isRealChat(req.user.telegramId)) {
    throw badRequest("Excel fayl faqat Telegram orqali kirganda botga yuboriladi");
  }
  const range = getRange(req.body.period || 'month', req.body.from, req.body.to);
  const { buffer, filename, count } = await buildUserReport(req.user, range);
  await notify.sendDocument(
    req.user.telegramId,
    buffer,
    filename,
    `📥 <b>Excel hisobot</b>\n🗓 ${range.label}\n🧾 ${count} ta amal`
  );
  res.json({ ok: true, count });
});

/* ============================ AMALLAR ============================ */

const listTransactions = asyncHandler(async (req, res) => {
  const q = req.query;
  const range = q.period ? rangeFromQuery(q) : null;
  const where = Transaction.buildFilter({
    userId: req.user.id,
    type: q.type,
    sectorId: optionalId(q.sectorId, "Yo'nalish"),
    categoryId: optionalId(q.categoryId, 'Kategoriya'),
    q: optionalString(q.q, 100),
    range,
  });
  const page = Math.max(1, Number(q.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(q.pageSize) || 30));
  const [result, sums] = await Promise.all([
    Transaction.paginate(where, { page, pageSize }),
    Transaction.sumByType(where),
  ]);
  res.json(serialize({ ...result, totals: report.totalsFromGroups(sums) }));
});

const getTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findForUser(parseId(req.params.id), req.user.id);
  if (!tx) throw notFound('Amal topilmadi');
  res.json(serialize(tx));
});

const createTransaction = asyncHandler(async (req, res) => {
  const tx = await txService.createTransaction(req.user.id, req.body);
  notify.notifyTransaction(req.user, tx, 'created').catch(() => {});
  res.status(201).json(serialize(tx));
});

const updateTransaction = asyncHandler(async (req, res) => {
  const tx = await txService.updateTransaction(req.user.id, parseId(req.params.id), req.body);
  res.json(serialize(tx));
});

const deleteTransaction = asyncHandler(async (req, res) => {
  await txService.deleteTransaction(req.user.id, parseId(req.params.id));
  res.json({ ok: true });
});

/* ============================ QARZLAR ============================ */

function debtData(body, existing) {
  const data = {};
  if (!existing || body.direction !== undefined) {
    if (!['I_OWE', 'OWED_TO_ME'].includes(body.direction)) throw badRequest("Qarz turi noto'g'ri");
    data.direction = body.direction;
  }
  if (!existing || body.person !== undefined) {
    const person = optionalString(body.person, 100);
    if (!person) throw badRequest('Kim bilan ekanini yozing');
    data.person = person;
  }
  if (!existing || body.amount !== undefined) {
    data.amount = parseAmount(body.amount);
    if (existing && data.amount < toNumber(existing.paidAmount)) {
      throw badRequest("Qarz summasi to'langan summadan kam bo'lishi mumkin emas");
    }
  }
  if (body.currency !== undefined || !existing) {
    const currency = String(body.currency || 'UZS').toUpperCase();
    if (!config.app.currencies.includes(currency)) throw badRequest("Valyuta noto'g'ri");
    data.currency = currency;
  }
  if (body.phone !== undefined) data.phone = optionalString(body.phone, 20);
  if (body.note !== undefined) data.note = optionalString(body.note, 500);
  if (body.dueDate !== undefined) {
    if (!body.dueDate) data.dueDate = null;
    else if (parseDay(body.dueDate)) data.dueDate = dayToDate(body.dueDate);
    else throw badRequest("Qaytarish sanasi noto'g'ri");
  }
  if (typeof body.isClosed === 'boolean') data.isClosed = body.isClosed;
  return data;
}

const listDebts = asyncHandler(async (req, res) => {
  const [items, summaryData] = await Promise.all([
    Debt.listForUser(req.user.id, { status: req.query.status || 'all', direction: req.query.direction }),
    report.getDebtSummary(req.user.id),
  ]);
  res.json(serialize({ items, summary: summaryData }));
});

const createDebt = asyncHandler(async (req, res) => {
  const debt = await Debt.create({ ...debtData(req.body), userId: req.user.id });
  res.status(201).json(serialize(debt));
});

const updateDebt = asyncHandler(async (req, res) => {
  const existing = await Debt.findForUser(parseId(req.params.id), req.user.id);
  if (!existing) throw notFound('Qarz topilmadi');
  const debt = await Debt.update(existing.id, debtData(req.body, existing));
  res.json(serialize(debt));
});

/** Qisman yoki to'liq to'lov */
const payDebt = asyncHandler(async (req, res) => {
  const existing = await Debt.findForUser(parseId(req.params.id), req.user.id);
  if (!existing) throw notFound('Qarz topilmadi');
  if (existing.isClosed) throw badRequest('Bu qarz allaqachon yopilgan');
  const total = toNumber(existing.amount);
  const left = total - toNumber(existing.paidAmount);
  const amount = req.body.full ? left : parseAmount(req.body.amount, "To'lov summasi");
  if (amount > left + 0.001) throw badRequest("To'lov qoldiqdan ko'p bo'lishi mumkin emas");
  const paidAmount = Math.round((toNumber(existing.paidAmount) + amount) * 100) / 100;
  const debt = await Debt.update(existing.id, { paidAmount, isClosed: paidAmount >= total - 0.001 });
  res.json(serialize(debt));
});

const deleteDebt = asyncHandler(async (req, res) => {
  const existing = await Debt.findForUser(parseId(req.params.id), req.user.id);
  if (!existing) throw notFound('Qarz topilmadi');
  await Debt.delete(existing.id);
  res.json({ ok: true });
});

/* ============================ REJA (BYUDJET) ============================ */

function monthFromQuery(q) {
  const now = localParts(new Date());
  const year = Number(q.year) || now.year;
  const month = Number(q.month) || now.month + 1;
  if (year < 2000 || year > 2100 || month < 1 || month > 12) throw badRequest("Oy noto'g'ri");
  return { year, month };
}

const getBudgets = asyncHandler(async (req, res) => {
  const { year, month } = monthFromQuery(req.query);
  res.json(serialize(await report.getBudgetStatus(req.user.id, year, month)));
});

const saveBudgets = asyncHandler(async (req, res) => {
  const { year, month } = monthFromQuery(req.body);
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  for (const item of items) {
    const sectorId = parseId(item.sectorId, "Yo'nalish");
    const planIncome = Math.max(0, Number(item.planIncome) || 0);
    const planExpense = Math.max(0, Number(item.planExpense) || 0);
    await Budget.upsert(req.user.id, sectorId, year, month, planIncome, planExpense);
  }
  res.json(serialize(await report.getBudgetStatus(req.user.id, year, month)));
});

const copyBudgets = asyncHandler(async (req, res) => {
  const { year, month } = monthFromQuery(req.body);
  const copied = await Budget.copyFromPrevious(req.user.id, year, month);
  if (!copied) throw badRequest("O'tgan oy uchun reja topilmadi");
  res.json(serialize(await report.getBudgetStatus(req.user.id, year, month)));
});

/* ============================ KURSLAR ============================ */

const listRates = asyncHandler(async (req, res) => {
  res.json(serialize(await Rate.list()));
});

module.exports = {
  bootstrap,
  updateMe,
  summary,
  stats,
  sectorDetail,
  exportExcel,
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  listDebts,
  createDebt,
  updateDebt,
  payDebt,
  deleteDebt,
  getBudgets,
  saveBudgets,
  copyBudgets,
  listRates,
};
