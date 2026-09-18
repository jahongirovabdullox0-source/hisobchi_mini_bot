const { Markup } = require('telegraf');
const config = require('../config/default');
const { bot, isBotEnabled, hasWebApp } = require('../core/bot');
const { prisma } = require('../database/connection');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Debt = require('../models/Debt');
const report = require('./report.service');
const { money, signedMoney, formatDate, escapeHtml, toNumber } = require('../utils/format');
const { getRange, rangeWhere } = require('../utils/period');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isRealChat = (telegramId) => /^\d+$/.test(String(telegramId || ''));

function openAppButton(text = '📱 Ilovani ochish') {
  if (!hasWebApp()) return {};
  return Markup.inlineKeyboard([Markup.button.webApp(text, config.bot.webAppUrl)]);
}

async function sendMessage(telegramId, text, extra = {}) {
  if (!isBotEnabled() || !isRealChat(telegramId)) return false;
  try {
    await bot.telegram.sendMessage(telegramId, text, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...extra,
    });
    return true;
  } catch (e) {
    const code = e && e.response && e.response.error_code;
    if (code !== 403) console.warn(`✉️  Xabar yuborilmadi (${telegramId}): ${e.message}`);
    return false;
  }
}

async function sendDocument(telegramId, buffer, filename, caption) {
  if (!isBotEnabled()) throw new Error("Bot ulanmagan. .env faylida BOT_TOKEN ni to'ldiring.");
  if (!isRealChat(telegramId)) throw new Error('Fayl faqat Telegram orqali kirgan foydalanuvchiga yuboriladi');
  await bot.telegram.sendDocument(telegramId, { source: buffer, filename }, { caption, parse_mode: 'HTML' });
}

/** Shu oydagi yo'nalish natijasi */
async function monthSectorNet(userId, sectorId) {
  const range = getRange('month');
  const groups = await Transaction.sumByType({ userId, sectorId, ...rangeWhere(range) });
  return report.totalsFromGroups(groups);
}

function describeTransaction(tx) {
  const isIncome = tx.type === 'INCOME';
  const lines = [];
  const path = [
    `${tx.sector.icon} ${escapeHtml(tx.sector.name)}`,
    tx.category ? `${tx.category.icon} ${escapeHtml(tx.category.name)}` : null,
  ].filter(Boolean);
  lines.push(path.join(' → '));
  lines.push(`${isIncome ? '💰' : '💸'} <b>${isIncome ? '+' : '−'}${money(tx.amount)}</b>`);
  if (tx.currency !== 'UZS') {
    lines.push(`💱 ${money(tx.rawAmount, tx.currency)} × ${toNumber(tx.rate).toLocaleString('ru-RU')} kurs`);
  }
  if (tx.quantity) {
    const qty = toNumber(tx.quantity);
    const unitPrice = qty ? toNumber(tx.amount) / qty : 0;
    lines.push(`⚖️ ${qty} ${escapeHtml(tx.unit || '')} (1 ${escapeHtml(tx.unit || 'birlik')} ≈ ${money(unitPrice)})`);
  }
  if (tx.note) lines.push(`📝 ${escapeHtml(tx.note)}`);
  lines.push(`📅 ${formatDate(tx.occurredAt)}`);
  return lines.join('\n');
}

/** Mini App'dan amal saqlanganda bot tasdiq xabari yuboradi */
async function notifyTransaction(user, tx, action = 'created') {
  if (!user.notifyOnSave || !isRealChat(user.telegramId)) return;
  const isIncome = tx.type === 'INCOME';
  const title = {
    created: isIncome ? '✅ <b>Daromad yozildi</b>' : '✅ <b>Harajat yozildi</b>',
    updated: '✏️ <b>Amal tahrirlandi</b>',
  }[action];

  const [sectorMonth, warning] = await Promise.all([
    monthSectorNet(user.id, tx.sectorId),
    tx.type === 'EXPENSE' ? report.budgetWarning(user.id, tx.sectorId) : Promise.resolve(null),
  ]);
  const lines = [
    title,
    '',
    describeTransaction(tx),
    '',
    `📊 Shu oy «${escapeHtml(tx.sector.name)}»: sof ${signedMoney(sectorMonth.net)}`,
  ];
  if (warning) lines.push('', warning);
  await sendMessage(user.telegramId, lines.join('\n'), openAppButton('📱 Batafsil'));
}

