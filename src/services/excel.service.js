const ExcelJS = require('exceljs');
const { toNumber, TZ_OFFSET_MS, formatDate } = require('../utils/format');

const MONEY_FMT = '#,##0';
const RATE_FMT = '#,##0.####';
const DATE_FMT = 'dd.mm.yyyy hh:mm';
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
const GREEN = { argb: 'FF16A34A' };
const RED = { argb: 'FFE11D48' };
const GRAY = { argb: 'FF6B7280' };

/** Excel uchun Toshkent vaqti */
const excelDate = (d) => new Date(new Date(d).getTime() + TZ_OFFSET_MS);

function safeSheetName(name, used) {
  let base = String(name || 'Varaq').replace(/[\\/*?:[\]]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 28) || 'Varaq';
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) candidate = `${base.slice(0, 26)} ${i++}`;
  used.add(candidate.toLowerCase());
  return candidate;
}

function styleHeader(row) {
  row.font = { bold: true };
  row.alignment = { vertical: 'middle' };
  row.height = 22;
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
  });
}

function addTitle(ws, title, subtitle, lastCol) {
  ws.mergeCells(`A1:${lastCol}1`);
  ws.getCell('A1').value = title;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.mergeCells(`A2:${lastCol}2`);
  ws.getCell('A2').value = subtitle;
  ws.getCell('A2').font = { color: GRAY };
}

/** Kirim/chiqim daftari varag'i */
function addLedgerSheet(wb, name, title, subtitle, transactions, { withUser = false, withSector = true } = {}) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 4 }] });
  const columns = [
    { header: 'Sana', key: 'date', width: 18 },
    ...(withUser ? [{ header: 'Foydalanuvchi', key: 'user', width: 22 }] : []),
    ...(withSector ? [{ header: "Yo'nalish", key: 'sector', width: 18 }] : []),
    { header: 'Kategoriya', key: 'category', width: 26 },
    { header: "Kirim (so'm)", key: 'income', width: 16 },
    { header: "Chiqim (so'm)", key: 'expense', width: 16 },
    { header: 'Asl summa', key: 'raw', width: 14 },
    { header: 'Valyuta', key: 'currency', width: 9 },
    { header: 'Kurs', key: 'rate', width: 11 },
    { header: 'Miqdor', key: 'qty', width: 12 },
    { header: 'Izoh', key: 'note', width: 36 },
  ];
  ws.columns = columns.map(({ key, width }) => ({ key, width }));
  const lastCol = ws.getColumn(columns.length).letter;
  addTitle(ws, title, subtitle, lastCol);

  const headerRow = ws.getRow(4);
  headerRow.values = columns.map((c) => c.header);
  styleHeader(headerRow);

  const firstDataRow = 5;
  for (const t of transactions) {
    const amount = toNumber(t.amount);
    const row = ws.addRow({
      date: excelDate(t.occurredAt),
      user: t.user ? [t.user.firstName, t.user.lastName].filter(Boolean).join(' ') : '',
      sector: t.sector ? t.sector.name : '',
      category: t.category ? t.category.name : 'Kategoriyasiz',
      income: t.type === 'INCOME' ? amount : null,
      expense: t.type === 'EXPENSE' ? amount : null,
      raw: toNumber(t.rawAmount),
      currency: t.currency,
      rate: toNumber(t.rate),
      qty: t.quantity ? `${toNumber(t.quantity)} ${t.unit || ''}`.trim() : '',
      note: t.note || '',
    });
    row.getCell('date').numFmt = DATE_FMT;
    row.getCell('income').numFmt = MONEY_FMT;
    row.getCell('income').font = { color: GREEN };
    row.getCell('expense').numFmt = MONEY_FMT;
    row.getCell('expense').font = { color: RED };
    row.getCell('raw').numFmt = RATE_FMT;
    row.getCell('rate').numFmt = RATE_FMT;
  }

  const lastDataRow = ws.lastRow.number;
  const incomeCol = ws.getColumn('income').letter;
  const expenseCol = ws.getColumn('expense').letter;
  const incomeSum = transactions.filter((t) => t.type === 'INCOME').reduce((a, t) => a + toNumber(t.amount), 0);
  const expenseSum = transactions.filter((t) => t.type === 'EXPENSE').reduce((a, t) => a + toNumber(t.amount), 0);
  const hasData = lastDataRow >= firstDataRow && transactions.length > 0;

  ws.addRow({});
  const totalRow = ws.addRow({});
  totalRow.getCell(1).value = 'JAMI';
  totalRow.getCell('income').value = hasData
    ? { formula: `SUM(${incomeCol}${firstDataRow}:${incomeCol}${lastDataRow})`, result: incomeSum }
    : 0;
  totalRow.getCell('expense').value = hasData
    ? { formula: `SUM(${expenseCol}${firstDataRow}:${expenseCol}${lastDataRow})`, result: expenseSum }
    : 0;
  const netRow = ws.addRow({});
  netRow.getCell(1).value = 'SOF FOYDA';
  netRow.getCell('income').value = {
    formula: `${incomeCol}${totalRow.number}-${expenseCol}${totalRow.number}`,
    result: incomeSum - expenseSum,
  };
  for (const r of [totalRow, netRow]) {
    r.font = { bold: true };
    r.eachCell({ includeEmpty: true }, (cell) => (cell.fill = TOTAL_FILL));
    r.getCell('income').numFmt = MONEY_FMT;
    r.getCell('expense').numFmt = MONEY_FMT;
  }
  netRow.getCell('income').font = { bold: true, color: incomeSum - expenseSum >= 0 ? GREEN : RED };
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };
  return ws;
}

