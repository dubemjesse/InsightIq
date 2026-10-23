import { Link } from 'react-router-dom';
import { Database, FileSpreadsheet, Plus } from 'lucide-react';
import { relativeTime } from '../../utils/format';

const TYPE_LABEL = {
  POSTGRES: 'PostgreSQL',
  MYSQL: 'MySQL',
  SQLITE: 'SQLite',
  CSV: 'CSV',
  EXCEL: 'Excel',
};

const STATUS = {
  CONNECTED: { dot: 'bg-accent-green', text: 'text-slate-500', label: 'Connected' },
  PENDING: { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Pending' },
  ERROR: { dot: 'bg-red-500', text: 'text-red-400', label: 'Error' },
};

export default function SourceHealthList({ sources, isLoading }) {
  const list = sources ?? [];

  return (
    <section className="rounded-xl border border-border-subtle bg-surface shadow-sm">
      <header className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Data source health</h2>
        <Link
          to="/data-sources"
          className="text-xs font-medium text-electric hover:text-electric-light"
        >
          Manage
        </Link>
      </header>

      <div className="divide-y divide-border-subtle">
        {isLoading &&
          [0, 1, 2].map((i) => <div key={i} className="h-[58px] animate-pulse bg-surface-raised/40" />)}

        {!isLoading && list.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
            <Database size={24} className="text-slate-600" />
            <p className="text-xs text-slate-400">No data sources connected yet.</p>
            <Link
              to="/data-sources"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-electric hover:text-electric-light"
            >
              <Plus size={13} /> Connect one
            </Link>
          </div>
        )}

        {!isLoading &&
          list.map((source) => {
            const status = STATUS[source.status] ?? STATUS.PENDING;
            const isFile = source.type === 'CSV' || source.type === 'EXCEL';
            const Icon = isFile ? FileSpreadsheet : Database;
            const trailing =
              source.status === 'ERROR'
                ? 'Error'
                : relativeTime(source.lastConnectedAt) ?? status.label;

            return (
              <div key={source.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`}
                  title={status.label}
                />
                <Icon size={15} className="shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{source.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {TYPE_LABEL[source.type] ?? source.type}
                    {source.tableCount > 0 &&
                      ` · ${source.tableCount} table${source.tableCount === 1 ? '' : 's'}`}
                  </p>
                </div>
                <span className={`shrink-0 text-xs ${status.text}`}>{trailing}</span>
              </div>
            );
          })}
      </div>
    </section>
  );
}
