const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const config = require('./config/default');
const { connectDatabase, disconnectDatabase } = require('./database/connection');
const { bot, isBotEnabled, hasWebApp } = require('./core/bot');
const registerBotRoutes = require('./routes/bot.routes');
const clientRoutes = require('./routes/client.routes');
const adminRoutes = require('./routes/admin.routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
const scheduler = require('./services/scheduler');
const { syncSilently } = require('./services/rates.service');

/** Build qilingan frontendni (agar mavjud bo'lsa) tarqatadi */
function serveSpa(app, mount, dir) {
  const indexFile = path.join(dir, 'index.html');
  if (!fs.existsSync(indexFile)) return false;
  app.use(mount, express.static(dir, { index: false, maxAge: '1h' }));
  app.get(mount === '/' ? /^\/(?!api\/).*/ : new RegExp(`^${mount}(/.*)?$`), (req, res) => res.sendFile(indexFile));
  return true;
}

async function setupBot() {
  if (!isBotEnabled()) return;
  registerBotRoutes();

  try {
    bot.botInfo = await bot.telegram.getMe();
  } catch (e) {
    console.error("❌ Bot tokeni noto'g'ri yoki Telegram'ga ulanib bo'lmadi:", e.message);
    return;
  }

  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: 'Botni ishga tushirish' },
      { command: 'balans', description: 'Balans va sof foyda' },
      { command: 'hisobot', description: "Oylik hisobot (yo'nalishlar bo'yicha)" },
      { command: 'qarzlar', description: 'Qarz daftari' },
      { command: 'excel', description: 'Excel hisobot yuklab olish' },
      { command: 'ilova', description: 'Mini App ni ochish' },
      { command: 'yordam', description: 'Yordam va tezkor yozish namunalari' },
    ]);
    const menuButton = hasWebApp()
      ? { type: 'web_app', text: 'Hisobchi', web_app: { url: config.bot.webAppUrl } }
      : { type: 'commands' };
    await bot.telegram.callApi('setChatMenuButton', { menu_button: menuButton });
  } catch (e) {
    console.warn('⚠️  Bot menyusini sozlab bo\'lmadi:', e.message);
  }

  bot
    .launch({ dropPendingUpdates: true })
    .catch((e) => console.error('❌ Bot to\'xtadi:', e.message));

  console.log(`🤖 Bot ishga tushdi: @${bot.botInfo.username}`);
  if (hasWebApp()) console.log(`📱 Mini App manzili: ${config.bot.webAppUrl}`);
  else console.warn("⚠️  WEBAPP_URL (https) ko'rsatilmagan — Mini App tugmasi chiqmaydi. ngrok manzilini .env ga yozing.");
}

async function main() {
  await connectDatabase();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true, bot: isBotEnabled(), time: new Date() }));
  app.use('/api/client', clientRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', notFoundHandler);

  const root = path.join(__dirname, '..');
  const adminServed = serveSpa(app, '/admin', path.join(root, 'admin-panel', 'dist'));
  const appServed = serveSpa(app, '/', path.join(root, 'mini-app', 'dist'));

  app.use(errorHandler);

  const server = app.listen(config.port, () => {
    console.log(`🚀 API server: http://localhost:${config.port}`);
    if (appServed) console.log(`   Mini App (build): http://localhost:${config.port}/`);
    if (adminServed) console.log(`   Admin Panel (build): http://localhost:${config.port}/admin`);
  });

  await setupBot();
  scheduler.start();
  syncSilently();

  const shutdown = async (signal) => {
    console.log(`\n${signal} — to'xtatilmoqda...`);
    scheduler.stop();
    if (isBotEnabled()) {
      try {
        bot.stop(signal);
      } catch {
        /* bot ishga tushmagan bo'lishi mumkin */
      }
    }
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(async (e) => {
  console.error('❌ Ishga tushirishda xatolik:', e.message);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
