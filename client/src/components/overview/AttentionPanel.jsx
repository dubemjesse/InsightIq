import { ShieldCheck, TriangleAlert } from 'lucide-react';
import InsightCard from '../insights/InsightCard';

/**
 * The focal point of the dashboard: the insights that need a human, most
 * severe first. Falls back to a reassuring "all clear" state.
 */
const MAX_SHOWN = 4;

export default function AttentionPanel({ insights, total = 0, critical = 0, isLoading, canManage }) {
  const list = (insights ?? []).slice(0, MAX_SHOWN);

  return (
    <section className="rounded-xl border border-border-subtle bg-surface shadow-sm">
      <header className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div className="flex items-center gap-2">
          <TriangleAlert size={16} className={critical > 0 ? 'text-red-400' : 'text-electric'} />
          <h2 className="text-sm font-semibold text-white">Needs your attention</h2>
          {!isLoading && total > 0 && (
            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium tabular-nums text-slate-300">
              {total}
            </span>
          )}
        </div>
        {!isLoading && critical > 0 && (
          <span className="text-xs font-medium text-red-400">
            {critical} critical
          </span>
        )}
      </header>

      <div className="p-4">
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[68px] animate-pulse rounded-xl bg-surface-raised" />
            ))}
          </div>
        )}

        {!isLoading && list.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <ShieldCheck className="text-accent-green" size={28} />
            <p className="text-sm text-slate-200">Everything looks healthy</p>
            <p className="text-xs text-slate-500">
              {canManage
                ? 'No anomalies right now. Run a scan any time to re-check your data.'
                : 'No anomalies detected across your connected data.'}
            </p>
          </div>
        )}

        {!isLoading && list.length > 0 && (
          <>
            <div className="space-y-3">
              {list.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
            {total > list.length && (
              <p className="pt-3 text-center text-xs text-slate-500">
                Showing {list.length} of {total}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
