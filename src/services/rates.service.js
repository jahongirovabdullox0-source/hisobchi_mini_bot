const Rate = require('../models/Rate');

const CBU_URL = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/';
const CODES = {
  USD: { name: 'AQSh dollari', symbol: '$' },
  EUR: { name: 'Yevro', symbol: '€' },
  RUB: { name: 'Rossiya rubli', symbol: '₽' },
  KZT: { name: "Qozog'iston tengesi", symbol: '₸' },
};

/** O'zbekiston Markaziy banki (cbu.uz) rasmiy kurslarini oladi */
async function syncFromCbu() {
  const res = await fetch(CBU_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Markaziy bank javob bermadi (${res.status})`);
  const list = await res.json();
  if (!Array.isArray(list)) throw new Error("Markaziy bank ma'lumoti noto'g'ri formatda");

  const updated = [];
  for (const [code, extra] of Object.entries(CODES)) {
    const item = list.find((x) => x && x.Ccy === code);
    if (!item) continue;
    const rate = parseFloat(String(item.Rate).replace(',', '.'));
    const nominal = parseFloat(String(item.Nominal || '1').replace(',', '.')) || 1;
    if (!Number.isFinite(rate) || rate <= 0) continue;
    const perUnit = Math.round((rate / nominal) * 10_000) / 10_000;
    await Rate.upsert(code, perUnit, extra);
    updated.push({ code, rate: perUnit });
  }
  return updated;
}

/** Xatoni yutib yuboradigan xavfsiz variant */
async function syncSilently() {
  try {
    const updated = await syncFromCbu();
    if (updated.length) {
      console.log(`💱 Valyuta kurslari yangilandi: ${updated.map((u) => `${u.code}=${u.rate}`).join(', ')}`);
    }
    return updated;
  } catch (e) {
    console.warn(`💱 Kurslarni yangilab bo'lmadi: ${e.message}`);
    return [];
  }
}

module.exports = { syncFromCbu, syncSilently };
