const { prisma } = require('../database/connection');
const { badRequest } = require('../utils/http');
const { cached } = require('../utils/cache');

const listCache = cached(10 * 60 * 1000, () => prisma.exchangeRate.findMany({ orderBy: { id: 'asc' } }));

const Rate = {
  list() {
    return listCache();
  },

  findByCode(code) {
    return prisma.exchangeRate.findUnique({ where: { code } });
  },

  /** 1 birlik valyuta necha so'm */
  async getRate(code) {
    if (!code || code === 'UZS') return 1;
    const row = (await listCache()).find((r) => r.code === code);
    if (!row) throw badRequest(`${code} valyutasi kursi topilmadi`);
    return Number(row.rate);
  },

  /** { USD: 12650, ... } */
  async map() {
    const out = { UZS: 1 };
    for (const r of await listCache()) out[r.code] = Number(r.rate);
    return out;
  },

  async update(code, data) {
    const item = await prisma.exchangeRate.update({ where: { code }, data });
    listCache.clear();
    return item;
  },

  async upsert(code, rate, extra = {}) {
    const item = await prisma.exchangeRate.upsert({
      where: { code },
      update: { rate },
      create: { code, rate, name: extra.name || code, symbol: extra.symbol || '' },
    });
    listCache.clear();
    return item;
  },
};

module.exports = Rate;
