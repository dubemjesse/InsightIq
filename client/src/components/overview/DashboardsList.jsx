import { Link } from 'react-router-dom';
import { LayoutDashboard, Plus } from 'lucide-react';

export default function DashboardsList({ dashboards, isLoading }) {
  const list = dashboards ?? [];

  return (
    <section className="rounded-xl border border-border-subtle bg-surface shadow-sm">
      <header className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Your dashboards</h2>
        <Link to="/dashboards" className="text-xs font-medium text-electric hover:text-electric-light">
          All
        </Link>
      </header>

      <div className="divide-y divide-border-subtle">
        {isLoading &&
          [0, 1].map((i) => <div key={i} className="h-[52px] animate-pulse bg-surface-raised/40" />)}

        {!isLoading && list.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
            <LayoutDashboard size={22} className="text-slate-600" />
            <p className="text-xs text-slate-400">No dashboards yet.</p>
            <Link
              to="/dashboards"
              className="inline-flex items-center gap-1 text-xs font-medium text-electric hover:text-electric-light"
            >
              <Plus size={13} /> Create one
            </Link>
          </div>
        )}

        {!isLoading &&
          list.map((d) => (
            <Link
              key={d.id}
              to={`/dashboards/${d.id}`}
              className="flex items-center gap-3 px-5 py-3 transition hover:bg-surface-raised/40"
            >
              <LayoutDashboard size={15} className="shrink-0 text-slate-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{d.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {d.widgetCount} widget{d.widgetCount === 1 ? '' : 's'}
                </p>
              </div>
            </Link>
          ))}
      </div>
    </section>
  );
}
