import { useMemo, useRef, useState } from 'react';
import { Table2, TrendingUp } from 'lucide-react';
import { shortDate } from '../../utils/format';

const W = 720;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 34 };
const AXIS_INK = '#8a97ab';

/** 14-day query-volume area chart with a hover crosshair and a table view. */
export default function ActivityChart({ daily, isLoading }) {
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  const model = useMemo(() => {
    if (!daily || daily.length < 2) return null;

    const counts = daily.map((d) => d.count);
    const max = Math.max(4, Math.ceil(Math.max(...counts) / 4) * 4);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const step = innerW / (daily.length - 1);
    const x = (i) => PAD.left + i * step;
    const y = (v) => PAD.top + innerH * (1 - v / max);

    const pts = daily.map((d, i) => [x(i), y(d.count)]);
    const line = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join(' ');
    const baseline = PAD.top + innerH;
    const area = `${line} L${x(daily.length - 1).toFixed(1)} ${baseline} L${x(0).toFixed(1)} ${baseline} Z`;

    return { max, step, x, y, pts, line, area, innerH, ticks: [0, max / 2, max] };
  }, [daily]);

  const total = useMemo(
    () => (daily ? daily.reduce((sum, d) => sum + d.count, 0) : 0),
    [daily],
  );

  function handleMove(event) {
    if (!svgRef.current || !model) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const i = Math.round((px - PAD.left) / model.step);
    setHover(i >= 0 && i < daily.length ? i : null);
  }

  const xLabelIndexes = daily ? [0, Math.floor(daily.length / 2), daily.length - 1] : [];

  return (
    <section className="rounded-xl border border-border-subtle bg-surface shadow-sm">
      <header className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-electric" />
          <h2 className="text-sm font-semibold text-white">Query activity</h2>
          <span className="text-xs text-slate-500">· last 14 days</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            <span className="font-semibold tabular-nums text-white">{total}</span> asked
          </span>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="rounded-md p-1 text-slate-500 transition hover:bg-surface-raised hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-electric"
            aria-pressed={showTable}
            aria-label={showTable ? 'Show chart' : 'Show data table'}
          >
            <Table2 size={15} />
          </button>
        </div>
      </header>

      <div className="p-5">
        {isLoading && <div className="h-52 animate-pulse rounded-lg bg-surface-raised" />}

        {!isLoading && (!model || total === 0) && (
          <div className="flex h-52 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-slate-200">No questions asked yet</p>
            <p className="text-xs text-slate-500">
              Your query volume will chart here once you start asking.
            </p>
          </div>
        )}

        {!isLoading && model && total > 0 && !showTable && (
          <div className="relative">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full"
              onMouseMove={handleMove}
              onMouseLeave={() => setHover(null)}
              role="img"
              aria-label={`Query activity over the last 14 days: ${total} questions total`}
            >
              <defs>
                <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#378add" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#378add" stopOpacity="0" />
                </linearGradient>
              </defs>

              {model.ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={PAD.left}
                    x2={W - PAD.right}
                    y1={model.y(t)}
                    y2={model.y(t)}
                    stroke="#1e304f"
                    strokeWidth="1"
                  />
                  <text
                    x={PAD.left - 8}
                    y={model.y(t) + 3}
                    textAnchor="end"
                    style={{ fontSize: '10px', fill: AXIS_INK }}
                  >
                    {t}
                  </text>
                </g>
              ))}

              <path d={model.area} fill="url(#activity-fill)" />
              <path
                d={model.line}
                fill="none"
                stroke="#378add"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              <circle
                cx={model.pts[model.pts.length - 1][0]}
                cy={model.pts[model.pts.length - 1][1]}
                r="3.5"
                fill="#5aa3e8"
                stroke="#0c1930"
                strokeWidth="2"
              />

              {xLabelIndexes.map((i) => (
                <text
                  key={i}
                  x={model.x(i)}
                  y={H - 8}
                  textAnchor="middle"
                  style={{ fontSize: '10px', fill: AXIS_INK }}
                >
                  {shortDate(daily[i].date)}
                </text>
              ))}

              {hover != null && (
                <g>
                  <line
                    x1={model.x(hover)}
                    x2={model.x(hover)}
                    y1={PAD.top}
                    y2={PAD.top + model.innerH}
                    stroke="#5aa3e8"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={model.x(hover)}
                    cy={model.y(daily[hover].count)}
                    r="4"
                    fill="#5aa3e8"
                    stroke="#0c1930"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>

            {hover != null && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-lg border border-border-subtle bg-navy-light px-2.5 py-1.5 text-xs shadow-lg"
                style={{
                  left: `${(model.x(hover) / W) * 100}%`,
                  top: `${(model.y(daily[hover].count) / H) * 100}%`,
                }}
              >
                <p className="font-semibold tabular-nums text-white">
                  {daily[hover].count} {daily[hover].count === 1 ? 'question' : 'questions'}
                </p>
                <p className="text-slate-400">{shortDate(daily[hover].date)}</p>
              </div>
            )}
          </div>
        )}

        {!isLoading && model && total > 0 && showTable && (
          <div className="max-h-52 overflow-auto scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface text-slate-500">
                <tr>
                  <th className="py-1.5 font-medium">Date</th>
                  <th className="py-1.5 text-right font-medium">Questions</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {daily.map((d) => (
                  <tr key={d.date} className="border-t border-border-subtle">
                    <td className="py-1.5">{shortDate(d.date)}</td>
                    <td className="py-1.5 text-right tabular-nums">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
