import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, UploadCloud, Database as DatabaseIcon } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import DataSourceCard from '../components/dataSources/DataSourceCard';
import ConnectDbModal from '../components/dataSources/ConnectDbModal';
import UploadFileModal from '../components/dataSources/UploadFileModal';
import PreviewModal from '../components/dataSources/PreviewModal';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

export default function DataSources() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'ANALYST';

  const [showConnect, setShowConnect] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null);

  const { data: dataSources, isLoading } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () => api.get('/data-sources').then((res) => res.data.data),
  });

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Data sources</h1>
            <p className="mt-1 text-sm text-slate-400">
              Connect a live database or import a file to start asking questions about your data.
            </p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-2 text-sm font-semibold text-slate-200 hover:border-electric"
              >
                <UploadCloud size={16} /> Upload file
              </button>
              <button
                onClick={() => setShowConnect(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-electric px-4 py-2 text-sm font-semibold text-white hover:bg-electric-light"
              >
                <Plus size={16} /> Connect database
              </button>
            </div>
          )}
        </div>

        <div className="mt-8">
          {isLoading && <p className="text-sm text-slate-400">Loading data sources…</p>}

          {!isLoading && dataSources?.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-subtle py-16 text-center">
              <DatabaseIcon className="text-slate-500" size={32} />
              <p className="text-slate-400">
                {canManage
                  ? 'No data sources yet. Connect a database or upload a file to get started.'
                  : 'No data sources have been connected yet.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dataSources?.map((ds) => (
              <DataSourceCard
                key={ds.id}
                dataSource={ds}
                canManage={canManage}
                onPreview={() => setPreviewTarget(ds)}
              />
            ))}
          </div>
        </div>
      </main>

      {showConnect && <ConnectDbModal onClose={() => setShowConnect(false)} />}
      {showUpload && <UploadFileModal onClose={() => setShowUpload(false)} />}
      {previewTarget && (
        <PreviewModal dataSource={previewTarget} onClose={() => setPreviewTarget(null)} />
      )}
    </div>
  );
}
