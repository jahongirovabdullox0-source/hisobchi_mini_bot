const { prisma } = require('../database/connection');

const include = {
  sector: { select: { id: true, slug: true, name: true, icon: true, color: true } },
  category: { select: { id: true, name: true, icon: true, unit: true } },
};

const includeWithUser = {
  ...include,
  user: { select: { id: true, telegramId: true, firstName: true, lastName: true, username: true, phone: true } },
};

const ORDER = [{ occurredAt: 'desc' }, { id: 'desc' }];

const Transaction = {
  include,
  includeWithUser,

  create(data) {
    return prisma.transaction.create({ data, include });
  },

  findForUser(id, userId) {
    return prisma.transaction.findFirst({ where: { id, userId }, include });
  },

  findById(id) {
    return prisma.transaction.findUnique({ where: { id }, include: includeWithUser });
  },

  update(id, data) {
    return prisma.transaction.update({ where: { id }, data, include });
  },

  delete(id) {
    return prisma.transaction.delete({ where: { id } });
  },

  recent(userId, take = 8) {
    return prisma.transaction.findMany({ where: { userId }, include, orderBy: ORDER, take });
  },

  /** Sahifalangan ro'yxat */
  async paginate(where, { page = 1, pageSize = 30, withUser = false } = {}) {
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: withUser ? includeWithUser : include,
        orderBy: ORDER,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);
    return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  /** Filtrlangan ro'yxat bo'yicha jami daromad/harajat */
  sumByType(where) {
    return prisma.transaction.groupBy({ by: ['type'], where, _sum: { amount: true }, _count: { _all: true } });
  },

  groupBySector(where) {
    return prisma.transaction.groupBy({
      by: ['sectorId', 'type'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });
  },

  groupByCategory(where) {
    return prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });
  },

  timeline(where) {
    return prisma.transaction.findMany({
      where,
      select: { amount: true, type: true, occurredAt: true },
      orderBy: { occurredAt: 'asc' },
    });
  },

  forExport(where) {
    return prisma.transaction.findMany({ where, include: includeWithUser, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] });
  },
};

/** API so'rovidan Prisma "where" filtrini yasaydi */
function buildFilter({ userId, type, sectorId, categoryId, q, range } = {}) {
  const where = {};
  if (userId) where.userId = userId;
  if (type === 'INCOME' || type === 'EXPENSE') where.type = type;
  if (sectorId) where.sectorId = sectorId;
  if (categoryId) where.categoryId = categoryId;
  if (range && range.start) where.occurredAt = { gte: range.start, lt: range.end };
  if (q) {
    where.OR = [
      { note: { contains: q, mode: 'insensitive' } },
      { category: { name: { contains: q, mode: 'insensitive' } } },
      { sector: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }
  return where;
}

Transaction.buildFilter = buildFilter;

module.exports = Transaction;
