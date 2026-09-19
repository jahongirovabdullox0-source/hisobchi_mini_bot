const config = require('../config/default');
const { prisma } = require('../database/connection');
const { bot, isBotEnabled, hasWebApp } = require('../core/bot');
const User = require('../models/User');
const Sector = require('../models/Sector');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Rate = require('../models/Rate');
const report = require('../services/report.service');
const notify = require('../services/notify.service');
const ratesService = require('../services/rates.service');
const { buildAdminReport } = require('../services/export.service');
const {
  adminToken,
  checkAdminPassword,
  isWeakAdminPassword,
  recordLoginFail,
  resetLoginFails,
} = require('../middlewares/auth.middleware');
const { getRange, rangeWhere } = require('../utils/period');
const { escapeHtml } = require('../utils/format');
const {
  HttpError,
  asyncHandler,
  serialize,
  badRequest,
  notFound,
  parseId,
  parseAmount,
  optionalString,
} = require('../utils/http');

const optionalId = (v, field) => (v === undefined || v === null || v === '' ? undefined : parseId(v, field));
const pageOf = (q, def = 20) => ({
  page: Math.max(1, Number(q.page) || 1),
  pageSize: Math.min(200, Math.max(5, Number(q.pageSize) || def)),
});

/* ============================ KIRISH ============================ */

const login = asyncHandler(async (req, res) => {
  if (config.admin.allowRemote && isWeakAdminPassword()) {
    throw new HttpError(
      403,
      "Xavfsizlik: Admin Panel internetga ochiq, lekin ADMIN_PASSWORD juda oddiy. Serverda kamida 10 belgili murakkab parol o'rnating."
    );
  }
  if (!checkAdminPassword(req.body && req.body.password)) {
    recordLoginFail(req.ip);
    await new Promise((r) => setTimeout(r, 400));
    throw new HttpError(401, "Parol noto'g'ri");
  }
  resetLoginFails(req.ip);
  res.json({ token: adminToken() });
});

const info = asyncHandler(async (req, res) => {
  res.json({
    bot: {
      enabled: isBotEnabled(),
      username: bot && bot.botInfo ? bot.botInfo.username : null,
      webAppUrl: config.bot.webAppUrl || null,
      webAppReady: hasWebApp(),
      dailyReportCron: config.bot.dailyReportCron,
    },
    currencies: config.app.currencies,
  });
});

/* ============================ DASHBOARD ============================ */

const overview = asyncHandler(async (req, res) => {
  const today = getRange('today');
  const month = getRange('month');
  const start30 = new Date(today.start.getTime() - 29 * 86_400_000);
  const range30 = { period: 'custom', start: start30, end: today.end, granularity: 'day' };
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [
    usersTotal,
    usersToday,
    usersActive,
    txTotal,
    txToday,
    allTime,
    monthGroups,
    sectors,
    rows,
    latest,
    newUsers,
    debtsOpen,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today.start } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: weekAgo } } }),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { createdAt: { gte: today.start } } }),
    Transaction.sumByType({}),
    Transaction.groupBySector(rangeWhere(month)),
    Sector.listAll(),
    Transaction.timeline({ occurredAt: { gte: range30.start, lt: range30.end } }),
    prisma.transaction.findMany({ include: Transaction.includeWithUser, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.debt.count({ where: { isClosed: false } }),
  ]);

  const monthTotals = report.totalsFromGroups(monthGroups);
  const sectorRows = sectors
    .map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      color: s.color,
      isActive: s.isActive,
      ...report.totalsFromGroups(monthGroups.filter((g) => g.sectorId === s.id)),
    }))
    .filter((s) => s.isActive || s.count > 0);

  res.json(
    serialize({
      users: { total: usersTotal, today: usersToday, active7d: usersActive },
      transactions: { total: txTotal, today: txToday },
      debtsOpen,
      allTime: report.totalsFromGroups(allTime),
      month: { label: month.label, ...monthTotals },
      sectors: sectorRows,
      series: report.buildSeries(rows, range30),
      latest,
      newUsers,
    })
  );
});

/* ============================ FOYDALANUVCHILAR ============================ */

