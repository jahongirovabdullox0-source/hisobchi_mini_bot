const { Markup } = require('telegraf');
const { hasWebApp } = require('../core/bot');
const User = require('../models/User');
const Sector = require('../models/Sector');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Debt = require('../models/Debt');
const report = require('../services/report.service');
const txService = require('../services/transaction.service');
const notify = require('../services/notify.service');
const { buildUserReport } = require('../services/export.service');
const { parseQuickEntry, matchCategory } = require('../services/quickEntry.service');
const { getRange } = require('../utils/period');
const { HttpError } = require('../utils/http');
const { money, signedMoney, escapeHtml, toNumber, formatDate, localParts } = require('../utils/format');

const BUTTONS = {
  open: '📱 Ilovani ochish',
  balance: '💰 Balans',
  report: '📊 Oylik hisobot',
  debts: '🤝 Qarzlar',
  excel: '📥 Excel hisobot',
  help: '❓ Yordam',
  phone: '📞 Raqamni ulashish',
};

const HTML = { parse_mode: 'HTML', disable_web_page_preview: true };

/* ---------------------------- Yordamchilar ---------------------------- */

/**
 * Pastki menyu. Mini App bu yerda oddiy tugma: reply-klaviaturadan ochilgan Mini App
 * foydalanuvchi ma'lumotini (initData) olmaydi, shuning uchun bosilganda inline tugma yuboriladi.
 */
function mainKeyboard(user) {
  const rows = [[BUTTONS.open]];
  rows.push([BUTTONS.balance, BUTTONS.report]);
  rows.push([BUTTONS.debts, BUTTONS.excel]);
  rows.push(user && user.phone ? [BUTTONS.help] : [Markup.button.contactRequest(BUTTONS.phone), BUTTONS.help]);
  return Markup.keyboard(rows).resize();
}

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const changeText = (value) => {
  if (value === null || value === undefined) return '';
  return ` (${value > 0 ? '▲' : value < 0 ? '▼' : ''}${Math.abs(value)}%)`;
};

/** Xabarni tahrirlaydi, bo'lmasa yangisini yuboradi */
async function respond(ctx, text, extra, edit) {
  if (edit) {
    try {
      return await ctx.editMessageText(text, { ...HTML, ...extra });
    } catch (e) {
      if (String(e.message).includes('message is not modified')) return null;
    }
  }
  return ctx.reply(text, { ...HTML, ...extra });
}

/* ---------------------------- Middleware ---------------------------- */

async function loadUser(ctx, next) {
  if (!ctx.from || ctx.from.is_bot) return next();
  if (ctx.chat && ctx.chat.type !== 'private') return undefined;
  const user = await User.syncFromTelegram(ctx.from);
  if (user.isBlocked) {
    if (ctx.callbackQuery) return ctx.answerCbQuery('⛔ Hisobingiz bloklangan', { show_alert: true });
    return ctx.reply('⛔ Hisobingiz administrator tomonidan bloklangan.');
  }
  ctx.state.user = user;
  return next();
}

/* ---------------------------- Buyruqlar ---------------------------- */

async function start(ctx) {
  const user = ctx.state.user;
  const text = [
    `Assalomu alaykum, <b>${escapeHtml(user.firstName)}</b>! 👋`,
    '',
    'Men — <b>Hisobchi</b>, sizning shaxsiy buxgalteringizman 📒',
    '',
    'Men bilan siz:',
    "🌳 <b>Bog'dorchilik</b>, 🐄 <b>chorvachilik</b>, 💼 <b>tadbirkorlik</b> va ✈️ <b>chet eldan keladigan pullar</b>ni alohida-alohida hisoblaysiz;",
    "💸 Yem-xashak, o'g'it, dori, investitsiya kabi barcha harajatlarni yozib borasiz;",
    "📊 Har bir yo'nalish va umumiy sof foydani real vaqtda ko'rasiz;",
    '🎯 Oylik reja tuzasiz, 🤝 qarz daftarini yuritasiz;',
    '📥 Excel hisobot olasiz.',
    '',
    '⚡ <b>Tezkor yozish</b> — shunchaki menga yozing:',
    '<code>-500000 yem</code> — harajat',
    '<code>+2mln sut</code> — daromad',
    "<code>+300$ o'tkazma</code> — chet eldan pul",
    '',
    hasWebApp()
      ? "Boshlash uchun <b>«📱 Hisobchini ochish»</b> tugmasini bosing 👇"
      : "ℹ️ Mini App hali ulanmagan (.env dagi WEBAPP_URL https bo'lishi kerak). Hozircha bot orqali ishlashingiz mumkin 👇",
  ].join('\n');
  await ctx.reply(text, { ...HTML, ...mainKeyboard(user) });
  if (hasWebApp()) {
    await ctx.reply('👇 Ilovani shu tugma orqali oching:', notify.openAppButton('📱 Hisobchini ochish'));
  }
}

