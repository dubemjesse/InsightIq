import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import api from '../../utils/api';

export default function CreateDashboardModal({ onClose, onCreated }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/dashboards', { name, description }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Dashboard created.');
      onCreated?.(res.data.data);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not create dashboard.'),
  });

  return (
    <Modal title="New dashboard" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <Input
          id="dashboard-name"
          label="Name"
          placeholder="Q3 Sales Overview"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          id="dashboard-description"
          label="Description (optional)"
          placeholder="A quick summary of what this dashboard tracks"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button type="submit" isLoading={mutation.isPending}>
          Create
        </Button>
      </form>
    </Modal>
  );
}
