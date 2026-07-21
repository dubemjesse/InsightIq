const env = require('./config/env');
const app = require('./app');
const prisma = require('./config/prisma');
const insightsScanJob = require('./jobs/insightsScan.job');

const server = app.listen(env.port, () => {
  console.log(`InsightIQ server listening on http://localhost:${env.port} [${env.nodeEnv}]`);
});

insightsScanJob.start();

async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
