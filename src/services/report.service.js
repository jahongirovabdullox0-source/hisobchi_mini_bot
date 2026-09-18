const { prisma } = require('../database/connection');
const Sector = require('../models/Sector');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Debt = require('../models/Debt');
const Rate = require('../models/Rate');
const { toNumber, percent, change, money, localParts, MONTHS, MONTHS_SHORT } = require('../utils/format');
const { rangeWhere, prevRangeWhere, makeLocal } = require('../utils/period');

const round2 = (n) => Math.round(n * 100) / 100;
const WEEKDAYS_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

function totalsFromGroups(groups = []) {
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const g of groups) {
    const amount = toNumber(g._sum && g._sum.amount);
    if (g.type === 'INCOME') income += amount;
    else expense += amount;
    count += (g._count && g._count._all) || 0;
  }
  income = round2(income);
  expense = round2(expense);
  return { income, expense, net: round2(income - expense), count, margin: income ? percent(income - expense, income) : 0 };
}

function compare(totals, previous) {
  if (!previous) return null;
  return {
    income: change(totals.income, previous.income),
    expense: change(totals.expense, previous.expense),
    net: change(totals.net, previous.net),
  };
}

function sectorBreakdown(sectors, groups, totals) {
  return sectors
    .map((s) => {
      const t = totalsFromGroups(groups.filter((g) => g.sectorId === s.id));
      return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        icon: s.icon,
        color: s.color,
        isActive: s.isActive,
        ...t,
        incomeShare: percent(t.income, totals.income),
        expenseShare: percent(t.expense, totals.expense),
      };
    })
    .filter((s) => s.isActive || s.count > 0);
}

function rangeInfo(range) {
  return { period: range.period, label: range.label, start: range.start, end: range.end, granularity: range.granularity };
}

/* ------------------------------------------------------------------ */
/*  Bosh sahifa: umumiy balans + yo'nalishlar + so'nggi amallar        */
/* ------------------------------------------------------------------ */
async function getSummary(userId, range) {
  const where = { userId, ...rangeWhere(range) };
  const prevWhere = prevRangeWhere(range);

  const [sectors, groups, prevGroups, allTime, recent] = await Promise.all([
    Sector.listAll(),
    Transaction.groupBySector(where),
    prevWhere ? Transaction.sumByType({ userId, ...prevWhere }) : Promise.resolve(null),
    Transaction.sumByType({ userId }),
    Transaction.recent(userId, 6),
  ]);

  const totals = totalsFromGroups(groups);
  const previous = prevGroups ? totalsFromGroups(prevGroups) : null;

  return {
    range: rangeInfo(range),
    totals,
    previous,
    change: compare(totals, previous),
    allTime: totalsFromGroups(allTime),
    sectors: sectorBreakdown(sectors, groups, totals),
    recent,
  };
}

