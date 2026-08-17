import { useQuery } from '@tanstack/react-query';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import StatCard from '../../components/admin/StatCard';
import UsersTable from '../../components/admin/UsersTable';
import DataSourcesTable from '../../components/admin/DataSourcesTable';
import api from '../../utils/api';

export default function AdminHome() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get('/admin/stats').then((res) => res.data.data),
  });

  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-bold text-white">Admin panel</h1>
        <p className="mt-2 text-slate-400">Manage users, roles, and oversee every connected data source.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Users" value={isLoading ? '—' : stats.totals.userCount} />
          <StatCard label="Data sources" value={isLoading ? '—' : stats.totals.dataSourceCount} />
          <StatCard label="Dashboards" value={isLoading ? '—' : stats.totals.dashboardCount} />
          <StatCard label="Insights" value={isLoading ? '—' : stats.totals.insightCount} />
          <StatCard label="Saved queries" value={isLoading ? '—' : stats.totals.savedQueryCount} />
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Users</h2>
          <div className="mt-3">
            <UsersTable />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">All data sources</h2>
          <div className="mt-3">
            <DataSourcesTable />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
