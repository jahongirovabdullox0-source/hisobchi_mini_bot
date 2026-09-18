const cron = require('node-cron');
const config = require('../config/default');
const { sendDailyReports } = require('./notify.service');
const { syncSilently } = require('./rates.service');

const jobs = [];

function start() {
  const options = { timezone: config.timezone };

  if (cron.validate(config.bot.dailyReportCron)) {
    jobs.push(cron.schedule(config.bot.dailyReportCron, () => sendDailyReports().catch(console.error), options));
  } else {
    console.warn(`⚠️  DAILY_REPORT_CRON noto'g'ri: "${config.bot.dailyReportCron}"`);
  }

  // Valyuta kurslari har kuni 09:05 da Markaziy bankdan yangilanadi
  jobs.push(cron.schedule('5 9 * * *', () => syncSilently(), options));

  console.log(`⏰ Rejalashtirilgan vazifalar ishga tushdi (kunlik hisobot: "${config.bot.dailyReportCron}")`);
}

function stop() {
  for (const job of jobs) job.stop();
}

module.exports = { start, stop };