async function openApp(ctx) {
  if (!hasWebApp()) {
    return ctx.reply("Mini App hali ulanmagan. Administrator .env faylida WEBAPP_URL ni (https) to'ldirishi kerak.");
  }
  return ctx.reply('Ilovani ochish uchun tugmani bosing 👇', notify.openAppButton('📱 Hisobchini ochish'));
}

async function help(ctx) {
  const text = [
    '❓ <b>Yordam</b>',
    '',
    '<b>Tezkor yozish</b> (botga oddiy xabar):',
    '<code>-500000 yem</code> → harajat, Yem-xashak',
    "<code>-1.2mln o'g'it 20 qop</code> → harajat, O'g'it, 20 qop",
    '<code>+2mln sut</code> → daromad, Sut sotuvi',
    "<code>+300$ o'tkazma</code> → daromad, dollarda (kurs bo'yicha so'mga o'giriladi)",
    '<code>150 000 benzin</code> → ishorasiz ham tushunadi (harajat)',
    "<code>3mln mol</code> → bot sotdingizmi yoki oldingizmi — so'raydi",
    '',
    '<b>Qisqartmalar:</b> <code>k</code>/<code>ming</code> = 1 000, <code>mln</code> = 1 000 000',
    "<b>Valyutalar:</b> <code>$</code>, <code>€</code>, <code>rubl</code>, <code>tenge</code>",
    '',
    '<b>Buyruqlar:</b>',
    '/balans — balans va sof foyda',
    "/hisobot — oylik hisobot (yo'nalishlar bo'yicha)",
    '/qarzlar — qarz daftari',
    '/excel — Excel hisobot',
    '/ilova — Mini App ni ochish',
    '',
    "Har kuni kechqurun bot sizga kunlik hisobot va qarz eslatmalarini yuboradi (ilovadagi Profil bo'limida o'chirish mumkin).",
  ].join('\n');
  return ctx.reply(text, { ...HTML, ...mainKeyboard(ctx.state.user) });
}

async function contact(ctx) {
  const c = ctx.message.contact;
  if (c.user_id && c.user_id !== ctx.from.id) return ctx.reply("Iltimos, o'zingizning raqamingizni yuboring.");
  const phone = String(c.phone_number).startsWith('+') ? c.phone_number : `+${c.phone_number}`;
  const user = await User.update(ctx.state.user.id, { phone });
  return ctx.reply(`✅ Raqamingiz saqlandi: ${phone}`, mainKeyboard(user));
}

async function balance(ctx) {
  const user = ctx.state.user;
  const range = getRange('month');
  const [summary, debts] = await Promise.all([report.getSummary(user.id, range), report.getDebtSummary(user.id)]);
  const t = summary.totals;
  const lines = [
    `💰 <b>Balans</b> — ${range.label}`,
    '',
    `↗️ Daromad: ${money(t.income)}${changeText(summary.change && summary.change.income)}`,
    `↘️ Harajat: ${money(t.expense)}${changeText(summary.change && summary.change.expense)}`,
    `📈 Sof foyda: <b>${signedMoney(t.net)}</b>`,
    '',
    `🗂 Butun davr sof foydasi: <b>${signedMoney(summary.allTime.net)}</b>`,
  ];
  if (debts.openCount) {
    lines.push('');
    if (debts.owedToMe) lines.push(`🟢 Sizga qarzdorlar: ${money(debts.owedToMe)}`);
    if (debts.iOwe) lines.push(`🔴 Sizning qarzlaringiz: ${money(debts.iOwe)}`);
  }
  return ctx.reply(lines.join('\n'), { ...HTML, ...notify.openAppButton('📊 Batafsil') });
}

