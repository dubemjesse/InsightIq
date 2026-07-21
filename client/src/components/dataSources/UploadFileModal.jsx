import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import api from '../../utils/api';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.sqlite', '.db'];

export default function UploadFileModal({ onClose }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('file', file);
      if (name) formData.append('name', name);
      return api.post('/data-sources/upload', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
      toast.success('File imported successfully.');
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not import that file.');
    },
  });

  const isValidFile = (f) =>
    f && ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext));

  const handleFile = (f) => {
    if (!isValidFile(f)) {
      toast.error(`Unsupported file type. Allowed: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      return;
    }
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
  };

  return (
    <Modal title="Upload a file" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!file) return toast.error('Choose a file first.');
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
            isDragging ? 'border-electric bg-electric/5' : 'border-border-subtle'
          }`}
        >
          <input
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(',')}
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {file ? (
            <>
              <FileSpreadsheet className="text-accent-green" size={28} />
              <span className="text-sm font-medium text-white">{file.name}</span>
              <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
            </>
          ) : (
            <>
              <UploadCloud className="text-slate-400" size={28} />
              <span className="text-sm text-slate-300">
                Drag a file here, or <span className="text-electric">browse</span>
              </span>
              <span className="text-xs text-slate-500">CSV, XLSX, XLS, SQLite, DB</span>
            </>
          )}
        </label>

        <Input
          id="upload-name"
          label="Display name (optional)"
          placeholder="Q1 Sales Export"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Button type="submit" isLoading={mutation.isPending}>
          Import
        </Button>
      </form>
    </Modal>
  );
}
