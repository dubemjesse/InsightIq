import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Sparkles, BookmarkPlus } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';
import ChartWidget from '../components/dashboard/ChartWidget';
import SaveToDashboardModal from '../components/dashboard/SaveToDashboardModal';
import api from '../utils/api';
import { suggestChart } from '../utils/chartSuggestion';

const EXAMPLE_QUESTIONS = [
  'What were the top 5 products by revenue?',
  'Show total revenue by region',
  'How many rows are in this dataset?',
];

export default function Ask() {
  const [dataSourceId, setDataSourceId] = useState('');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const suggestion = useMemo(
    () => (result ? suggestChart(result.columns, result.rows) : null),
    [result]
  );

  const { data: dataSources, isLoading: loadingSources } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () => api.get('/data-sources').then((res) => res.data.data),
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/query/ask', { dataSourceId, question }),
    onSuccess: (res) => {
      setResult(res.data.data);
    },
    onError: (err) => {
      setResult(null);
      toast.error(err.response?.data?.message || 'Could not answer that question.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dataSourceId) return toast.error('Choose a data source first.');
    if (!question.trim()) return toast.error('Type a question first.');
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center gap-2">
          <Sparkles className="text-electric" size={22} />
          <h1 className="text-2xl font-bold text-white">Ask your data</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Ask a plain-English question and InsightIQ will write and run the SQL for you.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Data source</label>
            <select
              value={dataSourceId}
              onChange={(e) => setDataSourceId(e.target.value)}
              disabled={loadingSources}
              className="w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric/50"
            >
              <option value="">
                {loadingSources ? 'Loading data sources…' : 'Select a data source'}
              </option>
              {dataSources?.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.type})
                </option>
              ))}
            </select>
            {!loadingSources && dataSources?.length === 0 && (
              <p className="mt-1.5 text-xs text-slate-500">
                No data sources yet — connect one on the Data Sources page first.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Your question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder="e.g. What were the top 5 products by revenue last quarter?"
              className="w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-electric/50"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuestion(q)}
                  className="rounded-full border border-border-subtle px-3 py-1 text-xs text-slate-400 hover:border-electric hover:text-slate-200"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" isLoading={mutation.isPending}>
            Ask
          </Button>
        </form>

        {result && (
          <div className="mt-10 space-y-4">
            <div className="rounded-xl border border-border-subtle bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Generated SQL
                  </h3>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-raised p-3 text-sm text-accent-green scrollbar-thin">
                    {result.sql}
                  </pre>
                  <p className="mt-3 text-sm text-slate-300">{result.explanation}</p>
                </div>
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-sm font-medium text-slate-200 hover:border-electric"
                >
                  <BookmarkPlus size={15} /> Save to dashboard
                </button>
              </div>
            </div>

            {suggestion && suggestion.type !== 'TABLE' && (
              <div className="h-72 rounded-xl border border-border-subtle bg-surface p-4">
                <ChartWidget
                  type={suggestion.type}
                  columns={result.columns}
                  rows={result.rows}
                  xKey={suggestion.xKey}
                  yKeys={suggestion.yKeys}
                />
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-border-subtle scrollbar-thin">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-raised text-slate-300">
                  <tr>
                    {result.columns.map((col) => (
                      <th key={col} className="whitespace-nowrap px-4 py-2 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="border-t border-border-subtle bg-surface text-slate-200">
                      {result.columns.map((col) => (
                        <td key={col} className="whitespace-nowrap px-4 py-2">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {result.rows.length === 0 && (
                    <tr>
                      <td colSpan={result.columns.length} className="px-4 py-6 text-center text-slate-500">
                        No rows returned.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showSaveModal && result && (
        <SaveToDashboardModal
          dataSourceId={dataSourceId}
          result={result}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}