async function monthlyReport(ctx) {
  const user = ctx.state.user;
  const range = getRange('month');
  const stats = await report.getStats(user.id, range);
  const t = stats.totals;
  if (!t.count) {
    return ctx.reply(
      `📊 <b>${range.label}</b>\n\nBu oyda hali amal yozilmagan.\nMasalan, yozing: <code>-500000 yem</code>`,
      { ...HTML, ...notify.openAppButton() }
    );
  }
  const lines = [`📊 <b>${range.label} — oylik hisobot</b>`, ''];
  for (const s of stats.sectors.filter((x) => x.count > 0)) {
    lines.push(`${s.icon} <b>${escapeHtml(s.name)}</b>`);
    lines.push(`    ↗️ ${money(s.income)}  ·  ↘️ ${money(s.expense)}`);
    lines.push(`    = <b>${signedMoney(s.net)}</b>`);
  }
  lines.push('━━━━━━━━━━━━━━');
  lines.push(`↗️ Jami daromad: ${money(t.income)}`);
  lines.push(`↘️ Jami harajat: ${money(t.expense)}`);
  lines.push(`📈 <b>Sof foyda: ${signedMoney(t.net)}</b>`);

  const top = stats.categories.EXPENSE.slice(0, 3);
  if (top.length) {
    lines.push('', '🔝 <b>Eng katta harajatlar:</b>');
    top.forEach((c, i) => lines.push(`${i + 1}. ${c.icon} ${escapeHtml(c.name)} — ${money(c.amount)} (${c.share}%)`));
  }
  const insights = stats.insights.filter((x) => x.tone !== 'neutral').slice(0, 2);
  if (insights.length) {
    lines.push('', '💡 <b>Xulosa:</b>');
    insights.forEach((x) => lines.push(`• ${escapeHtml(x.text)}`));
  }
  return ctx.reply(lines.join('\n'), { ...HTML, ...notify.openAppButton('📊 Grafiklarni ko\'rish') });
}

async function debts(ctx) {
  const user = ctx.state.user;
  const [items, summary] = await Promise.all([Debt.listOpen(user.id), report.getDebtSummary(user.id)]);
  if (!items.length) {
    return ctx.reply("🤝 <b>Qarz daftari</b>\n\nHozircha ochiq qarzlar yo'q ✅", { ...HTML, ...notify.openAppButton() });
  }
  const now = Date.now();
  const line = (d) => {
    const left = toNumber(d.amount) - toNumber(d.paidAmount);
    const due = d.dueDate
      ? ` · ${new Date(d.dueDate).getTime() < now ? '🔴' : '🗓'} ${formatDate(d.dueDate, { withYear: false })}`
      : '';
    return `• ${escapeHtml(d.person)} — <b>${money(left, d.currency)}</b>${due}`;
  };
  const owed = items.filter((d) => d.direction === 'OWED_TO_ME');
  const mine = items.filter((d) => d.direction === 'I_OWE');
  const lines = ['🤝 <b>Qarz daftari</b>', ''];
  if (owed.length) {
    lines.push(`🟢 <b>Sizga qarzdorlar:</b> ${money(summary.owedToMe)}`);
    owed.slice(0, 15).forEach((d) => lines.push(line(d)));
    lines.push('');
  }
  if (mine.length) {
    lines.push(`🔴 <b>Sizning qarzlaringiz:</b> ${money(summary.iOwe)}`);
    mine.slice(0, 15).forEach((d) => lines.push(line(d)));
  }
  return ctx.reply(lines.join('\n'), { ...HTML, ...notify.openAppButton('🤝 Qarzlarni boshqarish') });
}

async function excel(ctx) {
  return ctx.reply('📥 Qaysi davr uchun Excel hisobot kerak?', {
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🗓 Shu oy', 'xl:month'), Markup.button.callback("⏮ O'tgan oy", 'xl:prev')],
      [Markup.button.callback('📅 Shu yil', 'xl:year'), Markup.button.callback('🗂 Butun davr', 'xl:all')],
    ]),
  });
}

function previousMonthRange() {
  const now = localParts(new Date());
  const firstThis = new Date(Date.UTC(now.year, now.month, 1));
  const lastPrev = new Date(firstThis.getTime() - 86_400_000);
  const firstPrev = new Date(Date.UTC(lastPrev.getUTCFullYear(), lastPrev.getUTCMonth(), 1));
  const iso = (d) => d.toISOString().slice(0, 10);
  const range = getRange('custom', iso(firstPrev), iso(lastPrev));
  range.label = "O'tgan oy";
  return range;
}

async function onExcelPeriod(ctx) {
  const period = ctx.match[1];
  await ctx.answerCbQuery('⏳ Hisobot tayyorlanmoqda...');
  await ctx.sendChatAction('upload_document').catch(() => {});
  const range = period === 'prev' ? previousMonthRange() : getRange(period);
  const { buffer, filename, count } = await buildUserReport(ctx.state.user, range);
  await ctx.replyWithDocument(
    { source: buffer, filename },
    { caption: `📥 <b>Excel hisobot</b>\n🗓 ${range.label}\n🧾 ${count} ta amal`, parse_mode: 'HTML' }
  );
  await ctx.deleteMessage().catch(() => {});
}

