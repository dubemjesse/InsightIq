import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Database, FileSpreadsheet, Eye, RefreshCw, Trash2, Sparkles } from 'lucide-react';
import api from '../../utils/api';

const TYPE_META = {
  POSTGRES: { label: 'PostgreSQL', icon: Database },
  MYSQL: { label: 'MySQL', icon: Database },
  SQLITE: { label: 'SQLite', icon: Database },
  CSV: { label: 'CSV', icon: FileSpreadsheet },
  EXCEL: { label: 'Excel', icon: FileSpreadsheet },
};

const STATUS_STYLES = {
  CONNECTED: 'bg-accent-green',
  PENDING: 'bg-yellow-400',
  ERROR: 'bg-red-500',
};

export default function DataSourceCard({ dataSource, canManage, onPreview }) {
  const queryClient = useQueryClient();
  const { label, icon: Icon } = TYPE_META[dataSource.type] ?? { label: dataSource.type, icon: Database };
  const isLiveDb = dataSource.type === 'POSTGRES' || dataSource.type === 'MYSQL';
  const tableCount = dataSource.schemaCache?.length ?? 0;

  const testMutation = useMutation({
    mutationFn: () => api.post(`/data-sources/${dataSource.id}/test`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
      toast.success('Connection is healthy.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Connection test failed.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/data-sources/${dataSource.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
      toast.success('Data source removed.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not delete this data source.'),
  });

  const scanMutation = useMutation({
    mutationFn: () => api.post(`/insights/scan/${dataSource.id}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      const count = res.data.data.length;
      toast.success(count > 0 ? `Found ${count} new insight${count === 1 ? '' : 's'}.` : 'No new insights found.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Scan failed.'),
  });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-surface-raised p-2 text-electric">
            <Icon size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{dataSource.name}</h3>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        </div>
        <span
          className={`mt-1 h-2.5 w-2.5 rounded-full ${STATUS_STYLES[dataSource.status]}`}
          title={dataSource.status}
        />
      </div>

      <p className="text-xs text-slate-500">
        {tableCount} table{tableCount === 1 ? '' : 's'}
        {dataSource.lastConnectedAt &&
          ` · last connected ${new Date(dataSource.lastConnectedAt).toLocaleString()}`}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button
          onClick={onPreview}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-electric"
        >
          <Eye size={14} /> Preview
        </button>

        {canManage && isLiveDb && (
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-electric disabled:opacity-50"
          >
            <RefreshCw size={14} className={testMutation.isPending ? 'animate-spin' : ''} /> Test
          </button>
        )}

        {canManage && (
          <button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-electric disabled:opacity-50"
          >
            <Sparkles size={14} className={scanMutation.isPending ? 'animate-pulse' : ''} /> Scan
          </button>
        )}

        {canManage && (
          <button
            onClick={() => {
              if (confirm(`Delete "${dataSource.name}"? This cannot be undone.`)) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          >
            <Trash2 size={14} /> Delete
          </button>
        )}
      </div>
    </div>
  );
}
