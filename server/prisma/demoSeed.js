/**
 * Populates the demo account with realistic-looking data so the dashboard
 * can be reviewed with real content. Safe to re-run: it wipes and re-creates
 * the demo user's data sources / insights / queries / dashboards each time.
 *
 *   node prisma/demoSeed.js [email]
 */
const prisma = require('../config/prisma');

const EMAIL = process.argv[2] || 'demo@insightiq.test';
const DAY = 24 * 60 * 60 * 1000;
const ago = (ms) => new Date(Date.now() - ms);

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`No user with email ${EMAIL}. Register it first.`);

  await prisma.dataSource.deleteMany({ where: { ownerId: user.id } });
  await prisma.dashboard.deleteMany({ where: { ownerId: user.id } });
  await prisma.savedQuery.deleteMany({ where: { ownerId: user.id } });

  const fakeSchema = (n) =>
    Array.from({ length: n }, (_, i) => ({ name: `table_${i + 1}`, columns: [] }));

  const prod = await prisma.dataSource.create({
    data: {
      ownerId: user.id,
      name: 'Production Postgres',
      type: 'POSTGRES',
      status: 'CONNECTED',
      schemaCache: fakeSchema(24),
      lastConnectedAt: ago(4 * 60 * 1000),
      connectionInfo: { host: 'db.internal', port: 5432, database: 'app', user: 'readonly' },
    },
  });
  const stripe = await prisma.dataSource.create({
    data: {
      ownerId: user.id,
      name: 'Stripe Replica',
      type: 'POSTGRES',
      status: 'CONNECTED',
      schemaCache: fakeSchema(9),
      lastConnectedAt: ago(6 * 60 * 1000),
      connectionInfo: { host: 'stripe-replica.internal', port: 5432, database: 'stripe', user: 'readonly' },
    },
  });
  const marketing = await prisma.dataSource.create({
    data: {
      ownerId: user.id,
      name: 'Marketing MySQL',
      type: 'MYSQL',
      status: 'CONNECTED',
      schemaCache: fakeSchema(12),
      lastConnectedAt: ago(70 * 60 * 1000),
      connectionInfo: { host: 'mktg.internal', port: 3306, database: 'marketing', user: 'analyst' },
    },
  });
  await prisma.dataSource.create({
    data: {
      ownerId: user.id,
      name: 'Q3 Sales Export.csv',
      type: 'CSV',
      status: 'CONNECTED',
      schemaCache: fakeSchema(1),
      lastConnectedAt: ago(2 * DAY),
      filePath: 'uploads/q3-sales-export.csv',
    },
  });
  const warehouse = await prisma.dataSource.create({
    data: {
      ownerId: user.id,
      name: 'Warehouse Snapshot',
      type: 'POSTGRES',
      status: 'ERROR',
      schemaCache: fakeSchema(31),
      lastConnectedAt: ago(2 * DAY),
      connectionInfo: { host: 'warehouse.internal', port: 5432, database: 'analytics', user: 'etl' },
    },
  });

  await prisma.insight.createMany({
    data: [
      {
        dataSourceId: prod.id,
        severity: 'CRITICAL',
        title: 'Weekly revenue fell 23% week-over-week',
        description:
          'Revenue dropped from $412,400 to $317,900 — the largest single-week decline in the last 6 months.',
        createdAt: ago(2 * 60 * 60 * 1000),
      },
      {
        dataSourceId: stripe.id,
        severity: 'CRITICAL',
        title: 'Failed checkout rate spiked to 9.4%',
        description:
          'Up from a 2.1% baseline since Aug 29, 14:00 UTC. Card declines account for most of the increase.',
        createdAt: ago(5 * 60 * 60 * 1000),
      },
      {
        dataSourceId: marketing.id,
        severity: 'WARNING',
        title: 'Signups down 11% vs the 4-week average',
        description: '480 new signups this week against a 540 average. Organic traffic is flat; paid is down.',
        createdAt: ago(26 * 60 * 60 * 1000),
      },
      {
        dataSourceId: warehouse.id,
        severity: 'WARNING',
        title: '3 tables have not refreshed in 48h',
        description: 'orders_fact, sessions, and ad_spend are stale — the ETL job last succeeded on Aug 29.',
        createdAt: ago(28 * 60 * 60 * 1000),
      },
      {
        dataSourceId: prod.id,
        severity: 'INFO',
        title: 'Mobile crossed 60% of sessions for the first time',
        description: 'Mobile is now 61.3% of weekly sessions, up from 54% a quarter ago.',
        createdAt: ago(3 * DAY),
      },
    ],
  });

  const questions = [
    { q: 'What were the top 10 products by revenue last quarter?', ds: prod.id, rows: 10, at: 8 * 60 * 1000 },
    { q: 'Show weekly active users since June', ds: prod.id, rows: 13, at: 65 * 60 * 1000 },
    { q: 'Which campaigns had the lowest customer acquisition cost?', ds: marketing.id, rows: 18, at: 3 * 60 * 60 * 1000 },
    { q: 'Refund totals by reason code this month', ds: stripe.id, rows: 6, at: 27 * 60 * 60 * 1000 },
    { q: 'Average order value by country, top 15', ds: prod.id, rows: 15, at: 2 * DAY },
  ];
  for (const item of questions) {
    await prisma.savedQuery.create({
      data: {
        ownerId: user.id,
        dataSourceId: item.ds,
        question: item.q,
        generatedSql: 'SELECT 1',
        resultPreview: Array.from({ length: item.rows }, (_, i) => ({ row: i })),
        createdAt: ago(item.at),
      },
    });
  }

  // Backfill a 14-day activity curve (counts per day, oldest first) — a modest
  // week-over-week uptick. Timestamps are always in the recent past.
  const perDay = [8, 10, 9, 11, 7, 5, 9, 10, 11, 9, 12, 8, 11, 8];
  const pool = [
    'Monthly recurring revenue trend',
    'Churn rate by plan tier',
    'Sessions by device type this week',
    'New vs returning customers by month',
    'Support ticket volume by category',
    'Gross margin by product line',
    'Trial-to-paid conversion by cohort',
    'Daily active users, last 30 days',
  ];
  const filler = [];
  for (let d = 0; d < perDay.length; d++) {
    const dayStart = new Date(ago((perDay.length - 1 - d) * DAY)).setHours(0, 0, 0, 0);
    for (let i = 0; i < perDay[d]; i++) {
      const base = Math.min(dayStart + 10 * 60 * 60 * 1000, Date.now() - 5 * 60 * 1000);
      filler.push({
        ownerId: user.id,
        dataSourceId: [prod.id, stripe.id, marketing.id][i % 3],
        question: pool[(d + i) % pool.length],
        generatedSql: 'SELECT 1',
        resultPreview: Array.from({ length: 3 + ((d + i) % 12) }, (_, r) => ({ row: r })),
        createdAt: new Date(base - i * 22 * 60 * 1000),
      });
    }
  }
  await prisma.savedQuery.createMany({ data: filler });

  const revenue = await prisma.dashboard.create({
    data: { ownerId: user.id, name: 'Revenue Overview', description: 'Company-wide revenue KPIs', dataSourceId: prod.id },
  });
  const growth = await prisma.dashboard.create({
    data: { ownerId: user.id, name: 'Growth & Acquisition', description: 'Signups, activation, CAC', dataSourceId: marketing.id },
  });
  await prisma.dashboard.create({
    data: { ownerId: user.id, name: 'Payments Health', description: 'Checkout success, refunds, disputes', dataSourceId: stripe.id },
  });

  const widgetData = [
    { d: revenue.id, t: 'Revenue by week', type: 'LINE' },
    { d: revenue.id, t: 'Revenue by region', type: 'BAR' },
    { d: revenue.id, t: 'Top products', type: 'TABLE' },
    { d: growth.id, t: 'Signups by day', type: 'AREA' },
    { d: growth.id, t: 'CAC by channel', type: 'BAR' },
  ];
  for (const w of widgetData) {
    await prisma.widget.create({
      data: {
        dashboardId: w.d,
        title: w.t,
        type: w.type,
        config: { dataSourceId: prod.id, sql: 'SELECT 1' },
        position: { x: 0, y: 0, w: 6, h: 4 },
      },
    });
  }

  const counts = await prisma.savedQuery.count({ where: { ownerId: user.id } });
  console.log(`Seeded demo data for ${EMAIL}: 5 data sources, 5 insights, ${counts} queries, 3 dashboards.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
