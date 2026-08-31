import { Link } from 'react-router-dom';
import Sparkline from './Sparkline';

const FOOT_TEXT = {
  good: 'text-accent-green',
  warn: 'text-amber-400',
  bad: 'text-red-400',
  neutral: 'text-slate-500',
};

const FOOT_DOT = {
  good: 'bg-accent-green',
  warn: 'bg-amber-400',
  bad: 'bg-red-500',
  neutral: 'bg-slate-600',
};

/**
 * One headline metric. `footer` is `{ text, tone }` where tone drives the
 * status dot + colour, so the row that needs attention reads at a glance.
 */
export default function KpiCard({ label, value, footer, spark, to }) {
  const Wrapper = to ? Link : 'div';

  return (
    <Wrapper
      {...(to ? { to } : {})}
      className={`block rounded-xl border border-border-subtle bg-surface p-5 shadow-sm transition ${
        to ? 'hover:border-electric' : ''
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>

      <div className="mt-2 flex items-end justify-between gap-3">
        <span className="text-3xl font-bold tabular-nums text-white">
          {value == null ? <span className="text-slate-600">—</span> : value}
        </span>
        {Array.isArray(spark) && spark.length > 1 && (
          <span className="mb-0.5 shrink-0">
            <Sparkline data={spark} />
          </span>
        )}
      </div>

      {footer && (
        <p className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${FOOT_TEXT[footer.tone]}`}>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${FOOT_DOT[footer.tone]}`} />
          {footer.text}
        </p>
      )}
    </Wrapper>
  );
}
