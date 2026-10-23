const prisma = require('../config/prisma');

const DAY_MS = 24 * 60 * 60 * 1000;

// YYYY-MM-DD in the server's local timezone — used to bucket query activity by day.
function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Everything the main dashboard needs in a single round-trip: data source
 * health, the insights that need attention (most severe first), a 14-day query
 * activity series, and dashboard counts — all scoped to the current user.
 */
async function getOverview(req, res, next) {
  try {
    const userId = req.user.id;
    const now = new Date();
    const since14 = new Date(now.getTime() - 14 * DAY_MS);
    const since7 = new Date(now.getTime() - 7 * DAY_MS);

    const [
      dataSources,
      insights,
      dashboards,
      widgetCount,
      savedQueryTotal,
      recentQueries,
      queryTimestamps,
    ] = await Promise.all([
      prisma.dataSource.findMany({
        where: { ownerId: userId },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          schemaCache: true,
          lastConnectedAt: true,
        },
      }),
      prisma.insight.findMany({
        where: { dataSource: { ownerId: userId } },
        orderBy: { createdAt: 'desc' },
        include: { dataSource: { select: { id: true, name: true } } },
      }),
      prisma.dashboard.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { widgets: true } } },
      }),
      prisma.widget.count({ where: { dashboard: { ownerId: userId } } }),
      prisma.savedQuery.count({ where: { ownerId: userId } }),
      prisma.savedQuery.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { dataSource: { select: { id: true, name: true } } },
      }),
      prisma.savedQuery.findMany({
        where: { ownerId: userId, createdAt: { gte: since14 } },
        select: { createdAt: true },
      }),
    ]);

    // --- Data source health -------------------------------------------------
    const statusRank = { ERROR: 0, PENDING: 1, CONNECTED: 2 };
    const sourceList = dataSources
      .map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        status: d.status,
        tableCount: Array.isArray(d.schemaCache) ? d.schemaCache.length : 0,
        lastConnectedAt: d.lastConnectedAt,
      }))
      .sort((a, b) => {
        if (statusRank[a.status] !== statusRank[b.status]) {
          return statusRank[a.status] - statusRank[b.status];
        }
        const at = a.lastConnectedAt ? a.lastConnectedAt.getTime() : 0;
        const bt = b.lastConnectedAt ? b.lastConnectedAt.getTime() : 0;
        return bt - at;
      });

    const sourceCounts = dataSources.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {});

    // --- Insights (severity first, then most recent) ----------------------
    const severityRank = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    const insightCounts = insights.reduce((acc, i) => {
      acc[i.severity] = (acc[i.severity] || 0) + 1;
      return acc;
    }, {});
    const rankedInsights = [...insights].sort((a, b) => {
      if (severityRank[a.severity] !== severityRank[b.severity]) {
        return severityRank[a.severity] - severityRank[b.severity];
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // --- Query activity: zero-filled 14-day series + week-over-week -------
    const buckets = new Map();
    for (let i = 13; i >= 0; i--) {
      buckets.set(localDateKey(new Date(now.getTime() - i * DAY_MS)), 0);
    }
    let last7 = 0;
    let prev7 = 0;
    for (const q of queryTimestamps) {
      const key = localDateKey(q.createdAt);
      if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
      if (q.createdAt >= since7) last7 += 1;
      else prev7 += 1;
    }
    const daily = [...buckets.entries()].map(([date, count]) => ({ date, count }));
    const changePct = prev7 === 0 ? null : Math.round(((last7 - prev7) / prev7) * 100);

    res.json({
      success: true,
      data: {
        dataSources: {
          total: dataSources.length,
          connected: sourceCounts.CONNECTED || 0,
          error: sourceCounts.ERROR || 0,
          pending: sourceCounts.PENDING || 0,
          list: sourceList,
        },
        insights: {
          total: insights.length,
          critical: insightCounts.CRITICAL || 0,
          warning: insightCounts.WARNING || 0,
          info: insightCounts.INFO || 0,
          recent: rankedInsights.slice(0, 6),
        },
        queries: {
          total: savedQueryTotal,
          last7,
          prev7,
          changePct,
          daily,
          recent: recentQueries.map((q) => ({
            id: q.id,
            question: q.question,
            createdAt: q.createdAt,
            dataSource: q.dataSource,
            rowCount: Array.isArray(q.resultPreview) ? q.resultPreview.length : null,
          })),
        },
        dashboards: {
          total: dashboards.length,
          widgetTotal: widgetCount,
          recent: dashboards.slice(0, 4).map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            widgetCount: d._count.widgets,
            updatedAt: d.updatedAt,
          })),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOverview };
