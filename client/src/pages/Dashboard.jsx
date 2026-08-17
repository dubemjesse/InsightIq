import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import InsightCard from '../components/insights/InsightCard';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = user?.role === 'ADMIN' || user?.role === 'ANALYST';

  const { data: insights, isLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: () => api.get('/insights', { params: { limit: 10 } }).then((res) => res.data.data),
  });

  const scanAllMutation = useMutation({
    mutationFn: () => api.post('/insights/scan-all'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      const count = res.data.data.length;
      toast.success(count > 0 ? `Found ${count} new insight${count === 1 ? '' : 's'}.` : 'No new insights found.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Scan failed.'),
  });

  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-bold text-white">Welcome, {user?.name}</h1>
        <p className="mt-2 text-slate-400">
          You&apos;re signed in as <span className="text-electric">{user?.role}</span>.
        </p>

        <div className="mt-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-electric" size={18} />
            <h2 className="text-lg font-semibold text-white">Latest insights</h2>
          </div>
          {canManage && (
            <button
              onClick={() => scanAllMutation.mutate()}
              disabled={scanAllMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-slate-200 hover:border-electric disabled:opacity-50"
            >
              <RefreshCw size={14} className={scanAllMutation.isPending ? 'animate-spin' : ''} />
              Scan for insights
            </button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {isLoading && <p className="text-sm text-slate-400">Loading insights…</p>}

          {!isLoading && insights?.length === 0 && (
            <div className="rounded-xl border border-dashed border-border-subtle py-12 text-center">
              <p className="text-slate-400">
                No insights yet.{' '}
                {canManage ? (
                  'Connect a data source and scan for insights to get started.'
                ) : (
                  <>
                    Connect a data source on the{' '}
                    <Link to="/data-sources" className="text-electric hover:text-electric-light">
                      Data Sources
                    </Link>{' '}
                    page to get started.
                  </>
                )}
              </p>
            </div>
          )}

          {insights?.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
