// Categorical palette, validated (dataviz skill) against the app's navy chart
// surface (#03122A). Slots 1-2 are the brand colors; the accent green is
// stepped darker here than its UI badge value (#97C459) because the bright
// UI step fails the dark-mode lightness band for data marks.
export const CATEGORICAL_COLORS = [
  '#378ADD', // blue (brand)
  '#6F9B3E', // green (brand, deepened for chart marks)
  '#d55181', // magenta
  '#c98500', // amber
  '#199e70', // aqua
  '#d95926', // orange
  '#9085e9', // violet
  '#e66767', // red
];

export const CHART_SURFACE = '#03122A';
export const CHART_GRID = '#1e304f'; // matches --color-border-subtle
export const CHART_MUTED_TEXT = '#94a3b8'; // slate-400
export const CHART_TOOLTIP_BG = '#11213f'; // matches --color-surface-raised

const MAX_SLICES = CATEGORICAL_COLORS.length;

export function colorForIndex(index) {
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length];
}

/**
 * Caps categorical data (e.g. pie slices) at the palette size, folding the
 * remainder into a single "Other" bucket so hue never has to be recycled.
 */
export function foldToOther(rows, categoryKey, valueKey) {
  if (rows.length <= MAX_SLICES) return rows;

  const sorted = [...rows].sort((a, b) => Number(b[valueKey]) - Number(a[valueKey]));
  const top = sorted.slice(0, MAX_SLICES - 1);
  const rest = sorted.slice(MAX_SLICES - 1);
  const otherTotal = rest.reduce((sum, row) => sum + (Number(row[valueKey]) || 0), 0);

  return [...top, { [categoryKey]: 'Other', [valueKey]: otherTotal }];
}
