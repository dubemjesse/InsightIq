import { useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Responsive, WidthProvider } from 'react-grid-layout';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Download, FileText, Trash2 } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import Navbar from '../components/layout/Navbar';
import WidgetCard from '../components/dashboard/WidgetCard';
import api from '../utils/api';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Hoisted so these are never a fresh object literal on re-render — the grid's
// internal effects key off the identity of these props.
const GRID_BREAKPOINTS = { lg: 1024, md: 768, sm: 480 };
const GRID_COLS = { lg: 12, md: 8, sm: 4 };

export default function DashboardBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const gridRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', id],
    queryFn: () => api.get(`/dashboards/${id}`).then((res) => res.data.data),
  });

  const layoutMutation = useMutation({
    mutationFn: (widgets) => api.patch(`/dashboards/${id}/layout`, { widgets }),
    onError: () => toast.error('Could not save the new layout.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/dashboards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Dashboard deleted.');
      navigate('/dashboards');
    },
    onError: () => toast.error('Could not delete this dashboard.'),
  });

  const layout = useMemo(
    () =>
      dashboard?.widgets.map((w) => ({
        i: w.id,
        x: w.position.x,
        y: w.position.y,
        w: w.position.w,
        h: w.position.h,
        minW: 3,
        minH: 3,
      })) ?? [],
    [dashboard]
  );

  // react-grid-layout's Responsive component keys an internal effect off the
  // identity of `layouts` — a fresh `{ lg: layout }` literal every render
  // re-triggers it every time, which loops forever. Memoize the wrapper too.
  const layouts = useMemo(() => ({ lg: layout }), [layout]);

  const handleLayoutChange = useCallback(
    (newLayout) => {
      if (!dashboard) return;
      const widgets = newLayout.map((item) => ({
        id: item.i,
        position: { x: item.x, y: item.y, w: item.w, h: item.h },
      }));
      layoutMutation.mutate(widgets);
    },
    [dashboard, layoutMutation]
  );

  const exportAs = async (format) => {
    if (!gridRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: '#03122A',
        scale: 2,
      });
      const fileBase = (dashboard?.name || 'dashboard').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${fileBase}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${fileBase}.pdf`);
      }
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy">
        <Navbar />
        <p className="px-6 py-12 text-sm text-slate-400">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Link to="/dashboards" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft size={14} /> All dashboards
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{dashboard.name}</h1>
            {dashboard.description && <p className="mt-1 text-sm text-slate-400">{dashboard.description}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportAs('png')}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-slate-200 hover:border-electric disabled:opacity-50"
            >
              <Download size={14} /> PNG
            </button>
            <button
              onClick={() => exportAs('pdf')}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-slate-200 hover:border-electric disabled:opacity-50"
            >
              <FileText size={14} /> PDF
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete dashboard "${dashboard.name}"? This cannot be undone.`)) {
                  deleteMutation.mutate();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        {dashboard.widgets.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-subtle py-16 text-center">
            <p className="text-slate-400">
              No widgets yet.{' '}
              <Link to="/ask" className="text-electric hover:text-electric-light">
                Ask a question
              </Link>{' '}
              and save the result here.
            </p>
          </div>
        ) : (
          <div ref={gridRef} className="dashboard-grid mt-8">
            <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              breakpoints={GRID_BREAKPOINTS}
              cols={GRID_COLS}
              rowHeight={48}
              draggableHandle=".widget-drag-handle"
              onDragStop={handleLayoutChange}
              onResizeStop={handleLayoutChange}
            >
              {dashboard.widgets.map((widget) => (
                <div key={widget.id}>
                  <WidgetCard dashboardId={id} widget={widget} />
                </div>
              ))}
            </ResponsiveGridLayout>
          </div>
        )}
      </main>
    </div>
  );
}
