# 📒 Hisobchi — moliyaviy hisob-kitob boti

Bog'dorchilik, chorvachilik, tadbirkorlik va chet eldan keladigan pullar bo'yicha daromad va harajatlarni
alohida-alohida hisoblaydigan Telegram bot + Mini App + Admin Panel.

- Bot: **@hisobchi_mini_bot**
- Mini App: https://hisobchi-mini-app.vercel.app
- Admin Panel: https://hisobchi-admin-three.vercel.app
- Backend (API + bot): https://hisobchi-mini-bot-api.onrender.com — joylash qo'llanmasi: [DEPLOY.md](DEPLOY.md)

## Imkoniyatlar

- **Bot:** tezkor yozish (`-500000 yem`, `+2mln sut`, `+300$ o'tkazma`), balans, oylik hisobot, qarzlar,
  Excel hisobot, har kuni 21:00 da kunlik hisobot va qarz eslatmalari, oylik reja chegarasidan oshganda ogohlantirish.
- **Mini App:** tanishuv slaydlari, bosh sahifa (sof foyda va yo'nalishlar kesimida), grafikli hisobot va xulosalar,
  oylik reja, qarz daftari, amallar tarixi, profil. USD/EUR/RUB/KZT Markaziy bank kursi bo'yicha so'mga o'giriladi.
- **Admin Panel:** real vaqtdagi statistika, barcha amallar (filtr va Excel), foydalanuvchilar (bloklash),
  yo'nalish va kategoriyalar, valyuta kurslari, hammaga xabar yuborish.

## Texnologiyalar

Node.js · Express · Telegraf · Prisma · PostgreSQL (Neon) · React · Vite · ngrok

```
├── src/            # Backend: API + Telegram bot
├── prisma/         # Baza sxemasi va boshlang'ich ma'lumotlar
├── mini-app/       # Mijozlar uchun Telegram Mini App (React)
├── admin-panel/    # Ma'murlar uchun Admin Panel (React)
├── scripts/dev.js  # Hammasini (ngrok bilan) ishga tushiruvchi skript
└── start.bat       # Windows'da ikki marta bosib ishga tushirish
```

## O'rnatish (birinchi marta)

Talablar: [Node.js](https://nodejs.org) 18.18+, [Neon](https://neon.tech) bazasi,
[BotFather](https://t.me/BotFather) tokeni, [ngrok](https://ngrok.com) akkaunti.

1. Repozitoriyni yuklab oling:

```bash
git clone https://github.com/jahongirovabdullox0-source/hisobchi_mini_bot.git
```

2. `.env.example` faylidan nusxa olib, nomini `.env` qiling va qiymatlarni to'ldiring.
3. Paketlarni o'rnating, bazada jadvallarni yarating va boshlang'ich ma'lumotlarni yozing:

```bash
npm run setup
```

## Ishga tushirish

Loyiha papkasidagi **`start.bat`** faylini ikki marta bosing. U o'zi:

1. Mini App'ni yig'adi,
2. ngrok tunnelini ochadi va manzilni `.env` ga yozadi,
3. bot, API, Mini App va Admin Panelni ishga tushiradi.

To'xtatish uchun oynani yoping (yoki `Ctrl+C`). Bot faqat shu oyna ochiq turganda ishlaydi.

Terminal orqali ham bo'ladi:

```bash
npm run dev
```

## `.env` sozlamalari

| Kalit | Ma'nosi |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Neon PostgreSQL manzillari (pooler va to'g'ridan-to'g'ri) |
| `BOT_TOKEN` | BotFather bergan token |
| `NGROK_AUTHTOKEN` | ngrok authtoken |
| `NGROK_DOMAIN` | ngrok doimiy domeni |
| `WEBAPP_URL` | Mini App manzili (avtomatik yoziladi) |
| `ADMIN_PASSWORD` | Admin Panel paroli |
| `DAILY_REPORT_CRON` | Kunlik hisobot vaqti (standart: har kuni 21:00) |

## Foydali buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Hammasini ishga tushirish (ngrok bilan) |
| `npm run setup` | Paketlar + bazada jadvallar + boshlang'ich ma'lumotlar |
| `npm run db:studio` | Bazani brauzerda ko'rish (Prisma Studio) |

## Botda tezkor yozish

```
-500000 yem            → harajat, Yem-xashak
-1.2mln o'g'it 20 qop  → harajat, O'g'it, 20 qop
+2mln sut              → daromad, Sut sotuvi
+300$ o'tkazma         → daromad, dollarda (Markaziy bank kursi bo'yicha so'mga)
```

## Eslatmalar

- `.env` faylida parollar va tokenlar bor — u Git'ga yuklanmaydi (`.gitignore`).
- ngrok bepul tarifida Mini App birinchi marta ochilganda ogohlantirish sahifasi chiqadi — **Visit Site** ni bir marta bosing.
- Admin Panel va test rejimi faqat shu kompyuterdan ishlaydi (ngrok orqali tashqaridan yopiq).
