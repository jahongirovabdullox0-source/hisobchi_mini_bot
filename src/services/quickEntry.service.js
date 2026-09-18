/**
 * Botga yozilgan oddiy matndan amalni tushunib oladi.
 *   "-500000 yem"         -> harajat, 500 000, Yem-xashak
 *   "+2mln sut"           -> daromad, 2 000 000, Sut sotuvi
 *   "+300$ perevod"       -> daromad, 300 USD, Chet eldan pul o'tkazmasi
 *   "-1.2 mln o'g'it 20 qop"
 */

const MULTIPLIERS = { mlrd: 1e9, mln: 1e6, million: 1e6, ming: 1e3, k: 1e3 };

const CURRENCY_PATTERNS = [
  [/\$|\busd\b|\bdollar\w*|доллар\w*/i, 'USD'],
  [/€|\beur\b|\byevro\w*|\bevro\w*|евро/i, 'EUR'],
  [/₽|\brub\b|\brubl\w*|рубл\w*/i, 'RUB'],
  [/₸|\bkzt\b|\btenge\w*|тенге/i, 'KZT'],
];

const UNIT_ALIASES = {
  kg: 'kg', kilo: 'kg', кг: 'kg',
  t: 'tonna', tonna: 'tonna', тонна: 'tonna',
  l: 'litr', litr: 'litr', литр: 'litr',
  dona: 'dona', ta: 'dona', шт: 'dona',
  bosh: 'bosh', qop: 'qop', meshok: 'qop',
  kun: 'kun', soat: 'soat', m: 'metr', metr: 'metr', gektar: 'gektar', ga: 'gektar', sotix: 'sotix',
};

const STOP_WORDS = new Set([
  'sotuvi', 'xaridi', 'haqi', 'boshqa', 'tolovi', 'daromad', 'daromadi', 'harajat', 'harajati',
  'uchun', 'puli', 'pul', 'xizmatlar', 'va', 'yoki', 'bilan', 'som', 'sum',
]);

