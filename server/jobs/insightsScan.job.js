const cron = require('node-cron');
const prisma = require('../config/prisma');
const insightsEngine = require('../services/insightsEngine');
const emailService = require('../services/emailService');

/** Scans every active user's data sources and emails them a digest of anything found. */
async function runDailyScan() {
  const users = await prisma.user.findMany({ where: { isActive: true } });
  console.log(`[insights-job] Scanning ${users.length} user(s) for new insights...`);

  for (const user of users) {
    try {
      const insights = await insightsEngine.scanAllForUser(user.id);
      if (insights.length > 0) {
        await emailService.sendInsightsDigest(user, insights);
      }
    } catch (err) {
      console.error(`[insights-job] Failed for user ${user.id}:`, err.message);
    }
  }

  console.log('[insights-job] Daily scan complete.');
}

/** Registers the daily 6am scan. Call once at server startup. */
function start() {
  cron.schedule('0 6 * * *', () => {
    runDailyScan().catch((err) => console.error('[insights-job] Unhandled error:', err));
  });
  console.log('[insights-job] Scheduled daily insight scan for 06:00.');
}

module.exports = { start, runDailyScan };
