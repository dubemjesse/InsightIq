import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const SEVERITY_META = {
  CRITICAL: { icon: AlertTriangle, classes: 'bg-red-500/15 text-red-400 border-red-500/30' },
  WARNING: { icon: AlertCircle, classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  INFO: { icon: Info, classes: 'bg-electric/15 text-electric border-electric/30' },
};

export default function InsightCard({ insight }) {
  const queryClient = useQueryClient();
  const { icon: Icon, classes } = SEVERITY_META[insight.severity] ?? SEVERITY_META.INFO;

  const dismissMutation = useMutation({
    mutationFn: () => api.delete(`/insights/${insight.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insights'] }),
    onError: () => toast.error('Could not dismiss this insight.'),
  });

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface p-4">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${classes}`}>
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-white">{insight.title}</h3>
          <button
            onClick={() => dismissMutation.mutate()}
            disabled={dismissMutation.isPending}
            className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-surface-raised hover:text-slate-200"
            aria-label="Dismiss insight"
          >
            <X size={14} />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-400">{insight.description}</p>
        <p className="mt-2 text-xs text-slate-500">
          {insight.dataSource?.name} · {new Date(insight.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
