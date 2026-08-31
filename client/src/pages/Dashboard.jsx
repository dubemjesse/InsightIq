import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { RefreshCw, MessageSquarePlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import KpiCard from '../components/overview/KpiCard';
import AttentionPanel from '../components/overview/AttentionPanel';
import ActivityChart from '../components/overview/ActivityChart';
import SourceHealthList from '../components/overview/SourceHealthList';
import RecentQuestions from '../components/overview/RecentQuestions';
import DashboardsList from '../components/overview/DashboardsList';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = user?.role === 'ADMIN' || user?.role === 'ANALYST';

  const { data, isPending } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.get('/overview').then((res) => res.data.data),
  });

  // Treat "no data yet" (initial load or a transient error) as loading so the
  // KPI cards never dereference an undefined slice.
  const isLoading = isPending || !data;

  const scanAll = useMutation({
    mutationFn: () => api.post('/insights/scan-all'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      const count = res.data.data.length;
      toast.success(
        count > 0 ? `Found ${count} new insight${count === 1 ? '' : 's'}.` : 'No new insights found.',
      );
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Scan failed.'),
  });

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const sources = data?.dataSources;
  const insights = data?.insights;
  const queries = data?.queries;
  const dashboards = data?.dashboards;

  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {today} · signed in as <span className="text-electric">{user?.role}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canManage && (
              <button
                onClick={() => scanAll.mutate()}
                disabled={scanAll.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-electric disabled:opacity-50"
              >
                <RefreshCw size={15} className={scanAll.isPending ? 'animate-spin' : ''} />
                Scan for insights
              </button>
            )}
            <Link
              to="/ask"
              className="inline-flex items-center gap-1.5 rounded-lg bg-electric px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-electric-light"
            >
              <MessageSquarePlus size={15} />
              Ask a question
            </Link>
          </div>
        </div>

        {/* KPI row */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Data sources"
            value={isLoading ? null : sources.total}
            to="/data-sources"
            footer={
              isLoading
                ? null
                : sources.error > 0
                  ? {
                      text: `${sources.error} need${sources.error === 1 ? 's' : ''} attention`,
                      tone: 'bad',
                    }
                  : sources.total === 0
                    ? { text: 'None connected yet', tone: 'neutral' }
                    : { text: 'All connected', tone: 'good' }
            }
          />
          <KpiCard
            label="Open insights"
            value={isLoading ? null : insights.total}
            footer={
              isLoading
                ? null
                : insights.critical > 0
                  ? {
                      text: `${insights.critical} critical · ${insights.warning} warning`,
                      tone: 'bad',
                    }
                  : insights.warning > 0
                    ? { text: `${insights.warning} warning`, tone: 'warn' }
                    : { text: 'Nothing urgent', tone: 'good' }
            }
          />
          <KpiCard
            label="Questions this week"
            value={isLoading ? null : queries.last7}
            spark={queries?.daily?.slice(7).map((d) => d.count)}
            footer={
              isLoading
                ? null
                : queries.changePct == null
                  ? { text: 'First week of activity', tone: 'neutral' }
                  : {
                      text: `${Math.abs(queries.changePct)}% ${
                        queries.changePct >= 0 ? 'above' : 'below'
                      } last week`,
                      tone: queries.changePct >= 0 ? 'good' : 'warn',
                    }
            }
          />
          <KpiCard
            label="Dashboards"
            value={isLoading ? null : dashboards.total}
            to="/dashboards"
            footer={
              isLoading
                ? null
                : {
                    text: `${dashboards.widgetTotal} widget${
                      dashboards.widgetTotal === 1 ? '' : 's'
                    } saved`,
                    tone: 'neutral',
                  }
            }
          />
        </div>

        {/* Detail grid */}
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <AttentionPanel
              insights={insights?.recent}
              total={insights?.total}
              critical={insights?.critical}
              isLoading={isLoading}
              canManage={canManage}
            />
            <ActivityChart daily={queries?.daily} isLoading={isLoading} />
          </div>

          <div className="space-y-6">
            <SourceHealthList sources={sources?.list} isLoading={isLoading} />
            <RecentQuestions questions={queries?.recent} isLoading={isLoading} />
            <DashboardsList dashboards={dashboards?.recent} isLoading={isLoading} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
