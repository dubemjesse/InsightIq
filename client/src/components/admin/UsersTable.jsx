import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';

const ROLES = ['ADMIN', 'ANALYST', 'VIEWER'];

export default function UsersTable() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/admin/users').then((res) => res.data.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...changes }) => api.patch(`/admin/users/${id}`, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (err) => toast.error(err.response?.data?.message || 'Could not update this user.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User deleted.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not delete this user.'),
  });

  if (isLoading) return <p className="text-sm text-slate-400">Loading users…</p>;
  if (isError) return <p className="text-sm text-red-400">Could not load users.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle scrollbar-thin">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-raised text-slate-300">
          <tr>
            <th className="whitespace-nowrap px-4 py-2 font-medium">Name</th>
            <th className="whitespace-nowrap px-4 py-2 font-medium">Email</th>
            <th className="whitespace-nowrap px-4 py-2 font-medium">Role</th>
            <th className="whitespace-nowrap px-4 py-2 font-medium">Active</th>
            <th className="whitespace-nowrap px-4 py-2 font-medium">Data</th>
            <th className="whitespace-nowrap px-4 py-2 font-medium">Joined</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === currentUser?.id;
            return (
              <tr key={u.id} className="border-t border-border-subtle bg-surface text-slate-200">
                <td className="whitespace-nowrap px-4 py-2">{u.name}</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-400">{u.email}</td>
                <td className="whitespace-nowrap px-4 py-2">
                  <select
                    value={u.role}
                    disabled={isSelf || updateMutation.isPending}
                    onChange={(e) => updateMutation.mutate({ id: u.id, role: e.target.value })}
                    className="rounded-md border border-border-subtle bg-surface-raised px-1.5 py-0.5 text-xs text-slate-200 disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  <button
                    disabled={isSelf || updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: u.id, isActive: !u.isActive })}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                      u.isActive ? 'bg-accent-green/15 text-accent-green' : 'bg-slate-500/15 text-slate-400'
                    }`}
                  >
                    {u.isActive ? 'Active' : 'Disabled'}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-400">
                  {u._count.dataSources} src · {u._count.dashboards} dash
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-400">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  {!isSelf && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete user "${u.name}"? This removes all their data.`)) {
                          deleteMutation.mutate(u.id);
                        }
                      }}
                      className="rounded-md p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                      aria-label="Delete user"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