/* ------------------------------------------------------------------ */
/*  Grafik uchun vaqt qatori                                            */
/* ------------------------------------------------------------------ */
function buildSeries(rows, range) {
  const buckets = [];
  const index = new Map();
  const add = (key, label, title) => {
    index.set(key, buckets.length);
    buckets.push({ key, label, title, income: 0, expense: 0, net: 0 });
  };

  if (range.granularity === 'day' && range.start) {
    for (let t = range.start.getTime(); t < range.end.getTime(); t += 86_400_000) {
      const p = localParts(new Date(t));
      const label = range.period === 'week' ? WEEKDAYS_SHORT[p.weekday] : String(p.day);
      add(`${p.year}-${p.month}-${p.day}`, label, `${p.day}-${MONTHS[p.month]}`);
    }
    for (const r of rows) {
      const p = localParts(r.occurredAt);
      const i = index.get(`${p.year}-${p.month}-${p.day}`);
      if (i === undefined) continue;
      if (r.type === 'INCOME') buckets[i].income += toNumber(r.amount);
      else buckets[i].expense += toNumber(r.amount);
    }
  } else {
    let from;
    let to;
    const now = localParts(new Date());
    if (range.start) {
      from = localParts(range.start);
      to = localParts(new Date(range.end.getTime() - 1));
    } else if (rows.length) {
      from = localParts(rows[0].occurredAt);
      const last = localParts(rows[rows.length - 1].occurredAt);
      to = last.year * 12 + last.month > now.year * 12 + now.month ? last : now;
    } else {
      from = now;
      to = now;
    }
    let startIdx = from.year * 12 + from.month;
    const endIdx = to.year * 12 + to.month;
    if (endIdx - startIdx > 23) startIdx = endIdx - 23; // ko'pi bilan 24 oy
    const multiYear = Math.floor(startIdx / 12) !== Math.floor(endIdx / 12);
    for (let i = startIdx; i <= endIdx; i++) {
      const y = Math.floor(i / 12);
      const m = i % 12;
      const label = multiYear ? `${MONTHS_SHORT[m]}'${String(y).slice(2)}` : MONTHS_SHORT[m];
      add(`${y}-${m}`, label, `${MONTHS[m]} ${y}`);
    }
    for (const r of rows) {
      const p = localParts(r.occurredAt);
      const i = index.get(`${p.year}-${p.month}`);
      if (i === undefined) continue;
      if (r.type === 'INCOME') buckets[i].income += toNumber(r.amount);
      else buckets[i].expense += toNumber(r.amount);
    }
  }

  for (const b of buckets) {
    b.income = round2(b.income);
    b.expense = round2(b.expense);
    b.net = round2(b.income - b.expense);
  }
  return buckets;
}

function categoryBreakdown(groups, categories, sectors, totals) {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const secMap = new Map(sectors.map((s) => [s.id, s]));
  const out = { INCOME: [], EXPENSE: [] };
  for (const g of groups) {
    const c = g.categoryId ? catMap.get(g.categoryId) : null;
    const s = c ? secMap.get(c.sectorId) : null;
    out[g.type].push({
      id: g.categoryId,
      name: c ? c.name : 'Kategoriyasiz',
      icon: c ? c.icon : '•',
      sectorId: s ? s.id : null,
      sectorName: s ? s.name : null,
      sectorIcon: s ? s.icon : null,
      color: s ? s.color : '#94A3B8',
      amount: round2(toNumber(g._sum.amount)),
      count: g._count._all,
    });
  }
  for (const type of ['INCOME', 'EXPENSE']) {
    const total = type === 'INCOME' ? totals.income : totals.expense;
    out[type].sort((a, b) => b.amount - a.amount);
    out[type].forEach((x) => (x.share = percent(x.amount, total)));
  }
  return out;
}

function daysInRange(range) {
  if (!range.start) return null;
  const end = Math.min(Date.now(), range.end.getTime());
  const days = Math.ceil((end - range.start.getTime()) / 86_400_000);
  return Math.max(1, days);
}

/** Aqlli xulosalar (tavsiyalar) */
function buildInsights({ totals, previous, sectors, byCategory, range }) {
  const list = [];
  if (!totals.count) return list;

  const topExpense = byCategory.EXPENSE[0];
  if (topExpense && totals.expense > 0) {
    list.push({
      tone: 'neutral',
      icon: topExpense.icon,
      text: `Eng katta harajat — ${topExpense.name}${topExpense.sectorName ? ` (${topExpense.sectorName})` : ''}: jami harajatning ${topExpense.share}% i.`,
    });
  }

  const active = sectors.filter((s) => s.count > 0);
  const best = [...active].sort((a, b) => b.net - a.net)[0];
  if (best && best.net > 0) {
    list.push({ tone: 'good', icon: best.icon, text: `Eng foydali yo'nalish — ${best.name}: ${money(best.net)} sof foyda.` });
  }
  for (const s of active.filter((x) => x.net < 0 && x.income > 0)) {
    list.push({ tone: 'bad', icon: '⚠️', text: `${s.icon} ${s.name} bu davrda zararda: ${money(s.net)}. Harajatlarni qayta ko'rib chiqing.` });
  }
  for (const s of active.filter((x) => x.income === 0 && x.expense > 0)) {
    list.push({ tone: 'neutral', icon: s.icon, text: `${s.name} bo'yicha hozircha faqat harajat bor (${money(s.expense)}). Daromadlarni ham yozib boring.` });
  }

  if (totals.income > 0) {
    const tone = totals.margin >= 20 ? 'good' : totals.margin >= 0 ? 'neutral' : 'bad';
    list.push({ tone, icon: '📐', text: `Rentabellik: har 100 so'm daromaddan ${Math.max(0, Math.round(totals.margin))} so'mi sof foyda sifatida qolmoqda.` });
  }

  const foreign = sectors.find((s) => s.slug === 'chet-el');
  if (foreign && foreign.income > 0 && totals.income > 0) {
    list.push({ tone: 'neutral', icon: '✈️', text: `Daromadingizning ${percent(foreign.income, totals.income)}% i chet eldan kelgan pullar.` });
  }

  const days = daysInRange(range);
  if (days && days > 1 && totals.expense > 0) {
    list.push({ tone: 'neutral', icon: '📅', text: `O'rtacha kunlik harajat: ${money(totals.expense / days)}.` });
  }

  if (previous && previous.expense > 0) {
    const diff = change(totals.expense, previous.expense);
    if (diff !== null && Math.abs(diff) >= 10) {
      list.push({
        tone: diff > 0 ? 'bad' : 'good',
        icon: diff > 0 ? '📈' : '📉',
        text: `Harajatlar oldingi davrga nisbatan ${Math.abs(diff)}% ${diff > 0 ? 'oshgan' : 'kamaygan'}.`,
      });
    }
  }
  return list;
}

