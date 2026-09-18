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
  },

  admin: {
    password: process.env.ADMIN_PASSWORD || 'admin12345',
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