const listUsers = asyncHandler(async (req, res) => {
  const { page, pageSize } = pageOf(req.query);
  const result = await User.list({ q: optionalString(req.query.q, 100), page, pageSize });
  const ids = result.items.map((u) => u.id);
  const groups = ids.length
    ? await prisma.transaction.groupBy({
        by: ['userId', 'type'],
        where: { userId: { in: ids } },
        _sum: { amount: true },
        _count: { _all: true },
      })
    : [];
  result.items = result.items.map((u) => ({
    ...u,
    totals: report.totalsFromGroups(groups.filter((g) => g.userId === u.id)),
  }));
  res.json(serialize(result));
});

const getUser = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { transactions: true, debts: true } } },
  });
  if (!user) throw notFound('Foydalanuvchi topilmadi');
  const range = getRange(req.query.period || 'all', req.query.from, req.query.to);
  const [summary, debts, recent] = await Promise.all([
    report.getSummary(id, range),
    report.getDebtSummary(id),
    prisma.transaction.findMany({
      where: { userId: id },
      include: Transaction.include,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: 25,
    }),
  ]);
  res.json(serialize({ user, summary, debts, recent }));
});

const updateUser = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const data = {};
  if (typeof req.body.isBlocked === 'boolean') data.isBlocked = req.body.isBlocked;
  if (!Object.keys(data).length) throw badRequest("O'zgartirish uchun ma'lumot yo'q");
  res.json(serialize(await User.update(id, data)));
});

/* ============================ AMALLAR ============================ */

function adminTxFilter(q) {
  const range = q.period ? getRange(q.period, q.from, q.to) : null;
  const search = optionalString(q.q, 100);
  const where = Transaction.buildFilter({
    userId: optionalId(q.userId, 'Foydalanuvchi'),
    type: q.type,
    sectorId: optionalId(q.sectorId, "Yo'nalish"),
    categoryId: optionalId(q.categoryId, 'Kategoriya'),
    q: search,
    range,
  });
  if (search) {
    where.OR.push(
      { user: { firstName: { contains: search, mode: 'insensitive' } } },
      { user: { lastName: { contains: search, mode: 'insensitive' } } },
      { user: { username: { contains: search, mode: 'insensitive' } } },
      { user: { phone: { contains: search } } }
    );
  }
  return { where, label: range ? range.label : 'Butun davr' };
}

const listTransactions = asyncHandler(async (req, res) => {
  const { where } = adminTxFilter(req.query);
  const { page, pageSize } = pageOf(req.query, 25);
  const [result, sums] = await Promise.all([
    Transaction.paginate(where, { page, pageSize, withUser: true }),
    Transaction.sumByType(where),
  ]);
  res.json(serialize({ ...result, totals: report.totalsFromGroups(sums) }));
});

const deleteTransaction = asyncHandler(async (req, res) => {
  await Transaction.delete(parseId(req.params.id));
  res.json({ ok: true });
});

