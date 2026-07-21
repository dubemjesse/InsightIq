const prisma = require('../config/prisma');
const { detectFindings } = require('./insightDetector');
const { narrateFindings } = require('./insightsAgent');

/**
 * Scans one data source for notable trends/anomalies and persists them as
 * Insight rows. Returns the newly created insights (empty array if nothing
 * notable was found).
 */
async function scanDataSource(dataSource) {
  const findings = await detectFindings(dataSource);
  if (findings.length === 0) return [];

  const narrated = await narrateFindings(findings);

  const insights = await prisma.$transaction(
    narrated.map((insight, i) =>
      prisma.insight.create({
        data: {
          title: insight.title,
          description: insight.description,
          severity: insight.severity,
          metadata: findings[i],
          dataSourceId: dataSource.id,
        },
      })
    )
  );

  return insights;
}

/** Scans every data source owned by the given user. */
async function scanAllForUser(userId) {
  const dataSources = await prisma.dataSource.findMany({ where: { ownerId: userId } });
  const results = [];
  for (const dataSource of dataSources) {
    try {
      const insights = await scanDataSource(dataSource);
      results.push(...insights);
    } catch (err) {
      console.error(`Insight scan failed for data source ${dataSource.id}:`, err.message);
    }
  }
  return results;
}

module.exports = { scanDataSource, scanAllForUser };