/* ------------------------------------------------------------------ */
/*  Hisobot sahifasi                                                    */
/* ------------------------------------------------------------------ */
async function getStats(userId, range, { sectorId } = {}) {
  const base = { userId, ...(sectorId ? { sectorId } : {}) };
  const where = { ...base, ...rangeWhere(range) };
  const prevWhere = prevRangeWhere(range);

  const [sectors, categories, sectorGroups, categoryGroups, rows, prevGroups] = await Promise.all([
    Sector.listAll(),
    Category.listAllLight(),
    Transaction.groupBySector(where),
    Transaction.groupByCategory(where),
    Transaction.timeline(where),
    prevWhere ? Transaction.sumByType({ ...base, ...prevWhere }) : Promise.resolve(null),
  ]);

  const totals = totalsFromGroups(sectorGroups);
  const previous = prevGroups ? totalsFromGroups(prevGroups) : null;
  const bySector = sectorBreakdown(sectors, sectorGroups, totals);
  const byCategory = categoryBreakdown(categoryGroups, categories, sectors, totals);

  return {
    range: rangeInfo(range),
    totals,
    previous,
    change: compare(totals, previous),
    sectors: bySector,
    categories: byCategory,
    series: buildSeries(rows, range),
    insights: buildInsights({ totals, previous, sectors: bySector, byCategory, range }),
  };
}

/* ------------------------------------------------------------------ */
/*  Bitta yo'nalish tafsiloti                                           */
/* ------------------------------------------------------------------ */
async function getSectorDetail(userId, sector, range) {
  const where = { userId, sectorId: sector.id, ...rangeWhere(range) };
  const prevWhere = prevRangeWhere(range);
  const [sectors, categories, categoryGroups, typeGroups, prevGroups, rows, recent] = await Promise.all([
    Sector.listAll(),
    Category.listAllLight(),
    Transaction.groupByCategory(where),
    Transaction.sumByType(where),
    prevWhere ? Transaction.sumByType({ userId, sectorId: sector.id, ...prevWhere }) : Promise.resolve(null),
    Transaction.timeline(where),
    prisma.transaction.findMany({
      where,
      include: Transaction.include,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: 30,
    }),
  ]);
  const totals = totalsFromGroups(typeGroups);
  const previous = prevGroups ? totalsFromGroups(prevGroups) : null;

  return {
    sector,
    range: rangeInfo(range),
    totals,
    previous,
    change: compare(totals, previous),
    categories: categoryBreakdown(categoryGroups, categories, sectors, totals),
    series: buildSeries(rows, range),
    recent,
  };
}

