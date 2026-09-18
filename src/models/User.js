const { prisma } = require('../database/connection');

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

// Har bir so'rovda bazaga murojaat qilmaslik uchun foydalanuvchilar qisqa muddat xotirada saqlanadi
const CACHE_MS = 60 * 1000;
const cache = new Map();

function remember(user) {
  cache.set(user.telegramId, { user, at: Date.now() });
  return user;
}

function fromTelegram(tg) {
  return {
    firstName: String(tg.first_name || 'Foydalanuvchi').slice(0, 100),
    lastName: tg.last_name ? String(tg.last_name).slice(0, 100) : null,
    username: tg.username ? String(tg.username).slice(0, 64) : null,
    photoUrl: tg.photo_url ? String(tg.photo_url).slice(0, 500) : null,
  };
}

function isChanged(user, data) {
  return (
    user.firstName !== data.firstName ||
    user.lastName !== data.lastName ||
    user.username !== data.username ||
    Boolean(data.photoUrl && user.photoUrl !== data.photoUrl)
  );
}

const User = {
  findById(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByTelegramId(telegramId) {
    return prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
  },

  /** Telegram ma'lumotlari bo'yicha foydalanuvchini yaratadi yoki yangilaydi */
  async syncFromTelegram(tgUser) {
    const telegramId = String(tgUser.id);
    const data = fromTelegram(tgUser);

    const hit = cache.get(telegramId);
    if (hit && Date.now() - hit.at < CACHE_MS && !isChanged(hit.user, data)) return hit.user;

    const existing = await prisma.user.findUnique({ where: { telegramId } });

    if (!existing) {
      return remember(
        await prisma.user.upsert({
          where: { telegramId },
          update: { ...data, lastSeenAt: new Date() },
          create: { telegramId, ...data },
        })
      );
    }

    const stale = Date.now() - new Date(existing.lastSeenAt).getTime() > TOUCH_INTERVAL_MS;
    if (!isChanged(existing, data) && !stale) return remember(existing);

    return remember(
      await prisma.user.update({
        where: { id: existing.id },
        data: { ...data, photoUrl: data.photoUrl || existing.photoUrl, lastSeenAt: new Date() },
      })
    );
  },

  async update(id, data) {
    return remember(await prisma.user.update({ where: { id }, data }));
  },

  /** Admin: ro'yxat + qidiruv */
  async list({ q, page = 1, pageSize = 20 } = {}) {
    const where = {};
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { telegramId: { contains: q } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { transactions: true, debts: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  /** Kunlik hisobot oladigan faol foydalanuvchilar */
  listForDailyReport() {
    return prisma.user.findMany({ where: { dailyReport: true, isBlocked: false } });
  },

  listActive() {
    return prisma.user.findMany({ where: { isBlocked: false }, select: { id: true, telegramId: true, firstName: true } });
  },
};

module.exports = User;
