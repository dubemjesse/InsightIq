/**
 * Minimal trend line for a KPI card. The viewBox matches the rendered pixel
 * size (96×36) so nothing is distorted; the final point is emphasised.
 */
export default function Sparkline({ data }) {
  if (!Array.isArray(data) || data.length < 2) return null;

  const W = 96;
  const H = 36;
  const PAD = 3;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = (W - PAD * 2) / (data.length - 1);

  const points = data.map((value, i) => {
    const x = PAD + i * step;
    const y = PAD + (H - PAD * 2) * (1 - (value - min) / range);
    return [x, y];
  });

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(' ');
  const [endX, endY] = points[points.length - 1];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden="true">
      <path
        d={path}
        stroke="#378add"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={endX} cy={endY} r="2" fill="#5aa3e8" />
    </svg>
  );
}
