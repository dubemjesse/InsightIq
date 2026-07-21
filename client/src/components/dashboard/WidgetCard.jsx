import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { GripVertical, Trash2 } from 'lucide-react';
import ChartWidget from './ChartWidget';
import api from '../../utils/api';

const TYPE_OPTIONS = ['BAR', 'LINE', 'AREA', 'PIE', 'TABLE'];

export default function WidgetCard({ dashboardId, widget }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['widgetData', dashboardId, widget.id],
    queryFn: () =>
      api.get(`/dashboards/${dashboardId}/widgets/${widget.id}/data`).then((res) => res.data.data),
  });

  const changeTypeMutation = useMutation({
    mutationFn: (type) => api.patch(`/dashboards/${dashboardId}/widgets/${widget.id}`, { type }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] }),
    onError: () => toast.error('Could not change chart type.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/dashboards/${dashboardId}/widgets/${widget.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] });
      toast.success('Widget removed.');
    },
    onError: () => toast.error('Could not remove widget.'),
  });

  return (
    <div className="flex h-full flex-col rounded-xl border border-border-subtle bg-surface">
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <div className="widget-drag-handle flex min-w-0 items-center gap-1.5 cursor-grab text-slate-300">
          <GripVertical size={14} className="shrink-0 text-slate-500" />
          <span className="truncate text-sm font-medium">{widget.title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={widget.type}
            onChange={(e) => changeTypeMutation.mutate(e.target.value)}
            className="rounded-md border border-border-subtle bg-surface-raised px-1.5 py-0.5 text-xs text-slate-300"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (confirm(`Remove "${widget.title}"?`)) deleteMutation.mutate();
            }}
            className="rounded-md p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
            aria-label="Remove widget"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-2">
        {isLoading && <p className="p-4 text-center text-sm text-slate-500">Loading…</p>}
        {isError && (
          <p className="p-4 text-center text-sm text-red-400">
            {error?.response?.data?.message || 'Could not load this widget.'}
          </p>
        )}
        {data && (
          <ChartWidget
            type={widget.type}
            columns={data.columns}
            rows={data.rows}
            xKey={widget.config.xKey}
            yKeys={widget.config.yKeys}
          />
        )}
      </div>
    </div>
  );
}
