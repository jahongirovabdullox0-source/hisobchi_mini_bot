const { prisma } = require('../database/connection');
const Transaction = require('../models/Transaction');
const { buildWorkbook } = require('./excel.service');
const { rangeWhere } = require('../utils/period');
const { isoDay } = require('../utils/format');

/** Foydalanuvchining shaxsiy Excel hisoboti */
async function buildUserReport(user, range) {
  const where = { userId: user.id, ...rangeWhere(range) };
  const [transactions, debts] = await Promise.all([
    Transaction.forExport(where),
    prisma.debt.findMany({ where: { userId: user.id }, orderBy: [{ isClosed: 'asc' }, { createdAt: 'desc' }] }),
  ]);
  const buffer = await buildWorkbook({
    title: `Hisobchi — ${[user.firstName, user.lastName].filter(Boolean).join(' ')} moliyaviy hisoboti`,
    periodLabel: range.label,
    transactions,
    debts,
  });
  const filename = `Hisobot_${range.period}_${isoDay(new Date())}.xlsx`;
  return { buffer, filename, count: transactions.length };
}

/** Admin: barcha foydalanuvchilar bo'yicha */
async function buildAdminReport(where, periodLabel) {
  const transactions = await Transaction.forExport(where);
  const buffer = await buildWorkbook({
    title: 'Hisobchi — umumiy hisobot (barcha foydalanuvchilar)',
    periodLabel,
    transactions,
    withUser: true,
  });
  return { buffer, filename: `Hisobchi_umumiy_${isoDay(new Date())}.xlsx`, count: transactions.length };
}

module.exports = { buildUserReport, buildAdminReport };
