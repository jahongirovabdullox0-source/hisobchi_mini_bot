const { Telegraf } = require('telegraf');
const config = require('../config/default');

let bot = null;

if (config.bot.token) {
  bot = new Telegraf(config.bot.token, { handlerTimeout: 60_000 });
} else {
  console.warn("⚠️  BOT_TOKEN topilmadi — bot o'chirilgan holda ishlaydi (faqat API va Admin Panel).");
}

const isBotEnabled = () => Boolean(bot);

/** Mini App tugmasi faqat https manzil bilan ishlaydi */
const hasWebApp = () => /^https:\/\//i.test(config.bot.webAppUrl);

module.exports = { bot, isBotEnabled, hasWebApp };
