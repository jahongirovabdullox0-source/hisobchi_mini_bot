# 🚀 Hisobchi'ni internetga joylash

| Qism | Qayerda | Manzil |
|---|---|---|
| Mini App | Vercel | https://hisobchi-mini-app.vercel.app |
| Admin Panel | Vercel | https://hisobchi-admin-three.vercel.app |
| Backend (API + bot) | Render | https://hisobchi-mini-bot-api.onrender.com |

Frontendlar Vercel'da tayyor. Quyida backend'ni Render'ga joylash qo'llanmasi.

## 1. Render akkaunti

1. https://render.com saytiga kiring → **Get Started** → **GitHub** orqali kiring.
2. Render GitHub akkauntingizga kirish so'raydi — ruxsat bering. "Only select repositories" tanlab,
   faqat `hisobchi_mini_bot` ni belgilashingiz mumkin.

## 2. Xizmatni yaratish (Blueprint)

Loyihadagi `render.yaml` fayli barcha sozlamalarni o'zi beradi.

1. Render dashboard → **New +** → **Blueprint**.
2. Repozitoriy: **jahongirovabdullox0-source/hisobchi_mini_bot** → **Connect**.
3. **Blueprint Name** ga `hisobchi` yozing.
4. Render `hisobchi-mini-bot-api` xizmatini ko'rsatadi (Free, Ohio). Maxfiy qiymatlarni kiriting.
   Ular kompyuterdagi `.env` faylida bor — qo'shtirnoqlarsiz nusxalang:

   | Kalit | Qiymat |
   |---|---|
   | `DATABASE_URL` | `.env` dagi `DATABASE_URL` |
   | `DIRECT_URL` | `.env` dagi `DIRECT_URL` |
   | `BOT_TOKEN` | `.env` dagi `BOT_TOKEN` |
   | `ADMIN_PASSWORD` | **Yangi kuchli parol**: kamida 10 belgi, harf + raqam + belgi. Oddiy parol bo'lsa Admin Panel ochilmaydi. |

5. **Deploy Blueprint** (yoki **Apply**) tugmasini bosing.

## 3. Tekshirish

1. Xizmat sahifasidagi **Logs** bo'limida 3–5 daqiqadan keyin quyidagilar chiqishi kerak:
   `🗄️ PostgreSQL (Neon) bazasiga ulandi` va `🤖 Bot ishga tushdi (webhook)`.
2. Brauzerda https://hisobchi-mini-bot-api.onrender.com/api/health oching — `{"ok":true,...}` chiqadi.
3. Telegram'da botga `/start` yuboring → pastdagi **Hisobchi** tugmasi → Mini App Vercel'dan ochiladi
   (ngrok ogohlantirish sahifasi endi yo'q).
4. Admin Panel: https://hisobchi-admin-three.vercel.app → yangi parol bilan kiring.

> Render xizmatga boshqacha manzil bergan bo'lsa (masalan `hisobchi-mini-bot-api-abcd.onrender.com`),
> Vercel'dagi `VITE_API_URL` sozlamasini shu manzilga o'zgartirish kerak.

## 4. Server uxlab qolmasligi uchun (tavsiya etiladi)

Render'ning bepul tarifida 15 daqiqa so'rov kelmasa server "uxlaydi":
uxlagandan keyingi birinchi xabarga javob ~1 daqiqa kechikadi, 21:00 dagi kunlik hisobot esa yuborilmay qolishi mumkin.

1. https://cron-job.org saytida bepul ro'yxatdan o'ting.
2. **Create cronjob**:
   - URL: `https://hisobchi-mini-bot-api.onrender.com/api/health`
   - Execution schedule: **Every 10 minutes**
3. **Create** ni bosing.

Bepul tarif oyiga 750 soat beradi — bitta xizmatga butun oy yetadi.
Umuman uxlamasligi uchun Render'da **Starter** tarifiga ($7/oy) o'tish mumkin.

## 5. Kompyuterdagi bot

Render ishga tushgach, bot o'sha yerda ishlaydi — kompyuterda `start.bat` shart emas.
Tasodifan ishga tushirsangiz ham xavfsiz: server botni boshqa joyda ishlayotganini ko'rib, unga tegmaydi.

## Yangilash

- **Backend:** GitHub'ga yangi commit yuborilsa, Render avtomatik qayta joylaydi.
- **Frontend:** `mini-app` yoki `admin-panel` papkasida:

```bash
npx vercel deploy --prod
```

## Muhit o'zgaruvchilari

| Joy | O'zgaruvchilar |
|---|---|
| Render | `NODE_ENV`, `ALLOW_DEV_AUTH`, `ADMIN_ALLOW_REMOTE`, `WEBAPP_URL`, `DAILY_REPORT_CRON`, `ADMIN_SECRET` (avtomatik), `DATABASE_URL`, `DIRECT_URL`, `BOT_TOKEN`, `ADMIN_PASSWORD` |
| Vercel (ikkala loyiha) | `VITE_API_URL` = `https://hisobchi-mini-bot-api.onrender.com` |
