import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../ui/Modal';
import api from '../../utils/api';

export default function PreviewModal({ dataSource, onClose }) {
  const tables = dataSource.schemaCache || [];
  const [activeTable, setActiveTable] = useState(tables[0]?.name);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dataSourcePreview', dataSource.id, activeTable],
    queryFn: () =>
      api
        .get(`/data-sources/${dataSource.id}/preview`, { params: { table: activeTable } })
        .then((res) => res.data.data),
    enabled: !!activeTable,
  });

  return (
    <Modal title={`Preview — ${dataSource.name}`} onClose={onClose} maxWidth="max-w-3xl">
      {tables.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {tables.map((t) => (
            <button
              key={t.name}
              onClick={() => setActiveTable(t.name)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                activeTable === t.name
                  ? 'bg-electric text-white'
                  : 'border border-border-subtle text-slate-300 hover:border-electric'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="max-h-[60vh] overflow-auto rounded-lg border border-border-subtle scrollbar-thin">
        {isLoading && <p className="p-6 text-center text-sm text-slate-400">Loading preview…</p>}
        {isError && (
          <p className="p-6 text-center text-sm text-red-400">Could not load a preview for this table.</p>
        )}
        {data && (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface-raised text-slate-300">
              <tr>
                {data.columns.map((col) => (
                  <th key={col} className="whitespace-nowrap px-4 py-2 font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className="border-t border-border-subtle text-slate-200">
                  {data.columns.map((col) => (
                    <td key={col} className="whitespace-nowrap px-4 py-2">
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={data.columns.length} className="px-4 py-6 text-center text-slate-500">
                    No rows in this table.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}