/** Kalit so'z -> kategoriya nomlari (seed dagi nomlar bilan) */
const SYNONYMS = {
  yem: ['Yem-xashak'], xashak: ['Yem-xashak'], pichan: ['Yem-xashak'], somon: ['Yem-xashak'], beda: ['Yem-xashak'],
  arpa: ['Yem-xashak'], kepak: ['Yem-xashak'], shrot: ['Yem-xashak'], jmix: ['Yem-xashak'], makkajoxori: ['Yem-xashak'],
  omuxta: ['Omuxta yem'], kombikorm: ['Omuxta yem'],
  ogit: ["O'g'it"], selitra: ["O'g'it"], karbamid: ["O'g'it"], ammofos: ["O'g'it"], mochevina: ["O'g'it"], gung: ["O'g'it"],
  dori: ['Dori (pestitsid)', 'Veterinariya va dori'], pestitsid: ['Dori (pestitsid)'], purkash: ['Dori (pestitsid)'], zahar: ['Dori (pestitsid)'],
  vet: ['Veterinariya va dori'], veterinar: ['Veterinariya va dori'], emlash: ['Veterinariya va dori'], ukol: ['Veterinariya va dori'], vaksina: ['Veterinariya va dori'],
  sut: ['Sut sotuvi'], qatiq: ['Sut sotuvi'], gosht: ["Go'sht sotuvi"],
  mol: ['Mol sotuvi', 'Mol xaridi'], sigir: ['Mol sotuvi', 'Mol xaridi'], buqa: ['Mol sotuvi', 'Mol xaridi'], buzoq: ['Mol sotuvi', 'Mol xaridi'], tana: ['Mol sotuvi', 'Mol xaridi'],
  qoy: ["Qo'y-echki sotuvi"], echki: ["Qo'y-echki sotuvi"], qozi: ["Qo'y-echki sotuvi"],
  tuxum: ['Tuxum sotuvi'], jun: ['Jun va teri sotuvi'], teri: ['Jun va teri sotuvi'],
  meva: ['Meva sotuvi'], olma: ['Meva sotuvi'], uzum: ['Meva sotuvi'], orik: ['Meva sotuvi'], shaftoli: ['Meva sotuvi'],
  gilos: ['Meva sotuvi'], anor: ['Meva sotuvi'], nok: ['Meva sotuvi'], behi: ['Meva sotuvi'], olxori: ['Meva sotuvi'], limon: ['Meva sotuvi'],
  pomidor: ['Sabzavot sotuvi'], bodring: ['Sabzavot sotuvi'], kartoshka: ['Sabzavot sotuvi'], piyoz: ['Sabzavot sotuvi'], sabzi: ['Sabzavot sotuvi'], karam: ['Sabzavot sotuvi'],
  mayiz: ['Quruq meva sotuvi'], yongoq: ['Quruq meva sotuvi'], bodom: ['Quruq meva sotuvi'], turshak: ['Quruq meva sotuvi'],
  kochat: ["Ko'chat xaridi", "Ko'chat sotuvi"], nihol: ["Ko'chat xaridi", "Ko'chat sotuvi"],
  suv: ["Sug'orish / suv", 'Suv va elektr'], sugorish: ["Sug'orish / suv"], poliv: ["Sug'orish / suv"],
  ishchi: ['Ishchi haqi', "Cho'pon / ishchi haqi"], mardikor: ['Ishchi haqi'], chopon: ["Cho'pon / ishchi haqi"], podachi: ["Cho'pon / ishchi haqi"],
  benzin: ["Texnika va yoqilg'i", 'Transport'], solyarka: ["Texnika va yoqilg'i"], dizel: ["Texnika va yoqilg'i"], yoqilgi: ["Texnika va yoqilg'i"],
  traktor: ["Texnika va yoqilg'i"], texnika: ["Texnika va yoqilg'i"],
  quti: ['Qadoqlash va tashish'], yashik: ['Qadoqlash va tashish'], qadoq: ['Qadoqlash va tashish'],
  yer: ['Yer ijarasi'], ferma: ["Ferma ta'miri"], molxona: ["Ferma ta'miri"], remont: ["Ferma ta'miri"], tamir: ["Ferma ta'miri"],
  svet: ['Suv va elektr', 'Kommunal xizmatlar'], elektr: ['Suv va elektr', 'Kommunal xizmatlar'], gaz: ['Kommunal xizmatlar'], kommunal: ['Kommunal xizmatlar'],
  savdo: ['Savdo tushumi'], tushum: ['Savdo tushumi'], kassa: ['Savdo tushumi'], vyruchka: ['Savdo tushumi'],
  xizmat: ["Xizmat ko'rsatish"], usluga: ["Xizmat ko'rsatish"],
  ijara: ['Ijara daromadi', "Ijara to'lovi"], arenda: ['Ijara daromadi', "Ijara to'lovi"],
  shartnoma: ["Shartnoma to'lovi"], dogovor: ["Shartnoma to'lovi"],
  investitsiya: ['Investitsiya', 'Investitsiya foydasi'], invest: ['Investitsiya', 'Investitsiya foydasi'], dividend: ['Investitsiya foydasi'],
  tovar: ['Tovar xaridi'], mahsulot: ['Tovar xaridi'], zakup: ['Tovar xaridi'],
  soliq: ["Soliq va yig'imlar"], nalog: ["Soliq va yig'imlar"], jarima: ["Soliq va yig'imlar"],
  maosh: ['Xodimlar maoshi', 'Chet el ish haqi'], oylik: ['Xodimlar maoshi', 'Chet el ish haqi'], zarplata: ['Xodimlar maoshi', 'Chet el ish haqi'],
  reklama: ['Reklama'], target: ['Reklama'], transport: ['Transport'], taksi: ['Transport'], dostavka: ['Transport'],
  asbob: ['Asbob-uskuna'], uskuna: ['Asbob-uskuna'], kompyuter: ['Asbob-uskuna'],
  perevod: ["Chet eldan pul o'tkazmasi"], otkazma: ["Chet eldan pul o'tkazmasi", "O'tkazma komissiyasi"], transfer: ["Chet eldan pul o'tkazmasi"],
  zolotaya: ["Chet eldan pul o'tkazmasi"], korona: ["Chet eldan pul o'tkazmasi"], unistream: ["Chet eldan pul o'tkazmasi"], rossiya: ["Chet eldan pul o'tkazmasi"],
  komissiya: ["O'tkazma komissiyasi"], valyuta: ['Valyuta sotuvi', 'Valyuta xaridi'], dollar: ['Valyuta sotuvi', 'Valyuta xaridi'],
  bilet: ["Yo'l harajati (chiptalar)"], chipta: ["Yo'l harajati (chiptalar)"], samolyot: ["Yo'l harajati (chiptalar)"],
  viza: ['Hujjatlar va viza'], patent: ['Hujjatlar va viza'], pasport: ['Hujjatlar va viza'],
  sovga: ["Sovg'a / yordam"], yordam: ["Sovg'a / yordam"],
  oila: ['Oilaviy harajat'], bozor: ['Oilaviy harajat'], oziq: ['Oilaviy harajat'],
  toy: ["To'y-marosim"], marosim: ["To'y-marosim"], sogliq: ["Sog'liq"], dorixona: ["Sog'liq"], shifokor: ["Sog'liq"],
  talim: ["Ta'lim"], kontrakt: ["Ta'lim"], kurs: ["Ta'lim"],
};

