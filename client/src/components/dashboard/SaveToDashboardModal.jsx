import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import api from '../../utils/api';
import { suggestChart } from '../../utils/chartSuggestion';

const NEW_DASHBOARD_VALUE = '__new__';

export default function SaveToDashboardModal({ dataSourceId, result, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dashboardChoice, setDashboardChoice] = useState(NEW_DASHBOARD_VALUE);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [title, setTitle] = useState(result.question);

  const { data: dashboards, isLoading: loadingDashboards } = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => api.get('/dashboards').then((res) => res.data.data),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      let dashboardId = dashboardChoice;
      if (dashboardChoice === NEW_DASHBOARD_VALUE) {
        const created = await api.post('/dashboards', { name: newDashboardName });
        dashboardId = created.data.data.id;
      }

      const suggestion = suggestChart(result.columns, result.rows);

      await api.post(`/dashboards/${dashboardId}/widgets`, {
        title,
        type: suggestion.type,
        config: {
          dataSourceId,
          sql: result.sql,
          savedQueryId: result.savedQueryId,
          xKey: suggestion.xKey,
          yKeys: suggestion.yKeys,
        },
      });

      return dashboardId;
    },
    onSuccess: (dashboardId) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Saved to dashboard.');
      onClose();
      navigate(`/dashboards/${dashboardId}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not save this widget.'),
  });

  return (
    <Modal title="Save to dashboard" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (dashboardChoice === NEW_DASHBOARD_VALUE && !newDashboardName.trim()) {
            return toast.error('Name the new dashboard first.');
          }
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Dashboard</label>
          <select
            value={dashboardChoice}
            onChange={(e) => setDashboardChoice(e.target.value)}
            disabled={loadingDashboards}
            className="w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric/50"
          >
            <option value={NEW_DASHBOARD_VALUE}>+ Create new dashboard</option>
            {dashboards?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {dashboardChoice === NEW_DASHBOARD_VALUE && (
          <Input
            id="new-dashboard-name"
            label="New dashboard name"
            placeholder="Q3 Sales Overview"
            value={newDashboardName}
            onChange={(e) => setNewDashboardName(e.target.value)}
          />
        )}

        <Input
          id="widget-title"
          label="Widget title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Button type="submit" isLoading={mutation.isPending}>
          Save
        </Button>
      </form>
    </Modal>
  );
}