const exportTransactions = asyncHandler(async (req, res) => {
  const { where, label } = adminTxFilter(req.query);
  const { buffer, filename } = await buildAdminReport(where, label);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

/* ============================ YO'NALISHLAR ============================ */

function slugify(name) {
  return (
    String(name)
      .toLowerCase()
      .replace(/[‘’ʻʼ`']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || `yonalish-${Date.now().toString(36)}`
  );
}

function sectorData(body, partial) {
  const data = {};
  if (!partial || body.name !== undefined) {
    const name = optionalString(body.name, 60);
    if (!name) throw badRequest("Yo'nalish nomini kiriting");
    data.name = name;
  }
  if (body.icon !== undefined) data.icon = optionalString(body.icon, 16) || '📁';
  if (body.color !== undefined) {
    if (!/^#[0-9a-f]{6}$/i.test(String(body.color))) throw badRequest("Rang formati noto'g'ri (masalan #16A34A)");
    data.color = body.color;
  }
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  return data;
}

const listSectors = asyncHandler(async (req, res) => {
  res.json(serialize(await Sector.listForAdmin()));
});

const createSector = asyncHandler(async (req, res) => {
  const data = sectorData(req.body, false);
  let slug = slugify(data.name);
  if (await prisma.sector.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
  const sector = await Sector.create({ ...data, slug });
  Category.clearCache();
  res.status(201).json(serialize(sector));
});

const updateSector = asyncHandler(async (req, res) => {
  const sector = await Sector.update(parseId(req.params.id), sectorData(req.body, true));
  Category.clearCache();
  res.json(serialize(sector));
});

const deleteSector = asyncHandler(async (req, res) => {
  const result = await Sector.remove(parseId(req.params.id));
  Category.clearCache();
  res.json(result);
});

/* ============================ KATEGORIYALAR ============================ */

function categoryData(body, partial) {
  const data = {};
  if (!partial || body.sectorId !== undefined) data.sectorId = parseId(body.sectorId, "Yo'nalish");
  if (!partial || body.name !== undefined) {
    const name = optionalString(body.name, 60);
    if (!name) throw badRequest('Kategoriya nomini kiriting');
    data.name = name;
  }
  if (!partial || body.type !== undefined) {
    if (!['INCOME', 'EXPENSE'].includes(body.type)) throw badRequest('Turini tanlang (daromad yoki harajat)');
    data.type = body.type;
  }
  if (body.icon !== undefined) data.icon = optionalString(body.icon, 16) || '•';
  if (body.unit !== undefined) data.unit = optionalString(body.unit, 20);
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  return data;
}

const createCategory = asyncHandler(async (req, res) => {
  const data = categoryData(req.body, false);
  if (!(await Sector.findById(data.sectorId))) throw badRequest("Yo'nalish topilmadi");
  res.status(201).json(serialize(await Category.create(data)));
});

const updateCategory = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const data = categoryData(req.body, true);
  if (data.type !== undefined) {
    const used = await prisma.transaction.count({ where: { categoryId: id, type: { not: data.type } } });
    if (used) throw badRequest("Bu kategoriyada amallar bor — turini o'zgartirib bo'lmaydi");
  }
  res.json(serialize(await Category.update(id, data)));
});

const deleteCategory = asyncHandler(async (req, res) => {
  res.json(await Category.remove(parseId(req.params.id)));
});

/* ============================ VALYUTA KURSLARI ============================ */

const listRates = asyncHandler(async (req, res) => {
  res.json(serialize(await Rate.list()));
});

const updateRate = asyncHandler(async (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  if (code === 'UZS') throw badRequest("So'm kursi har doim 1 ga teng");
  const existing = await Rate.findByCode(code);
  if (!existing) throw notFound('Valyuta topilmadi');
  const data = {};
  if (req.body.rate !== undefined) data.rate = parseAmount(req.body.rate, 'Kurs');
  if (req.body.name !== undefined) data.name = optionalString(req.body.name, 60) || existing.name;
  if (req.body.symbol !== undefined) data.symbol = optionalString(req.body.symbol, 8) || '';
  res.json(serialize(await Rate.update(code, data)));
});

const syncRates = asyncHandler(async (req, res) => {
  try {
    const updated = await ratesService.syncFromCbu();
    res.json(serialize({ updated, rates: await Rate.list() }));
  } catch (e) {
    throw badRequest(`Markaziy bankdan olib bo'lmadi: ${e.message}`);
  }
});

/* ============================ XABAR YUBORISH ============================ */

const broadcast = asyncHandler(async (req, res) => {
  const text = optionalString(req.body.text, 3500);
  if (!text) throw badRequest('Xabar matnini kiriting');
  if (!isBotEnabled()) throw badRequest('Bot ulanmagan (BOT_TOKEN yo\'q)');
  const result = await notify.broadcast(`📢 ${escapeHtml(text)}`);
  res.json(result);
});

module.exports = {
  login,
  info,
  overview,
  listUsers,
  getUser,
  updateUser,
  listTransactions,
  deleteTransaction,
  exportTransactions,
  listSectors,
  createSector,
  updateSector,
  deleteSector,
  createCategory,
  updateCategory,
  deleteCategory,
  listRates,
  updateRate,
  syncRates,
  broadcast,
};
