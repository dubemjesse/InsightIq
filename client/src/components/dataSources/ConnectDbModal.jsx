import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import api from '../../utils/api';

const DEFAULT_PORTS = { POSTGRES: 5432, MYSQL: 3306 };

export default function ConnectDbModal({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    type: 'POSTGRES',
    host: '',
    port: DEFAULT_PORTS.POSTGRES,
    database: '',
    user: '',
    password: '',
    ssl: false,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/data-sources/connect', {
        name: form.name,
        type: form.type,
        connectionInfo: {
          host: form.host,
          port: Number(form.port),
          database: form.database,
          user: form.user,
          password: form.password,
          ssl: form.ssl,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
      toast.success('Connected successfully.');
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not connect to the database.');
    },
  });

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setForm((f) => ({ ...f, type, port: DEFAULT_PORTS[type] }));
  };

  return (
    <Modal title="Connect a database" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <Input id="name" label="Connection name" placeholder="Production Postgres" value={form.name} onChange={update('name')} required />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Type</label>
          <select
            value={form.type}
            onChange={handleTypeChange}
            className="w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric/50"
          >
            <option value="POSTGRES">PostgreSQL</option>
            <option value="MYSQL">MySQL</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input id="host" label="Host" placeholder="localhost" value={form.host} onChange={update('host')} required />
          </div>
          <Input id="port" label="Port" type="number" value={form.port} onChange={update('port')} required />
        </div>

        <Input id="database" label="Database" placeholder="mydb" value={form.database} onChange={update('database')} required />

        <div className="grid grid-cols-2 gap-3">
          <Input id="user" label="User" placeholder="postgres" value={form.user} onChange={update('user')} required />
          <Input id="password" label="Password" type="password" value={form.password} onChange={update('password')} />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={form.ssl} onChange={update('ssl')} className="rounded border-border-subtle" />
          Use SSL
        </label>

        <Button type="submit" isLoading={mutation.isPending}>
          Test &amp; connect
        </Button>
      </form>
    </Modal>
  );
}
