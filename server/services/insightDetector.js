const dataSourceService = require('./dataSource.service');

const NUMERIC_TYPE_PATTERN = /int|numeric|real|double|float|decimal|serial|money/i;
const DATE_NAME_PATTERN = /date|time|month|year|day|quarter|week|period/i;

const MAX_TABLES_SCANNED = 10;
const MAX_NUMERIC_COLS_PER_TABLE = 4;
const MAX_FINDINGS_RETURNED = 5;
const MIN_PERIODS_FOR_TREND = 4;
const MIN_ROWS_FOR_OUTLIER = 8;

function quoteIdent(type, name) {
  if (type === 'MYSQL') return `\`${String(name).replace(/`/g, '``')}\``;
  return `"${String(name).replace(/"/g, '""')}"`;
}

function mean(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values, avg) {
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function toNumbers(rows, key) {
  return rows
    .map((r) => Number(r[key]))
    .filter((v) => Number.isFinite(v));
}

/** Time-series trend/anomaly: compares the latest period against prior history. */
async function analyzeTimeSeries(dataSource, table, dateCol, numCol) {
  const qt = quoteIdent(dataSource.type, table);
  const qd = quoteIdent(dataSource.type, dateCol);
  const qn = quoteIdent(dataSource.type, numCol);

  const { rows } = await dataSourceService.runQuery(
    dataSource,
    `SELECT ${qd} as period, SUM(${qn}) as total FROM ${qt} GROUP BY ${qd} ORDER BY ${qd}`
  );

  const values = toNumbers(rows, 'total');
  if (values.length < MIN_PERIODS_FOR_TREND) return null;

  const current = values[values.length - 1];
  const currentPeriod = rows[rows.length - 1].period;
  const history = values.slice(0, -1);
  const previous = history[history.length - 1];

  const avg = mean(history);
  const std = stdDev(history, avg);
  const pctChange = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : null;
  const zScore = std > 0 ? (current - avg) / std : null;

  const zNotable = zScore !== null && Math.abs(zScore) >= 2;
  const pctNotable = pctChange !== null && Math.abs(pctChange) >= 25;
  if (!zNotable && !pctNotable) return null;

  const severity =
    (zScore !== null && Math.abs(zScore) >= 3) || (pctChange !== null && Math.abs(pctChange) >= 50)
      ? 'CRITICAL'
      : 'WARNING';

  return {
    kind: 'trend_change',
    table,
    column: numCol,
    period: currentPeriod,
    current,
    previous,
    average: avg,
    pctChange,
    zScore,
    direction: current >= previous ? 'up' : 'down',
    severity,
    score: Math.abs(zScore ?? 0) + Math.abs(pctChange ?? 0) / 25,
  };
}

/** Row-level outlier detection when there's no time dimension to group by. */
async function analyzeOutliers(dataSource, table, numCol) {
  const qt = quoteIdent(dataSource.type, table);
  const qn = quoteIdent(dataSource.type, numCol);

  const { rows } = await dataSourceService.runQuery(
    dataSource,
    `SELECT ${qn} as value FROM ${qt} WHERE ${qn} IS NOT NULL LIMIT 2000`
  );

  const values = toNumbers(rows, 'value');
  if (values.length < MIN_ROWS_FOR_OUTLIER) return null;

  const avg = mean(values);
  const std = stdDev(values, avg);
  if (std === 0) return null;

  let maxZ = 0;
  let outlierValue = null;
  for (const v of values) {
    const z = (v - avg) / std;
    if (Math.abs(z) > Math.abs(maxZ)) {
      maxZ = z;
      outlierValue = v;
    }
  }

  if (Math.abs(maxZ) < 3) return null;

  return {
    kind: 'outlier',
    table,
    column: numCol,
    value: outlierValue,
    average: avg,
    zScore: maxZ,
    severity: Math.abs(maxZ) >= 4 ? 'CRITICAL' : 'WARNING',
    score: Math.abs(maxZ),
  };
}

/**
 * Scans a data source's tables for statistically notable trends/anomalies.
 * Pure detection — no AI involved here; findings are handed to insightsAgent
 * for natural-language narration.
 */
async function detectFindings(dataSource) {
  const tables = (dataSource.schemaCache || []).slice(0, MAX_TABLES_SCANNED);
  const findings = [];

  for (const table of tables) {
    const numericCols = table.columns
      .filter((c) => NUMERIC_TYPE_PATTERN.test(c.type))
      .slice(0, MAX_NUMERIC_COLS_PER_TABLE);
    const dateCol = table.columns.find(
      (c) => DATE_NAME_PATTERN.test(c.name) && !numericCols.includes(c)
    );

    for (const col of numericCols) {
      try {
        const finding = dateCol
          ? await analyzeTimeSeries(dataSource, table.name, dateCol.name, col.name)
          : await analyzeOutliers(dataSource, table.name, col.name);
        if (finding) findings.push(finding);
      } catch (err) {
        console.error(`Insight scan failed for ${table.name}.${col.name}:`, err.message);
      }
    }
  }

  return findings.sort((a, b) => b.score - a.score).slice(0, MAX_FINDINGS_RETURNED);
}

module.exports = { detectFindings };
