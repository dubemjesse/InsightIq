import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { relativeTime } from '../../utils/format';

export default function RecentQuestions({ questions, isLoading }) {
  const list = questions ?? [];

  return (
    <section className="rounded-xl border border-border-subtle bg-surface shadow-sm">
      <header className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Recent questions</h2>
        <Link to="/ask" className="text-xs font-medium text-electric hover:text-electric-light">
          Ask
        </Link>
      </header>

      <div className="divide-y divide-border-subtle">
        {isLoading &&
          [0, 1, 2].map((i) => <div key={i} className="h-[58px] animate-pulse bg-surface-raised/40" />)}

        {!isLoading && list.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
            <MessageSquare size={22} className="text-slate-600" />
            <p className="text-xs text-slate-400">No questions asked yet.</p>
            <Link
              to="/ask"
              className="text-xs font-medium text-electric hover:text-electric-light"
            >
              Ask your first question
            </Link>
          </div>
        )}

        {!isLoading &&
          list.map((q) => (
            <div key={q.id} className="px-5 py-3">
              <p className="line-clamp-2 text-sm text-slate-200">{q.question}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                <span className="max-w-[10rem] truncate">
                  {q.dataSource?.name ?? 'Unknown source'}
                </span>
                {q.rowCount != null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {q.rowCount} row{q.rowCount === 1 ? '' : 's'}
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{relativeTime(q.createdAt)}</span>
              </p>
            </div>
          ))}
      </div>
    </section>
  );
}