/* ---------------------------- Tezkor yozish ---------------------------- */

const pending = new Map();
const PENDING_TTL = 30 * 60 * 1000;

function putPending(data) {
  const now = Date.now();
  for (const [key, value] of pending) if (now - value.at > PENDING_TTL) pending.delete(key);
  let id;
  do id = Math.random().toString(36).slice(2, 8);
  while (pending.has(id));
  pending.set(id, { ...data, at: now });
  return id;
}

function getPending(id, userId) {
  const p = pending.get(id);
  if (!p || p.userId !== userId || Date.now() - p.at > PENDING_TTL) return null;
  return p;
}

function preview(p) {
  const lines = [`💵 <b>${money(p.amount, p.currency)}</b>${p.note ? ` — ${escapeHtml(p.note)}` : ''}`];
  if (p.type) lines.push(p.type === 'INCOME' ? '💰 Daromad' : '💸 Harajat');
  return lines.join('\n');
}

const cancelButton = (pid) => Markup.button.callback('✖️ Bekor qilish', `qx:${pid}`);

async function askType(ctx, pid, p, edit = false) {
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback('💰 Daromad', `qt:${pid}:I`), Markup.button.callback('💸 Harajat', `qt:${pid}:E`)],
    [cancelButton(pid)],
  ]);
  return respond(ctx, `${preview(p)}\n\nBu <b>daromad</b>mi yoki <b>harajat</b>?`, kb, edit);
}

async function askSector(ctx, pid, p, edit = false) {
  const sectors = (await Sector.listAll()).filter((s) => s.isActive);
  const rows = chunk(
    sectors.map((s) => Markup.button.callback(`${s.icon} ${s.name}`, `qs:${pid}:${s.id}`)),
    2
  );
  rows.push([cancelButton(pid)]);
  return respond(ctx, `${preview(p)}\n\nQaysi <b>yo'nalish</b>ga tegishli?`, Markup.inlineKeyboard(rows), edit);
}

async function askCategory(ctx, pid, p, edit = true) {
  const categories = (await Category.listActiveCached()).filter((c) => c.sectorId === p.sectorId && c.type === p.type);
  const rows = chunk(
    categories.map((c) => Markup.button.callback(`${c.icon} ${c.name}`, `qc:${pid}:${c.id}`)),
    2
  );
  rows.push([Markup.button.callback('📁 Kategoriyasiz', `qc:${pid}:0`)]);
  rows.push([Markup.button.callback('⬅️ Orqaga', `qb:${pid}`), cancelButton(pid)]);
  return respond(ctx, `${preview(p)}\n\n<b>Kategoriya</b>ni tanlang:`, Markup.inlineKeyboard(rows), edit);
}

async function saveQuick(ctx, d, edit = false) {
  const user = ctx.state.user;
  const tx = await txService.createTransaction(user.id, {
    type: d.type,
    sectorId: d.sectorId,
    categoryId: d.categoryId || null,
    amount: d.amount,
    currency: d.currency,
    quantity: d.quantity,
    unit: d.unit,
    note: d.note,
  });
  const [month, warning] = await Promise.all([
    notify.monthSectorNet(user.id, tx.sectorId),
    tx.type === 'EXPENSE' ? report.budgetWarning(user.id, tx.sectorId) : Promise.resolve(null),
  ]);
  const lines = [
    `✅ <b>${tx.type === 'INCOME' ? 'Daromad' : 'Harajat'} yozildi</b>`,
    '',
    notify.describeTransaction(tx),
    '',
    `📊 Shu oy «${escapeHtml(tx.sector.name)}»: sof ${signedMoney(month.net)}`,
  ];
  if (warning) lines.push('', warning);
  const kb = Markup.inlineKeyboard([[Markup.button.callback('↩️ Bekor qilish', `undo:${tx.id}`)]]);
  return respond(ctx, lines.join('\n'), kb, edit);
}

