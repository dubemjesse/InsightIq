const DATE_NAME_PATTERN = /date|time|month|year|day|quarter|week/i;

function isNumericColumn(rows, column) {
  const values = rows.map((r) => r[column]).filter((v) => v !== null && v !== undefined && v !== '');
  if (values.length === 0) return false;
  return values.every((v) => typeof v === 'number' || !Number.isNaN(Number(v)));
}

function isDateColumn(rows, column) {
  if (DATE_NAME_PATTERN.test(column)) return true;
  const values = rows.slice(0, 5).map((r) => r[column]);
  return values.length > 0 && values.every((v) => v && !Number.isNaN(Date.parse(v)));
}

/**
 * Inspects a query result's shape and suggests a chart type plus which
 * column to use for the x-axis/category and which for the value series.
 * Falls back to TABLE whenever the shape doesn't clearly fit a chart.
 */
export function suggestChart(columns, rows) {
  const fallback = { type: 'TABLE', xKey: columns[0] || null, yKeys: [] };
  if (!columns || columns.length === 0 || !rows || rows.length === 0) return fallback;
  if (columns.length === 1) return fallback;

  const numericCols = columns.filter((c) => isNumericColumn(rows, c));
  const dateCol = columns.find((c) => isDateColumn(rows, c) && !numericCols.includes(c));
  const nonNumericCols = columns.filter((c) => !numericCols.includes(c));

  if (numericCols.length === 0) return fallback;

  if (dateCol) {
    return { type: 'LINE', xKey: dateCol, yKeys: numericCols };
  }

  const categoryCol = nonNumericCols[0];
  if (categoryCol) {
    const yKeys = numericCols;
    if (yKeys.length === 1 && rows.length <= 8) {
      return { type: 'PIE', xKey: categoryCol, yKeys };
    }
    return { type: 'BAR', xKey: categoryCol, yKeys };
  }

  // All-numeric result (e.g. multiple aggregate columns, no category) —
  // treat the first numeric column as the axis and the rest as series.
  if (numericCols.length > 1) {
    return { type: 'BAR', xKey: numericCols[0], yKeys: numericCols.slice(1) };
  }

  return fallback;
}
