const crypto = require('crypto');
const config = require('../config/default');
const User = require('../models/User');

const DEV_USER = { id: 'dev-user', first_name: 'Test', last_name: 'Foydalanuvchi', username: 'dev' };

/**
 * Telegram WebApp initData imzosini tekshiradi.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyInitData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const authDate = Number(params.get('auth_date') || 0);
    if (config.auth.initDataTtl && authDate && Date.now() / 1000 - authDate > config.auth.initDataTtl) {
      return { expired: true };
    }

    const user = JSON.parse(params.get('user') || 'null');
    return user && user.id ? { user } : null;
  } catch {
    return null;
  }
}

/** Faqat dev rejim uchun: imzosiz o'qish */
function parseInitDataUnsafe(initData) {
  try {
    const user = JSON.parse(new URLSearchParams(initData).get('user') || 'null');
    return user && user.id ? user : null;
  } catch {
    return null;
  }
}

/** So'rov ngrok (tashqi internet) orqali keldimi — shunda test rejimi ishlamaydi */
const viaTunnel = (req) => Boolean(req.get('x-forwarded-for') || req.get('x-forwarded-host'));

/** Mini App so'rovlari uchun: foydalanuvchini aniqlaydi va req.user ga yozadi */
async function telegramAuth(req, res, next) {
  try {
    const initData = req.get('x-telegram-init-data') || '';
    const allowDev = config.auth.allowDev && !viaTunnel(req);
    let tgUser = null;

    if (initData) {
      if (config.bot.token) {
        const result = verifyInitData(initData, config.bot.token);
        if (result && result.expired) {
          return res.status(401).json({ error: 'Sessiya muddati tugagan. Ilovani yopib, qayta oching.' });
        }
        tgUser = result ? result.user : null;
      } else if (allowDev) {
        tgUser = parseInitDataUnsafe(initData);
      }
      if (!tgUser) return res.status(401).json({ error: "Telegram ma'lumotlari tasdiqlanmadi" });
    } else if (allowDev) {
      tgUser = DEV_USER;
    } else {
      return res.status(401).json({ error: 'Iltimos, ilovani Telegram bot orqali oching' });
    }

    const user = await User.syncFromTelegram(tgUser);
    if (user.isBlocked) return res.status(403).json({ error: 'Hisobingiz administrator tomonidan bloklangan' });

    req.user = user;
    return next();
  } catch (e) {
    return next(e);
  }
}

/* ---------------------------- ADMIN ---------------------------- */

/** Admin Panel faqat shu kompyuterdan (localhost) ishlaydi — ngrok orqali kirib bo'lmaydi */
function localOnly(req, res, next) {
  if (viaTunnel(req)) return res.status(403).json({ error: 'Admin Panel faqat kompyuterdan (localhost) ishlaydi' });
  return next();
}

function adminToken() {
  return crypto.createHash('sha256').update(`hisobchi-admin:${config.admin.password}`).digest('hex');
}

function checkAdminPassword(password) {
  const a = crypto.createHash('sha256').update(String(password || '')).digest();
  const b = crypto.createHash('sha256').update(String(config.admin.password)).digest();
  return crypto.timingSafeEqual(a, b);
}

function adminAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const expected = adminToken();
  const ok =
    token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (!ok) return res.status(401).json({ error: 'Kirish uchun parol talab qilinadi' });
  return next();
}

module.exports = { telegramAuth, adminAuth, localOnly, adminToken, checkAdminPassword, verifyInitData };