/** Matnni so'zlarga ajratadi: apostroflar olib tashlanadi, kichik harflarga o'tkaziladi */
function words(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[‘’ʻʼ`´'"]/g, '')
    .split(/[^a-z0-9а-яёўқғҳ]+/i)
    .filter(Boolean);
}

function parseNumber(str, hasMultiplier) {
  let s = str.replace(/\s+/g, '');
  const seps = s.match(/[.,]/g) || [];
  if (seps.length > 1) {
    const last = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
    const tail = s.slice(last + 1);
    s = tail.length === 3 && !hasMultiplier ? s.replace(/[.,]/g, '') : `${s.slice(0, last).replace(/[.,]/g, '')}.${tail}`;
  } else if (seps.length === 1) {
    const [a, b] = s.split(/[.,]/);
    s = b.length === 3 && !hasMultiplier ? a + b : `${a}.${b || '0'}`;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * @returns {null | {type: 'INCOME'|'EXPENSE'|null, amount: number, currency: string, note: string|null, quantity: number|null, unit: string|null}}
 */
function parseQuickEntry(input) {
  let text = String(input || '').trim().replace(/[−–—]/g, '-');
  if (!text || text.startsWith('/')) return null;

  let currency = 'UZS';
  for (const [re, code] of CURRENCY_PATTERNS) {
    if (re.test(text)) {
      currency = code;
      text = text.replace(re, ' ');
      break;
    }
  }
  text = text.replace(/\s+/g, ' ').trim();

  const NUM = '(\\d(?:[\\d.,]|\\s(?=\\d))*)';
  const MULT = '(mlrd|mln|million|ming|k)?';
  // 1) Summa boshida: "-500 000 yem"
  let sign;
  let numStr;
  let multStr;
  let rest;
  let m = text.match(new RegExp(`^([+-])?\\s*${NUM}\\s*${MULT}(?=\\s|$)\\.?\\s*(.*)$`, 'i'));
  if (m) {
    [, sign, numStr, multStr, rest] = m;
  } else {
    // 2) Summa oxirida: "yem -500 000"
    m = text.match(new RegExp(`^(.+?)\\s+([+-])?\\s*${NUM}\\s*${MULT}\\.?$`, 'i'));
    if (!m) return null;
    [, rest, sign, numStr, multStr] = m;
  }

  const mult = multStr ? MULTIPLIERS[multStr.toLowerCase()] : 1;
  const base = parseNumber(numStr, Boolean(multStr));
  if (!Number.isFinite(base) || base <= 0) return null;
  const amount = Math.round(base * mult * 100) / 100;

  const note = (rest || '').replace(/\b(so['‘’ʻʼ`]?m|sum)\b|сум/gi, ' ').replace(/\s+/g, ' ').trim();

  let quantity = null;
  let unit = null;
  const qm = note.match(/(\d+(?:[.,]\d+)?)\s*([a-zа-я]+)(?![a-zа-я])/i);
  if (qm && UNIT_ALIASES[qm[2].toLowerCase()]) {
    quantity = Number(qm[1].replace(',', '.'));
    unit = UNIT_ALIASES[qm[2].toLowerCase()];
  }

  return {
    type: sign === '+' ? 'INCOME' : sign === '-' ? 'EXPENSE' : null,
    amount,
    currency,
    note: note || null,
    quantity: quantity && quantity > 0 ? quantity : null,
    unit,
  };
}

