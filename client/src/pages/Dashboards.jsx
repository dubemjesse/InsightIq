import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, LayoutDashboard } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import CreateDashboardModal from '../components/dashboard/CreateDashboardModal';
import api from '../utils/api';

export default function Dashboards() {
  const [showCreate, setShowCreate] = useState(false);

  const { data: dashboards, isLoading } = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => api.get('/dashboards').then((res) => res.data.data),
  });

  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboards</h1>
            <p className="mt-1 text-sm text-slate-400">
              Save charts from your questions into shareable, drag-and-drop dashboards.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-electric px-4 py-2 text-sm font-semibold text-white hover:bg-electric-light"
          >
            <Plus size={16} /> New dashboard
          </button>
        </div>

        <div className="mt-8">
          {isLoading && <p className="text-sm text-slate-400">Loading dashboards…</p>}

          {!isLoading && dashboards?.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-subtle py-16 text-center">
              <LayoutDashboard className="text-slate-500" size={32} />
              <p className="text-slate-400">
                No dashboards yet. Ask a question, then save the result to a new dashboard.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashboards?.map((d) => (
              <Link
                key={d.id}
                to={`/dashboards/${d.id}`}
                className="rounded-xl border border-border-subtle bg-surface p-5 transition hover:border-electric"
              >
                <h3 className="font-semibold text-white">{d.name}</h3>
                {d.description && <p className="mt-1 text-sm text-slate-400">{d.description}</p>}
                <p className="mt-3 text-xs text-slate-500">
                  {d._count.widgets} widget{d._count.widgets === 1 ? '' : 's'} · updated{' '}
                  {new Date(d.updatedAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />

      {showCreate && <CreateDashboardModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
