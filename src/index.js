const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');

const config = require('./config/default');
const { connectDatabase, disconnectDatabase } = require('./database/connection');
const { bot, isBotEnabled, hasWebApp } = require('./core/bot');
const registerBotRoutes = require('./routes/bot.routes');
const clientRoutes = require('./routes/client.routes');
const adminRoutes = require('./routes/admin.routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
const { isWeakAdminPassword } = require('./middlewares/auth.middleware');
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

/**
 * Kompyuterda ishga tushganda: bot allaqachon boshqa serverda (masalan, Render'da webhook bilan)
 * ishlayotgan bo'lsa — unga xalaqit bermaymiz. Aks holda polling webhook'ni o'chirib, botni "tortib olardi".
 */
async function botRunsElsewhere() {
  if (config.bot.webhookDomain) return null;
  try {
    const info = await bot.telegram.getWebhookInfo();
    if (!info.url) return null;
    const host = new URL(info.url).host;
    const ownHost = config.bot.webAppUrl ? new URL(config.bot.webAppUrl).host : '';
    return host === ownHost ? null : host;
  } catch {
    return null;
  }
}

/** Bot handlerlari, buyruqlar menyusi va Mini App tugmasi */
async function prepareBot() {
  if (!isBotEnabled()) return false;
  registerBotRoutes();

  try {
    bot.botInfo = await bot.telegram.getMe();
  } catch (e) {
    console.error("❌ Bot tokeni noto'g'ri yoki Telegram'ga ulanib bo'lmadi:", e.message);
    return false;
  }

  const remoteHost = await botRunsElsewhere();
  if (remoteHost) {
    console.warn(`⚠️  Bot serverda ishlayapti (${remoteHost}) — kompyuterda bot va kunlik hisobot ishga tushirilmadi.`);
    console.warn('   API, Mini App va Admin Panel kompyuterda baribir ishlaydi (o\'sha bazaga ulangan).');
    return 'remote';
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
    console.warn("⚠️  Bot menyusini sozlab bo'lmadi:", e.message);
  }
  return true;
}

/** Webhook: Telegram yangiliklarni shu serverga o'zi yuboradi (Render kabi bulut serverlar uchun) */
function createWebhook() {
  const secret = crypto.createHash('sha256').update(`hisobchi-webhook:${config.bot.token}`).digest('hex');
  return bot.createWebhook({
    domain: config.bot.webhookDomain,
    path: `/telegram/${secret.slice(0, 24)}`,
    secret_token: secret.slice(24, 64),
  });
}

async function main() {
  await connectDatabase();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  // Vercel'dagi Mini App va Admin Panel boshqa domendan murojaat qiladi
  app.use(cors({ maxAge: 86400, exposedHeaders: ['Content-Disposition'] }));

  const botState = await prepareBot();
  const botRemote = botState === 'remote';
  const botReady = botState === true;
  const useWebhook = botReady && Boolean(config.bot.webhookDomain);
  if (useWebhook) app.use(await createWebhook());

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true, bot: isBotEnabled(), time: new Date() }));
  app.use('/api/client', clientRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', notFoundHandler);

  const root = path.join(__dirname, '..');
  const adminServed = serveSpa(app, '/admin', path.join(root, 'admin-panel', 'dist'));
  const appServed = serveSpa(app, '/', path.join(root, 'mini-app', 'dist'));
  if (!appServed) app.get('/', (req, res) => res.json({ ok: true, name: 'Hisobchi API' }));

  app.use(errorHandler);

  const server = app.listen(config.port, () => {
    console.log(`🚀 API server: http://localhost:${config.port}`);
    if (appServed) console.log(`   Mini App (build): http://localhost:${config.port}/`);
    if (adminServed) console.log(`   Admin Panel (build): http://localhost:${config.port}/admin`);
  });

  if (botReady) {
    if (useWebhook) {
      console.log(`🤖 Bot ishga tushdi (webhook): @${bot.botInfo.username}`);
    } else {
      bot
        .launch({ dropPendingUpdates: true })
        .catch((e) => console.error("❌ Bot to'xtadi:", e.message));
      console.log(`🤖 Bot ishga tushdi: @${bot.botInfo.username}`);
    }
    if (hasWebApp()) console.log(`📱 Mini App manzili: ${config.bot.webAppUrl}`);
    else console.warn("⚠️  WEBAPP_URL (https) ko'rsatilmagan — Mini App tugmasi chiqmaydi.");
  }

  if (config.admin.allowRemote && isWeakAdminPassword()) {
    console.warn("⚠️  ADMIN_PASSWORD juda oddiy — xavfsizlik uchun Admin Panelga kirish bloklangan. Kamida 10 belgili murakkab parol o'rnating.");
  }

  // Bot boshqa serverda ishlasa, kunlik hisobotni o'sha server yuboradi (ikki marta ketmasligi uchun)
  if (!botRemote) scheduler.start();
  syncSilently();

  const shutdown = async (signal) => {
    console.log(`\n${signal} — to'xtatilmoqda...`);
    scheduler.stop();
    if (isBotEnabled() && !useWebhook) {
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