/** Kunlik hisobot matni (faqat bugun amal bo'lgan bo'lsa) */
async function buildDailyReport(user) {
  const today = getRange('today');
  const month = getRange('month');
  const [todayGroups, monthGroups, bySector] = await Promise.all([
    Transaction.sumByType({ userId: user.id, ...rangeWhere(today) }),
    Transaction.sumByType({ userId: user.id, ...rangeWhere(month) }),
    Transaction.groupBySector({ userId: user.id, ...rangeWhere(today) }),
  ]);
  const t = report.totalsFromGroups(todayGroups);
  const m = report.totalsFromGroups(monthGroups);

  // Muddati ertaga yoki undan oldin bo'lgan qarzlar
  const tomorrowEnd = new Date(today.start.getTime() + 2 * 86_400_000);
  const dueDebts = await Debt.listDue(user.id, tomorrowEnd);

  if (!t.count && !dueDebts.length) return null;

  const lines = [`🌙 <b>Bugungi hisobot</b> — ${formatDate(new Date())}`, ''];
  if (t.count) {
    lines.push(`💰 Daromad: ${money(t.income)}`);
    lines.push(`💸 Harajat: ${money(t.expense)}`);
    lines.push(`📈 Kunlik natija: <b>${signedMoney(t.net)}</b>`);
    lines.push(`🧾 Amallar soni: ${t.count} ta`);

    const sectors = await prisma.sector.findMany({ where: { id: { in: [...new Set(bySector.map((g) => g.sectorId))] } } });
    if (sectors.length > 1) {
      lines.push('');
      for (const s of sectors) {
        const st = report.totalsFromGroups(bySector.filter((g) => g.sectorId === s.id));
        lines.push(`${s.icon} ${escapeHtml(s.name)}: ${signedMoney(st.net)}`);
      }
    }
    lines.push('');
    lines.push(`🗓 Oy boshidan sof foyda: <b>${signedMoney(m.net)}</b>`);
  }

  if (dueDebts.length) {
    lines.push('');
    lines.push('⏰ <b>Qarz eslatmalari:</b>');
    const now = Date.now();
    for (const d of dueDebts.slice(0, 10)) {
      const left = toNumber(d.amount) - toNumber(d.paidAmount);
      const overdue = new Date(d.dueDate).getTime() < now;
      const who = d.direction === 'OWED_TO_ME' ? `${escapeHtml(d.person)} sizga qaytarishi kerak` : `Siz ${escapeHtml(d.person)}ga qaytarishingiz kerak`;
      lines.push(`${overdue ? '🔴' : '🟡'} ${who}: <b>${money(left, d.currency)}</b> (${formatDate(d.dueDate, { withYear: false })})`);
    }
  }
  return lines.join('\n');
}

async function sendDailyReports() {
  if (!isBotEnabled()) return { sent: 0 };
  const users = await User.listForDailyReport();
  let sent = 0;
  for (const u of users) {
    if (!isRealChat(u.telegramId)) continue;
    try {
      const text = await buildDailyReport(u);
      if (text && (await sendMessage(u.telegramId, text, openAppButton()))) sent++;
    } catch (e) {
      console.warn(`Kunlik hisobot xatosi (${u.id}): ${e.message}`);
    }
    await sleep(60);
  }
  console.log(`🌙 Kunlik hisobot yuborildi: ${sent} ta foydalanuvchi`);
  return { sent };
}

/** Admin: barcha foydalanuvchilarga xabar */
async function broadcast(text) {
  if (!isBotEnabled()) throw new Error("Bot ulanmagan. .env faylida BOT_TOKEN ni to'ldiring.");
  const users = await User.listActive();
  let sent = 0;
  let failed = 0;
  for (const u of users) {
    if (!isRealChat(u.telegramId)) continue;
    const ok = await sendMessage(u.telegramId, text, openAppButton());
    if (ok) sent++;
    else failed++;
    await sleep(60);
  }
  return { sent, failed, total: users.length };
}

module.exports = {
  sendMessage,
  sendDocument,
  notifyTransaction,
  describeTransaction,
  monthSectorNet,
  buildDailyReport,
  sendDailyReports,
  broadcast,
  openAppButton,
  isRealChat,
};
