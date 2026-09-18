const { prisma } = require('../database/connection');

const ORDER = [{ isClosed: 'asc' }, { dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }];

const Debt = {
  listForUser(userId, { status = 'open', direction } = {}) {
    const where = { userId };
    if (status === 'open') where.isClosed = false;
    if (status === 'closed') where.isClosed = true;
    if (direction === 'I_OWE' || direction === 'OWED_TO_ME') where.direction = direction;
    return prisma.debt.findMany({ where, orderBy: ORDER });
  },

  listOpen(userId) {
    return prisma.debt.findMany({ where: { userId, isClosed: false }, orderBy: ORDER });
  },

  findForUser(id, userId) {
    return prisma.debt.findFirst({ where: { id, userId } });
  },

  create(data) {
    return prisma.debt.create({ data });
  },

  update(id, data) {
    return prisma.debt.update({ where: { id }, data });
  },

  delete(id) {
    return prisma.debt.delete({ where: { id } });
  },

  /** Muddati bugun yoki o'tib ketgan ochiq qarzlar */
  listDue(userId, until) {
    return prisma.debt.findMany({
      where: { userId, isClosed: false, dueDate: { not: null, lt: until } },
      orderBy: { dueDate: 'asc' },
    });
  },
};

module.exports = Debt;