/* ------------------------------------------------------------------ */
/*  Oylik reja (byudjet) holati                                         */
/* ------------------------------------------------------------------ */
async function getBudgetStatus(userId, year, month) {
  const start = makeLocal(year, month - 1, 1);
  const end = makeLocal(year, month, 1);
  const [sectors, budgets, groups] = await Promise.all([
    Sector.listAll(),
    Budget.listForMonth(userId, year, month),
    Transaction.groupBySector({ userId, occurredAt: { gte: start, lt: end } }),
  ]);

  const items = sectors
    .filter((s) => s.isActive)
    .map((s) => {
      const b = budgets.find((x) => x.sectorId === s.id);
      const actual = totalsFromGroups(groups.filter((g) => g.sectorId === s.id));
      const planIncome = toNumber(b && b.planIncome);
      const planExpense = toNumber(b && b.planExpense);
      return {
        sectorId: s.id,
        name: s.name,
        icon: s.icon,
        color: s.color,
        planIncome,
        planExpense,
        actualIncome: actual.income,
        actualExpense: actual.expense,
        incomeProgress: planIncome ? percent(actual.income, planIncome) : null,
        expenseProgress: planExpense ? percent(actual.expense, planExpense) : null,
        overspent: planExpense > 0 && actual.expense > planExpense,
      };
    });

  const sum = (key) => round2(items.reduce((acc, x) => acc + x[key], 0));
  const totals = {
    planIncome: sum('planIncome'),
    planExpense: sum('planExpense'),
    actualIncome: sum('actualIncome'),
    actualExpense: sum('actualExpense'),
  };
  totals.incomeProgress = totals.planIncome ? percent(totals.actualIncome, totals.planIncome) : null;
  totals.expenseProgress = totals.planExpense ? percent(totals.actualExpense, totals.planExpense) : null;

  return { year, month, monthName: MONTHS[month - 1], hasPlan: budgets.length > 0, items, totals };
}

/** Harajat qo'shilganda oylik reja chegarasini tekshiradi (ogohlantirish matni yoki null) */
async function budgetWarning(userId, sectorId) {
  const now = localParts(new Date());
  const budget = await prisma.budget.findUnique({
    where: { userId_sectorId_year_month: { userId, sectorId, year: now.year, month: now.month + 1 } },
  });
  const plan = toNumber(budget && budget.planExpense);
  if (!plan) return null;
  const agg = await prisma.transaction.aggregate({
    where: {
      userId,
      sectorId,
      type: 'EXPENSE',
      occurredAt: { gte: makeLocal(now.year, now.month, 1), lt: makeLocal(now.year, now.month + 1, 1) },
    },
    _sum: { amount: true },
  });
  const spent = toNumber(agg._sum.amount);
  const pct = Math.round((spent / plan) * 100);
  if (spent > plan) return `⚠️ <b>Diqqat!</b> Shu oy harajat chegarasidan oshdingiz: ${money(spent)} / ${money(plan)} (${pct}%)`;
  if (pct >= 80) return `🟡 Oylik harajat chegarasining ${pct}% i ishlatildi: ${money(spent)} / ${money(plan)}`;
  return null;
}

/* ------------------------------------------------------------------ */
/*  Qarzlar xulosasi (so'mda)                                           */
/* ------------------------------------------------------------------ */
async function getDebtSummary(userId) {
  const [debts, rates] = await Promise.all([Debt.listOpen(userId), Rate.map()]);
  let owedToMe = 0;
  let iOwe = 0;
  let overdue = 0;
  const now = Date.now();
  for (const d of debts) {
    const left = (toNumber(d.amount) - toNumber(d.paidAmount)) * (rates[d.currency] || 1);
    if (d.direction === 'OWED_TO_ME') owedToMe += left;
    else iOwe += left;
    if (d.dueDate && new Date(d.dueDate).getTime() < now) overdue += 1;
  }
  return {
    owedToMe: round2(owedToMe),
    iOwe: round2(iOwe),
    balance: round2(owedToMe - iOwe),
    openCount: debts.length,
    overdue,
  };
}

module.exports = {
  totalsFromGroups,
  getSummary,
  getStats,
  getSectorDetail,
  getBudgetStatus,
  getDebtSummary,
  budgetWarning,
  buildSeries,
};