/** Qaysi yo'nalishga oidligini bildiruvchi so'zlar */
const SECTOR_HINTS = {
  chorvachilik: ['mol', 'sigir', 'buqa', 'buzoq', 'qoy', 'echki', 'tovuq', 'parranda', 'ferma', 'molxona', 'chorva', 'ot'],
  bogdorchilik: ['bog', 'daraxt', 'dala', 'ekin', 'olma', 'uzum', 'orik', 'gilos', 'issiqxona', 'teplitsa', 'hosil', 'tomorqa'],
  tadbirkorlik: ['dokon', 'biznes', 'firma', 'ofis', 'sex', 'korxona', 'mijoz', 'klient'],
  'chet-el': ['rossiya', 'moskva', 'koreya', 'turkiya', 'qozogiston', 'chet', 'migrant', 'perevod'],
};

function scoreCategory(category, noteWords) {
  let score = 0;
  const catWords = words(category.name).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  for (const nw of noteWords) {
    if (nw.length < 3 || STOP_WORDS.has(nw)) continue;
    for (const cw of catWords) {
      if (nw === cw) score += 3;
      else if (cw.startsWith(nw) || nw.startsWith(cw)) score += 2;
      else if (nw.length >= 4 && cw.length >= 4 && nw.slice(0, 4) === cw.slice(0, 4)) score += 1;
    }
    for (const [key, names] of Object.entries(SYNONYMS)) {
      if ((nw === key || (key.length >= 4 && nw.startsWith(key))) && names.includes(category.name)) score += 3;
    }
  }
  // Yo'nalishga ishora qiluvchi so'z bo'lsa — faqat mos kelgan kategoriyalar orasida ustunlik beradi
  const slug = category.sector && category.sector.slug;
  if (score > 0 && slug && SECTOR_HINTS[slug] && noteWords.some((w) => SECTOR_HINTS[slug].includes(w))) score += 1;
  return score;
}

/**
 * Kategoriyani topadi.
 * @returns {{category: object|null, ambiguousType: boolean}}
 */
function matchCategory(categories, note, type) {
  const noteWords = words(note);
  if (!noteWords.length) return { category: null, ambiguousType: false };
  const pool = type ? categories.filter((c) => c.type === type) : categories;

  let best = [];
  let bestScore = 0;
  for (const c of pool) {
    const s = scoreCategory(c, noteWords);
    if (s > bestScore) {
      bestScore = s;
      best = [c];
    } else if (s === bestScore && s > 0) {
      best.push(c);
    }
  }
  if (!bestScore) return { category: null, ambiguousType: false };
  const types = new Set(best.map((c) => c.type));
  if (types.size > 1) return { category: null, ambiguousType: true };
  return { category: best[0], ambiguousType: false };
}

module.exports = { parseQuickEntry, matchCategory, words };
