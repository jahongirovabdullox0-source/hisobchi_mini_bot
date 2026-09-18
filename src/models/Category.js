const { prisma } = require('../database/connection');
const { cached } = require('../utils/cache');
const Sector = require('./Sector');

const CACHE_MS = 5 * 60 * 1000;

/** Bot uchun: faol kategoriyalar (yo'nalishi bilan) */
const activeCache = cached(CACHE_MS, () =>
  prisma.category.findMany({
    where: { isActive: true, sector: { isActive: true } },
    include: { sector: true },
    orderBy: [{ sector: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { id: 'asc' }],
  })
);

/** Hisobotlar uchun: barcha kategoriyalar (nofaollari ham) */
const allCache = cached(CACHE_MS, () =>
  prisma.category.findMany({ select: { id: true, name: true, icon: true, sectorId: true, type: true, unit: true, isActive: true } })
);

const Category = {
  async findById(id) {
    const hit = (await allCache()).find((c) => c.id === id);
    return hit || prisma.category.findUnique({ where: { id } });
  },

  listActiveCached() {
    return activeCache();
  },

  listAllLight() {
    return allCache();
  },

  /** Yo'nalish yoki kategoriya o'zgarganda barcha keshlar tozalanadi */
  clearCache() {
    activeCache.clear();
    allCache.clear();
    Sector.clearCache();
  },

  async create(data) {
    const item = await prisma.category.create({ data });
    Category.clearCache();
    return item;
  },

  async update(id, data) {
    const item = await prisma.category.update({ where: { id }, data });
    Category.clearCache();
    return item;
  },

  /** Ishlatilgan bo'lsa — nofaol qiladi */
  async remove(id) {
    const used = await prisma.transaction.count({ where: { categoryId: id } });
    if (used > 0) {
      await prisma.category.update({ where: { id }, data: { isActive: false } });
      Category.clearCache();
      return { deleted: false, deactivated: true, used };
    }
    await prisma.category.delete({ where: { id } });
    Category.clearCache();
    return { deleted: true, deactivated: false, used: 0 };
  },
};

module.exports = Category;
