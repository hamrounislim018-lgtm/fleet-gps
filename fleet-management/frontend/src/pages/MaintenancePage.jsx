import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Wrench, Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import api from '../services/api';
import clsx from 'clsx';

const getStatusConfig = (t) => ({
  scheduled:   { label: t('maintenance_scheduled'),   color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  in_progress: { label: t('maintenance_in_progress'), color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  completed:   { label: t('maintenance_completed'),   color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  cancelled:   { label: t('maintenance_cancelled'),   color: 'bg-slate-600/30 text-slate-400 border-slate-600/30' }
});

const getPriorityConfig = (t) => ({
  low:      { label: t('priority_low'),   color: 'text-slate-400' },
  normal:   { label: t('priority_normal'), color: 'text-blue-400' },
  high:     { label: t('priority_high'),   color: 'text-amber-400' },
  critical: { label: t('priority_critical'), color: 'text-red-400' }
});

const MaintenanceModal = ({ record, onClose, vehicles, mutation }) => {
  const { t, i18n } = useTranslation();
  const { register, handleSubmit } = useForm({ defaultValues: record || {} });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1829] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wrench size={18} className="text-emerald-400" />
            {record?.id ? t('edit_maintenance') : t('add_maintenance')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(mutation.mutate)} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('vehicle')} *</label>
              <select className="input" {...register('vehicle_id', { required: true })}>
                <option value="">-- {t('select_vehicle_maintenance')} --</option>
                {vehicles?.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate_number})</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('maintenance_type')} *</label>
              <input className="input" placeholder={t('maintenance_type_placeholder')} {...register('title', { required: true })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('scheduled_date')}</label>
              <input type="date" className="input" {...register('scheduled_date')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('priority')}</label>
              <select className="input" {...register('priority')}>
                <option value="low">{t('priority_low')}</option>
                <option value="normal">{t('priority_normal')}</option>
                <option value="high">{t('priority_high')}</option>
                <option value="critical">{t('priority_critical')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('status')}</label>
              <select className="input" {...register('status')}>
                <option value="scheduled">{t('maintenance_scheduled')}</option>
                <option value="in_progress">{t('maintenance_in_progress')}</option>
                <option value="completed">{t('maintenance_completed')}</option>
                <option value="cancelled">{t('maintenance_cancelled')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('cost_omr')}</label>
              <input type="number" step="0.01" className="input" {...register('cost')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('workshop')}</label>
              <input className="input" {...register('workshop')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('next_service_km')}</label>
              <input type="number" className="input" {...register('next_service_km')} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('notes')}</label>
              <textarea className="input h-20 resize-none" {...register('notes')} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mutation.isLoading} className="btn-primary flex-1">
              {mutation.isLoading ? t('saving') : t('save')}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function MaintenancePage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const statusConfig = getStatusConfig(t);
  const priorityConfig = getPriorityConfig(t);

  const { data: stats } = useQuery('maintenance-stats', async () => {
    const res = await api.get('/maintenance/stats');
    return res.data.data;
  });

  const { data: records, isLoading } = useQuery(['maintenance', statusFilter], async () => {
    const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    const res = await api.get(`/maintenance${params}`);
    return res.data.data;
  });

  const { data: vehicles } = useQuery('vehicles-select', async () => {
    const res = await api.get('/vehicles?limit=200');
    return res.data.data;
  });

  const deleteMutation = useMutation(
    (id) => api.delete(`/maintenance/${id}`),
    { onSuccess: () => { queryClient.invalidateQueries('maintenance'); toast.success(t('deleted')); } }
  );

  const saveMutation = useMutation(
    (data) => modal?.id ? api.put(`/maintenance/${modal.id}`, data) : api.post('/maintenance', data),
    {
      onSuccess: () => { queryClient.invalidateQueries('maintenance'); toast.success(t('saved')); setShowModal(false); },
      onError: () => toast.error(t('error'))
    }
  );

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="section-title"><Wrench size={22} className="text-emerald-400" />{t('maintenance_management')}</h1>
        <button onClick={() => { setModal(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} />{t('add_maintenance')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: t('maintenance_scheduled'),    value: stats?.scheduled || 0,    icon: Clock,         color: 'text-blue-400' },
          { label: t('maintenance_in_progress'), value: stats?.in_progress || 0,  icon: Wrench,        color: 'text-amber-400' },
          { label: t('maintenance_completed'),    value: stats?.completed || 0,    icon: CheckCircle,   color: 'text-emerald-400' },
          { label: t('maintenance_overdue'),       value: stats?.overdue || 0,      icon: AlertTriangle, color: 'text-red-400' },
          { label: `${parseFloat(stats?.total_cost || 0).toFixed(0)} ر.ع ${t('total_cost')}`, value: `${parseFloat(stats?.total_cost || 0).toFixed(0)} ر.ع`, icon: DollarSign, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="stat-card p-4">
            <s.icon size={18} className={clsx(s.color, 'mb-2')} />
            <p className={clsx('text-2xl font-bold tabular-nums', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[['all', t('all')],['scheduled', t('maintenance_scheduled')],['in_progress', t('maintenance_in_progress')],['completed', t('maintenance_completed')],['cancelled', t('maintenance_cancelled')]].map(([k,l]) => (
          <button key={k} onClick={() => setStatusFilter(k)}
            className={clsx('px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
              statusFilter === k ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800/50 text-slate-400 border-slate-700/30 hover:text-white')}>
            {l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr>
                <th>{t('vehicle')}</th><th>{t('maintenance_type')}</th><th>{t('scheduled_date')}</th>
                <th>{t('priority')}</th><th>{t('status')}</th><th>{t('cost_omr')}</th><th>{t('workshop')}</th><th></th>
              </tr></thead>
              <tbody>
                {records?.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-slate-500">{t('no_maintenance_records')}</td></tr>}
                {records?.map(r => (
                  <tr key={r.id}>
                    <td>
                      <p className="font-medium text-white">{r.vehicle_name}</p>
                      <p className="text-xs text-slate-500 font-mono">{r.plate_number}</p>
                    </td>
                    <td className="text-slate-300">{r.title}</td>
                    <td className="text-slate-400 text-xs">
                      {r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString(i18n.language === 'ar' ? 'ar-OM' : 'en-US') : '--'}
                    </td>
                    <td><span className={clsx('text-xs font-medium', priorityConfig[r.priority]?.color)}>{priorityConfig[r.priority]?.label}</span></td>
                    <td><span className={clsx('text-xs px-2.5 py-1 rounded-lg font-medium border', statusConfig[r.status]?.color)}>{statusConfig[r.status]?.label}</span></td>
                    <td className="text-emerald-400 font-mono">{r.cost ? `${r.cost} ر.ع` : '--'}</td>
                    <td className="text-slate-400 text-sm">{r.workshop || '--'}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => { setModal(r); setShowModal(true); }} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => window.confirm(t('delete_confirm')) && deleteMutation.mutate(r.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <MaintenanceModal record={modal} vehicles={vehicles} mutation={saveMutation} onClose={() => setShowModal(false)} />}
    </div>
  );
}
