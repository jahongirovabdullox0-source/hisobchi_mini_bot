const { PrismaClient } = require('@prisma/client');
const config = require('../config/default');

const prisma = new PrismaClient({
  log: config.env === 'development' ? ['warn', 'error'] : ['error'],
});

async function connectDatabase() {
  if (!config.db.url) {
    throw new Error(
      "DATABASE_URL topilmadi. .env faylini oching va Neon.tech bergan manzilni DATABASE_URL ga qo'ying."
    );
  }
  await prisma.$connect();
  // Bir nechta ulanishni oldindan ochib qo'yamiz: birinchi so'rovlar kutib qolmaydi
  await Promise.all(Array.from({ length: 5 }, () => prisma.$queryRaw`SELECT 1`));
  console.log("🗄️  PostgreSQL (Neon) bazasiga ulandi");
}

async function disconnectDatabase() {
  await prisma.$disconnect();
}

module.exports = { prisma, connectDatabase, disconnectDatabase };