/**
 * To'liq buxgalteriya hisoboti (.xlsx)
 * @returns {Promise<Buffer>}
 */
async function buildWorkbook({ title, periodLabel, transactions, debts = [], withUser = false }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hisobchi';
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true; // formulalar fayl ochilganda qayta hisoblanadi
  const used = new Set();
  const subtitle = `Davr: ${periodLabel} · Tuzilgan sana: ${formatDate(new Date(), { withTime: true })}`;

  /* 1. Umumiy varaq */
  const summary = wb.addWorksheet(safeSheetName('Umumiy', used), { views: [{ state: 'frozen', ySplit: 4 }] });
  summary.columns = [
    { key: 'sector', width: 28 },
    { key: 'income', width: 20 },
    { key: 'expense', width: 20 },
    { key: 'net', width: 20 },
    { key: 'margin', width: 16 },
    { key: 'count', width: 14 },
  ];
  addTitle(summary, title, subtitle, 'F');
  const sh = summary.getRow(4);
  sh.values = ["Yo'nalish", "Daromad (so'm)", "Harajat (so'm)", "Sof foyda (so'm)", 'Rentabellik', 'Amallar soni'];
  styleHeader(sh);

  const bySector = new Map();
  for (const t of transactions) {
    const key = t.sector ? t.sector.id : 0;
    if (!bySector.has(key)) bySector.set(key, { sector: t.sector, income: 0, expense: 0, count: 0, items: [] });
    const acc = bySector.get(key);
    if (t.type === 'INCOME') acc.income += toNumber(t.amount);
    else acc.expense += toNumber(t.amount);
    acc.count += 1;
    acc.items.push(t);
  }

  const sectorRows = [...bySector.values()];
  for (const s of sectorRows) {
    const net = s.income - s.expense;
    const row = summary.addRow({
      sector: s.sector ? `${s.sector.icon || ''} ${s.sector.name}`.trim() : 'Boshqa',
      income: s.income,
      expense: s.expense,
      net,
      margin: s.income ? net / s.income : 0,
      count: s.count,
    });
    row.getCell('income').numFmt = MONEY_FMT;
    row.getCell('income').font = { color: GREEN };
    row.getCell('expense').numFmt = MONEY_FMT;
    row.getCell('expense').font = { color: RED };
    row.getCell('net').numFmt = MONEY_FMT;
    row.getCell('net').font = { bold: true, color: net >= 0 ? GREEN : RED };
    row.getCell('margin').numFmt = '0.0%';
  }
  const totalIncome = sectorRows.reduce((a, s) => a + s.income, 0);
  const totalExpense = sectorRows.reduce((a, s) => a + s.expense, 0);
  summary.addRow({});
  const tr = summary.addRow({
    sector: 'JAMI',
    income: totalIncome,
    expense: totalExpense,
    net: totalIncome - totalExpense,
    margin: totalIncome ? (totalIncome - totalExpense) / totalIncome : 0,
    count: transactions.length,
  });
  tr.font = { bold: true };
  tr.eachCell({ includeEmpty: true }, (cell) => (cell.fill = TOTAL_FILL));
  ['income', 'expense', 'net'].forEach((k) => (tr.getCell(k).numFmt = MONEY_FMT));
  tr.getCell('net').font = { bold: true, color: totalIncome - totalExpense >= 0 ? GREEN : RED };
  tr.getCell('margin').numFmt = '0.0%';

  /* 2. Kategoriyalar bo'yicha */
  const catSheet = wb.addWorksheet(safeSheetName("Kategoriyalar bo'yicha", used));
  catSheet.columns = [
    { key: 'sector', width: 20 },
    { key: 'category', width: 28 },
    { key: 'type', width: 12 },
    { key: 'amount', width: 20 },
    { key: 'share', width: 12 },
    { key: 'count', width: 12 },
  ];
  addTitle(catSheet, "Kategoriyalar bo'yicha taqsimot", subtitle, 'F');
  const ch = catSheet.getRow(4);
  ch.values = ["Yo'nalish", 'Kategoriya', 'Turi', "Summa (so'm)", 'Ulushi', 'Soni'];
  styleHeader(ch);
  const byCat = new Map();
  for (const t of transactions) {
    const key = `${t.type}:${t.sector ? t.sector.id : 0}:${t.category ? t.category.id : 0}`;
    if (!byCat.has(key)) {
      byCat.set(key, { sector: t.sector ? t.sector.name : '', category: t.category ? t.category.name : 'Kategoriyasiz', type: t.type, amount: 0, count: 0 });
    }
    const acc = byCat.get(key);
    acc.amount += toNumber(t.amount);
    acc.count += 1;
  }
  const catRows = [...byCat.values()].sort((a, b) => (a.type === b.type ? b.amount - a.amount : a.type === 'INCOME' ? -1 : 1));
  for (const c of catRows) {
    const total = c.type === 'INCOME' ? totalIncome : totalExpense;
    const row = catSheet.addRow({
      sector: c.sector,
      category: c.category,
      type: c.type === 'INCOME' ? 'Daromad' : 'Harajat',
      amount: c.amount,
      share: total ? c.amount / total : 0,
      count: c.count,
    });
    row.getCell('amount').numFmt = MONEY_FMT;
    row.getCell('amount').font = { color: c.type === 'INCOME' ? GREEN : RED };
    row.getCell('share').numFmt = '0.0%';
  }

  /* 3. Barcha amallar (kirim-chiqim daftari) */
  addLedgerSheet(wb, safeSheetName('Barcha amallar', used), 'Kirim-chiqim daftari', subtitle, transactions, { withUser });

  /* 4. Har bir yo'nalish alohida varaqda */
  for (const s of sectorRows) {
    if (!s.sector) continue;
    addLedgerSheet(
      wb,
      safeSheetName(s.sector.name, used),
      `${s.sector.icon || ''} ${s.sector.name}`.trim(),
      subtitle,
      s.items,
      { withUser, withSector: false }
    );
  }

  /* 5. Qarzlar */
  if (debts.length) {
    const ds = wb.addWorksheet(safeSheetName('Qarzlar', used));
    ds.columns = [
      { key: 'direction', width: 18 },
      { key: 'person', width: 24 },
      { key: 'phone', width: 16 },
      { key: 'amount', width: 16 },
      { key: 'paid', width: 16 },
      { key: 'left', width: 16 },
      { key: 'currency', width: 9 },
      { key: 'due', width: 14 },
      { key: 'status', width: 12 },
      { key: 'note', width: 30 },
    ];
    addTitle(ds, 'Qarz daftari', subtitle, 'J');
    const dh = ds.getRow(4);
    dh.values = ['Turi', 'Kim', 'Telefon', 'Summa', "To'langan", 'Qoldiq', 'Valyuta', 'Muddat', 'Holati', 'Izoh'];
    styleHeader(dh);
    for (const d of debts) {
      const amount = toNumber(d.amount);
      const paid = toNumber(d.paidAmount);
      const row = ds.addRow({
        direction: d.direction === 'OWED_TO_ME' ? 'Menga qarzdor' : 'Men qarzdorman',
        person: d.person,
        phone: d.phone || '',
        amount,
        paid,
        left: amount - paid,
        currency: d.currency,
        due: d.dueDate ? excelDate(d.dueDate) : '',
        status: d.isClosed ? 'Yopilgan' : 'Ochiq',
        note: d.note || '',
      });
      ['amount', 'paid', 'left'].forEach((k) => (row.getCell(k).numFmt = MONEY_FMT));
      if (d.dueDate) row.getCell('due').numFmt = 'dd.mm.yyyy';
      row.getCell('left').font = { bold: true, color: d.direction === 'OWED_TO_ME' ? GREEN : RED };
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

module.exports = { buildWorkbook };
