const { message } = require('telegraf/filters');
const { bot } = require('../core/bot');
const c = require('../controllers/botController');

/** Bot handlerlarini ro'yxatdan o'tkazadi */
function registerBotRoutes() {
  if (!bot) return;

  bot.use(c.loadUser);

  // Buyruqlar
  bot.start(c.start);
  bot.help(c.help);
  bot.command('yordam', c.help);
  bot.command('balans', c.balance);
  bot.command('hisobot', c.monthlyReport);
  bot.command('qarzlar', c.debts);
  bot.command('excel', c.excel);
  bot.command('ilova', c.openApp);

  // Menyu tugmalari
  bot.hears(c.BUTTONS.balance, c.balance);
  bot.hears(c.BUTTONS.report, c.monthlyReport);
  bot.hears(c.BUTTONS.debts, c.debts);
  bot.hears(c.BUTTONS.excel, c.excel);
  bot.hears(c.BUTTONS.help, c.help);
  bot.hears(c.BUTTONS.open, c.openApp);

  // Kontakt (telefon raqam)
  bot.on(message('contact'), c.contact);

  // Inline tugmalar
  bot.action(/^xl:(month|prev|year|all)$/, c.onExcelPeriod);
  bot.action(/^qt:(\w+):([IE])$/, c.onQuickType);
  bot.action(/^qs:(\w+):(\d+)$/, c.onQuickSector);
  bot.action(/^qc:(\w+):(\d+)$/, c.onQuickCategory);
  bot.action(/^qb:(\w+)$/, c.onQuickBack);
  bot.action(/^qx:(\w+)$/, c.onQuickCancel);
  bot.action(/^undo:(\d+)$/, c.onUndo);

  // Tezkor yozish: "-500000 yem"
  bot.on(message('text'), c.onText);

  bot.catch(c.onError);
}

module.exports = registerBotRoutes;
