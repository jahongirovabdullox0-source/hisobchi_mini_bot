require('dotenv').config();

const bool = (v, def = false) => {
  if (v === undefined || v === null || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  timezone: 'Asia/Tashkent',

  db: {
    url: process.env.DATABASE_URL || '',
  },

  bot: {
    token: (process.env.BOT_TOKEN || '').trim(),
    webAppUrl: (process.env.WEBAPP_URL || '').trim().replace(/\/+$/, ''),
    dailyReportCron: process.env.DAILY_REPORT_CRON || '0 21 * * *',
    // Serverning ochiq manzili bo'lsa (Render o'zi RENDER_EXTERNAL_URL beradi) — bot webhook rejimida ishlaydi,
    // aks holda (kompyuterda) — polling rejimida
    webhookDomain: (process.env.BOT_WEBHOOK_DOMAIN || process.env.RENDER_EXTERNAL_URL || '').trim(),
  },

  admin: {
    password: process.env.ADMIN_PASSWORD || 'admin12345',
    // true — Admin API internetdan (masalan, Vercel'dagi Admin Paneldan) ochiladi
    allowRemote: bool(process.env.ADMIN_ALLOW_REMOTE, false),
    // Kirish tokeni shu maxfiy kalit bilan imzolanadi (kod ochiq bo'lsa ham tokenni hisoblab bo'lmaydi)
    secret: process.env.ADMIN_SECRET || process.env.BOT_TOKEN || 'hisobchi-local-secret',
  },

  auth: {
    allowDev: bool(process.env.ALLOW_DEV_AUTH, false),
    // initData amal qilish muddati (soniya). 0 — tekshirilmaydi
    initDataTtl: 60 * 60 * 24,
  },

  app: {
    name: 'Hisobchi',
    baseCurrency: 'UZS',
    currencies: ['UZS', 'USD', 'EUR', 'RUB', 'KZT'],
  },
};

module.exports = config;
