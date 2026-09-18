/**
 * Boshlang'ich ma'lumotlar: yo'nalishlar, kategoriyalar va valyuta kurslari.
 * Qayta ishga tushirilsa ham takrorlanmaydi (upsert).
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SECTORS = [
  {
    slug: 'bogdorchilik',
    name: "Bog'dorchilik",
    icon: '🌳',
    color: '#16A34A',
    income: [
      ['Meva sotuvi', '🍎', 'kg'],
      ['Sabzavot sotuvi', '🥕', 'kg'],
      ["Ko'chat sotuvi", '🌱', 'dona'],
      ['Quruq meva sotuvi', '🥜', 'kg'],
      ['Ulgurji savdo', '🚚', 'kg'],
    ],
    expense: [
      ["O'g'it", '🧪', 'kg'],
      ['Dori (pestitsid)', '🧴', 'litr'],
      ["Sug'orish / suv", '💧', null],
      ["Ko'chat xaridi", '🌱', 'dona'],
      ['Ishchi haqi', '👷', 'kun'],
      ["Texnika va yoqilg'i", '⛽', 'litr'],
      ['Qadoqlash va tashish', '📦', null],
      ['Yer ijarasi', '🗺️', null],
    ],
  },
  {
    slug: 'chorvachilik',
    name: 'Chorvachilik',
    icon: '🐄',
    color: '#D97706',
    income: [
      ['Sut sotuvi', '🥛', 'litr'],
      ["Go'sht sotuvi", '🥩', 'kg'],
      ['Mol sotuvi', '🐂', 'bosh'],
      ["Qo'y-echki sotuvi", '🐑', 'bosh'],
      ['Tuxum sotuvi', '🥚', 'dona'],
      ['Jun va teri sotuvi', '🧶', 'kg'],
    ],
    expense: [
      ['Yem-xashak', '🌾', 'kg'],
      ['Omuxta yem', '🥣', 'kg'],
      ['Veterinariya va dori', '💉', null],
      ['Mol xaridi', '🐂', 'bosh'],
      ["Ferma ta'miri", '🔧', null],
      ["Cho'pon / ishchi haqi", '👷', 'kun'],
      ['Suv va elektr', '⚡', null],
    ],
  },
  {
    slug: 'tadbirkorlik',
    name: 'Tadbirkorlik',
    icon: '💼',
    color: '#2563EB',
    income: [
      ['Savdo tushumi', '🧾', null],
      ["Xizmat ko'rsatish", '🛠️', null],
      ['Ijara daromadi', '🏠', null],
      ["Shartnoma to'lovi", '📄', null],
      ['Investitsiya foydasi', '📈', null],
    ],
    expense: [
      ['Investitsiya', '📈', null],
      ['Tovar xaridi', '📦', null],
      ["Ijara to'lovi", '🏢', null],
      ['Soliq va yig\'imlar', '🏛️', null],
      ['Xodimlar maoshi', '👥', null],
      ['Reklama', '📣', null],
      ['Transport', '🚚', null],
      ['Kommunal xizmatlar', '💡', null],
      ['Asbob-uskuna', '🖥️', 'dona'],
    ],
  },
  {
    slug: 'chet-el',
    name: 'Chet el puli',
    icon: '✈️',
    color: '#7C3AED',
    income: [
      ["Chet eldan pul o'tkazmasi", '💸', null],
      ['Chet el ish haqi', '🌍', null],
      ['Valyuta sotuvi', '💵', null],
    ],
    expense: [
      ["O'tkazma komissiyasi", '🏦', null],
      ['Valyuta xaridi', '💱', null],
      ["Yo'l harajati (chiptalar)", '🎫', null],
      ['Hujjatlar va viza', '🛂', null],
    ],
  },
  {
    slug: 'boshqa',
    name: 'Boshqa',
    icon: '📦',
    color: '#64748B',
    income: [
      ["Sovg'a / yordam", '🎁', null],
      ['Boshqa daromad', '➕', null],
    ],
    expense: [
      ['Oilaviy harajat', '🏡', null],
      ["To'y-marosim", '🎉', null],
      ["Sog'liq", '🏥', null],
      ["Ta'lim", '🎓', null],
      ['Boshqa harajat', '➖', null],
    ],
  },
];

const RATES = [
  { code: 'UZS', name: "O'zbek so'mi", symbol: "so'm", rate: 1 },
  { code: 'USD', name: 'AQSh dollari', symbol: '$', rate: 12650 },
  { code: 'EUR', name: 'Yevro', symbol: '€', rate: 14300 },
  { code: 'RUB', name: 'Rossiya rubli', symbol: '₽', rate: 150 },
  { code: 'KZT', name: "Qozog'iston tengesi", symbol: '₸', rate: 24 },
];

async function main() {
  console.log("⏳ Boshlang'ich ma'lumotlar yozilmoqda...");

  for (let i = 0; i < SECTORS.length; i++) {
    const s = SECTORS[i];
    const sector = await prisma.sector.upsert({
      where: { slug: s.slug },
      update: {},
      create: { slug: s.slug, name: s.name, icon: s.icon, color: s.color, sortOrder: i },
    });

    const cats = [
      ...s.income.map(([name, icon, unit], idx) => ({ name, icon, unit, type: 'INCOME', sortOrder: idx })),
      ...s.expense.map(([name, icon, unit], idx) => ({ name, icon, unit, type: 'EXPENSE', sortOrder: idx })),
    ];

    for (const c of cats) {
      await prisma.category.upsert({
        where: { sectorId_name_type: { sectorId: sector.id, name: c.name, type: c.type } },
        update: {},
        create: { ...c, sectorId: sector.id },
      });
    }
    console.log(`  ✅ ${s.icon} ${s.name}: ${cats.length} ta kategoriya`);
  }

  for (const r of RATES) {
    await prisma.exchangeRate.upsert({
      where: { code: r.code },
      update: {},
      create: r,
    });
  }
  console.log(`  ✅ ${RATES.length} ta valyuta kursi`);

  console.log('🎉 Tayyor! Baza to\'ldirildi.');
}

main()
  .catch((e) => {
    console.error('❌ Seed xatosi:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
