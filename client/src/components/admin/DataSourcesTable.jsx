import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';

const STATUS_STYLES = {
  CONNECTED: 'bg-accent-green/15 text-accent-green',
  PENDING: 'bg-yellow-400/15 text-yellow-400',
  ERROR: 'bg-red-500/15 text-red-400',
};

export default function DataSourcesTable() {
  const { data: dataSources, isLoading, isError } = useQuery({
    queryKey: ['admin', 'dataSources'],
    queryFn: () => api.get('/admin/data-sources').then((res) => res.data.data),
  });

  if (isLoading) return <p className="text-sm text-slate-400">Loading data sources…</p>;
  if (isError) return <p className="text-sm text-red-400">Could not load data sources.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle scrollbar-thin">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-raised text-slate-300">
          <tr>
            <th className="whitespace-nowrap px-4 py-2 font-medium">Name</th>
            <th className="whitespace-nowrap px-4 py-2 font-medium">Type</th>
            <th className="whitespace-nowrap px-4 py-2 font-medium">Status</th>
            <th className="whitespace-nowrap px-4 py-2 font-medium">Owner</th>
            <th className="whitespace-nowrap px-4 py-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {dataSources.map((ds) => (
            <tr key={ds.id} className="border-t border-border-subtle bg-surface text-slate-200">
              <td className="whitespace-nowrap px-4 py-2">{ds.name}</td>
              <td className="whitespace-nowrap px-4 py-2 text-slate-400">{ds.type}</td>
              <td className="whitespace-nowrap px-4 py-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[ds.status]}`}>
                  {ds.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-slate-400">
                {ds.owner.name} ({ds.owner.email})
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-slate-400">
                {new Date(ds.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {dataSources.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                No data sources connected yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
