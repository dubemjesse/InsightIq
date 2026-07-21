import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { CHART_GRID, CHART_MUTED_TEXT, CHART_TOOLTIP_BG, colorForIndex, foldToOther } from '../../utils/chartColors';

const axisTick = { fill: CHART_MUTED_TEXT, fontSize: 12 };
const tooltipStyle = {
  contentStyle: { background: CHART_TOOLTIP_BG, border: '1px solid #1e304f', borderRadius: 8, fontSize: 13 },
  labelStyle: { color: '#fff', marginBottom: 4 },
  itemStyle: { color: '#e2e8f0' },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};
const legendStyle = { fontSize: 12, color: CHART_MUTED_TEXT };

function EmptyState() {
  return <p className="flex h-full items-center justify-center text-sm text-slate-500">No data to display.</p>;
}

function TableView({ columns, rows }) {
  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-surface-raised text-slate-300">
          <tr>
            {columns.map((col) => (
              <th key={col} className="whitespace-nowrap px-3 py-1.5 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border-subtle text-slate-200">
              {columns.map((col) => (
                <td key={col} className="whitespace-nowrap px-3 py-1.5">
                  {String(row[col] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ChartWidget({ type, columns, xKey, yKeys, rows }) {
  if (!rows || rows.length === 0) return <EmptyState />;

  if (type === 'TABLE' || !xKey) {
    return <TableView columns={columns} rows={rows} />;
  }

  if (type === 'BAR') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis dataKey={xKey} stroke={CHART_GRID} tick={axisTick} />
          <YAxis stroke={CHART_GRID} tick={axisTick} width={48} />
          <Tooltip {...tooltipStyle} />
          {yKeys.length > 1 && <Legend wrapperStyle={legendStyle} />}
          {yKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={colorForIndex(i)} radius={[4, 4, 0, 0]} maxBarSize={24} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'LINE') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis dataKey={xKey} stroke={CHART_GRID} tick={axisTick} />
          <YAxis stroke={CHART_GRID} tick={axisTick} width={48} />
          <Tooltip {...tooltipStyle} />
          {yKeys.length > 1 && <Legend wrapperStyle={legendStyle} />}
          {yKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colorForIndex(i)}
              strokeWidth={2}
              dot={{ r: 4, fill: colorForIndex(i), stroke: '#03122A', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'AREA') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis dataKey={xKey} stroke={CHART_GRID} tick={axisTick} />
          <YAxis stroke={CHART_GRID} tick={axisTick} width={48} />
          <Tooltip {...tooltipStyle} />
          {yKeys.length > 1 && <Legend wrapperStyle={legendStyle} />}
          {yKeys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colorForIndex(i)}
              strokeWidth={2}
              fill={colorForIndex(i)}
              fillOpacity={0.1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'PIE') {
    const valueKey = yKeys[0];
    const data = foldToOther(rows, xKey, valueKey);
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={xKey} outerRadius="75%" strokeWidth={2} stroke="#03122A">
            {data.map((_, i) => (
              <Cell key={i} fill={colorForIndex(i)} />
            ))}
          </Pie>
          <Legend wrapperStyle={legendStyle} />
          <Tooltip {...tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return <TableView columns={columns} rows={rows} />;
}
