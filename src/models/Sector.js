const { prisma } = require('../database/connection');
const { cached } = require('../utils/cache');

const ORDER = [{ sortOrder: 'asc' }, { id: 'asc' }];
const CATEGORY_ORDER = [{ type: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }];
const CACHE_MS = 5 * 60 * 1000;

const allCache = cached(CACHE_MS, () => prisma.sector.findMany({ orderBy: ORDER }));
const withCategoriesCache = cached(CACHE_MS, () =>
  prisma.sector.findMany({
    where: { isActive: true },
    orderBy: ORDER,
    include: { categories: { where: { isActive: true }, orderBy: CATEGORY_ORDER } },
  })
);

const Sector = {
  /** Barcha yo'nalishlar (faol + nofaol), keshlangan */
  listAll() {
    return allCache();
  },

  /** Mini App uchun: faol yo'nalishlar va ularning faol kategoriyalari */
  listWithCategories() {
    return withCategoriesCache();
  },

  /** Admin uchun: statistikasi bilan */
  listForAdmin() {
    return prisma.sector.findMany({
      orderBy: ORDER,
      include: {
        categories: {
          orderBy: CATEGORY_ORDER,
          include: { _count: { select: { transactions: true } } },
        },
        _count: { select: { transactions: true } },
      },
    });
  },

  async findById(id) {
    const hit = (await allCache()).find((s) => s.id === id);
    return hit || prisma.sector.findUnique({ where: { id } });
  },

  clearCache() {
    allCache.clear();
    withCategoriesCache.clear();
  },

  async create(data) {
    const item = await prisma.sector.create({ data });
    Sector.clearCache();
    return item;
  },

  async update(id, data) {
    const item = await prisma.sector.update({ where: { id }, data });
    Sector.clearCache();
    return item;
  },

  /** Amallar bo'lsa — o'chirmasdan nofaol qiladi (tarix saqlanadi) */
  async remove(id) {
    const used = await prisma.transaction.count({ where: { sectorId: id } });
    Sector.clearCache();
    if (used > 0) {
      await prisma.sector.update({ where: { id }, data: { isActive: false } });
      Sector.clearCache();
      return { deleted: false, deactivated: true, used };
    }
    await prisma.sector.delete({ where: { id } });
    Sector.clearCache();
    return { deleted: true, deactivated: false, used: 0 };
  },
};

module.exports = Sector;
