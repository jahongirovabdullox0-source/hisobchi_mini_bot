const { prisma } = require('../database/connection');

const Budget = {
  listForMonth(userId, year, month) {
    return prisma.budget.findMany({ where: { userId, year, month } });
  },

  upsert(userId, sectorId, year, month, planIncome, planExpense) {
    return prisma.budget.upsert({
      where: { userId_sectorId_year_month: { userId, sectorId, year, month } },
      update: { planIncome, planExpense },
      create: { userId, sectorId, year, month, planIncome, planExpense },
    });
  },

  /** O'tgan oy rejasidan nusxa */
  async copyFromPrevious(userId, year, month) {
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prev = await prisma.budget.findMany({ where: { userId, year: prevYear, month: prevMonth } });
    for (const b of prev) {
      await Budget.upsert(userId, b.sectorId, year, month, b.planIncome, b.planExpense);
    }
    return prev.length;
  },
};

module.exports = Budget;