async function onText(ctx) {
  const text = ctx.message.text.trim();
  if (text.startsWith('/')) return help(ctx);

  const parsed = parseQuickEntry(text);
  if (!parsed) {
    return ctx.reply(
      [
        '🤔 Tushunmadim. Amalni shunday yozing:',
        '<code>-500000 yem</code> — harajat',
        '<code>+2mln sut</code> — daromad',
        '',
        "Yoki pastdagi tugmalardan foydalaning 👇",
      ].join('\n'),
      { ...HTML, ...mainKeyboard(ctx.state.user) }
    );
  }

  const categories = await Category.listActiveCached();
  const { category } = matchCategory(categories, parsed.note, parsed.type);
  if (category) {
    return saveQuick(ctx, {
      ...parsed,
      type: parsed.type || category.type,
      sectorId: category.sectorId,
      categoryId: category.id,
    });
  }

  const pid = putPending({ userId: ctx.state.user.id, ...parsed });
  return parsed.type ? askSector(ctx, pid, parsed) : askType(ctx, pid, parsed);
}

async function expired(ctx) {
  await ctx.answerCbQuery("⌛ So'rov eskirgan. Amalni qaytadan yozing.", { show_alert: true });
  return ctx.editMessageReplyMarkup(undefined).catch(() => {});
}

async function onQuickType(ctx) {
  const [, pid, t] = ctx.match;
  const p = getPending(pid, ctx.state.user.id);
  if (!p) return expired(ctx);
  await ctx.answerCbQuery();
  p.type = t === 'I' ? 'INCOME' : 'EXPENSE';
  const { category } = matchCategory(await Category.listActiveCached(), p.note, p.type);
  if (category) {
    pending.delete(pid);
    return saveQuick(ctx, { ...p, sectorId: category.sectorId, categoryId: category.id }, true);
  }
  return askSector(ctx, pid, p, true);
}

async function onQuickSector(ctx) {
  const [, pid, sectorId] = ctx.match;
  const p = getPending(pid, ctx.state.user.id);
  if (!p) return expired(ctx);
  await ctx.answerCbQuery();
  p.sectorId = Number(sectorId);
  return askCategory(ctx, pid, p, true);
}

async function onQuickCategory(ctx) {
  const [, pid, categoryId] = ctx.match;
  const p = getPending(pid, ctx.state.user.id);
  if (!p || !p.sectorId) return expired(ctx);
  await ctx.answerCbQuery('✅ Saqlanmoqda...');
  pending.delete(pid);
  return saveQuick(ctx, { ...p, categoryId: Number(categoryId) || null }, true);
}

async function onQuickBack(ctx) {
  const [, pid] = ctx.match;
  const p = getPending(pid, ctx.state.user.id);
  if (!p) return expired(ctx);
  await ctx.answerCbQuery();
  return askSector(ctx, pid, p, true);
}

async function onQuickCancel(ctx) {
  pending.delete(ctx.match[1]);
  await ctx.answerCbQuery('Bekor qilindi');
  return respond(ctx, '✖️ Bekor qilindi.', {}, true);
}

async function onUndo(ctx) {
  const id = Number(ctx.match[1]);
  const tx = await Transaction.findForUser(id, ctx.state.user.id);
  if (!tx) {
    await ctx.answerCbQuery("Bu amal allaqachon o'chirilgan");
    return ctx.editMessageReplyMarkup(undefined).catch(() => {});
  }
  if (Date.now() - new Date(tx.createdAt).getTime() > 24 * 3600 * 1000) {
    return ctx.answerCbQuery("24 soatdan oshgan. Ilova orqali o'chiring.", { show_alert: true });
  }
  await Transaction.delete(id);
  await ctx.answerCbQuery('↩️ Bekor qilindi');
  return respond(
    ctx,
    `↩️ <s>${tx.type === 'INCOME' ? '+' : '−'}${money(tx.amount)}</s> — ${escapeHtml(tx.category ? tx.category.name : tx.sector.name)}\nAmal bekor qilindi.`,
    {},
    true
  );
}

/* ---------------------------- Xatolar ---------------------------- */

function onError(err, ctx) {
  const known = err instanceof HttpError;
  if (!known) console.error('🤖 Bot xatosi:', err);
  const msg = known ? err.message : "Xatolik yuz berdi, qaytadan urinib ko'ring.";
  if (ctx && ctx.callbackQuery) return ctx.answerCbQuery(msg, { show_alert: true }).catch(() => {});
  if (ctx && ctx.chat) return ctx.reply(`⚠️ ${msg}`).catch(() => {});
  return undefined;
}

module.exports = {
  BUTTONS,
  loadUser,
  start,
  openApp,
  help,
  contact,
  balance,
  monthlyReport,
  debts,
  excel,
  onExcelPeriod,
  onText,
  onQuickType,
  onQuickSector,
  onQuickCategory,
  onQuickBack,
  onQuickCancel,
  onUndo,
  onError,
};
