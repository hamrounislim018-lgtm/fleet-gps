import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ClipboardList, Plus, Edit2, Trash2, X, MapPin, Clock, User, CheckCircle, AlertCircle, PlayCircle, Car } from 'lucide-react';
import api from '../services/api';
import clsx from 'clsx';

const getStatusConfig = (t) => ({
  pending:     { label: t('task_pending'),      color: 'bg-slate-600/30 text-slate-400 border-slate-600/30',    icon: Clock },
  assigned:    { label: t('task_assigned'),     color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',       icon: User },
  in_progress: { label: t('task_in_progress'),  color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',    icon: PlayCircle },
  completed:   { label: t('task_completed'),    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  cancelled:   { label: t('task_cancelled'),    color: 'bg-red-500/15 text-red-400 border-red-500/30',           icon: AlertCircle },
});

const getPriorityConfig = (t) => ({
  low:    { label: t('priority_low'), color: 'text-slate-400' },
  normal: { label: t('priority_normal'), color: 'text-blue-400' },
  high:   { label: t('priority_high'),  color: 'text-amber-400' },
  urgent: { label: t('priority_urgent'),  color: 'text-red-400' },
});

const TaskModal = ({ task, onClose, vehicles, drivers }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEdit = !!task?.id;
  const { register, handleSubmit } = useForm({ defaultValues: task || { priority: 'normal' } });

  const mutation = useMutation(
    (data) => isEdit ? api.put(`/tasks/${task.id}`, data) : api.post('/tasks', data),
    {
      onSuccess: () => { queryClient.invalidateQueries('tasks'); toast.success(t('saved')); onClose(); },
      onError: () => toast.error(t('error'))
    }
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1829] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-[#0f1829]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ClipboardList size={18} className="text-emerald-400" />
            {isEdit ? t('edit_task') : t('new_task')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(mutation.mutate)} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('task_title')} *</label>
              <input className="input" {...register('title', { required: true })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('vehicle')}</label>
              <select className="input" {...register('vehicle_id')}>
                <option value="">-- {t('select_vehicle')} --</option>
                {vehicles?.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate_number})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('driver')}</label>
              <select className="input" {...register('driver_id')}>
                <option value="">-- {t('select_driver')} --</option>
                {drivers?.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('priority')}</label>
              <select className="input" {...register('priority')}>
                <option value="low">{t('priority_low')}</option>
                <option value="normal">{t('priority_normal')}</option>
                <option value="high">{t('priority_high')}</option>
                <option value="urgent">{t('priority_urgent')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('delivery_time')}</label>
              <input type="datetime-local" className="input" {...register('delivery_time')} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('pickup_address')}</label>
              <input className="input" placeholder={t('pickup_address_placeholder')} {...register('pickup_address')} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('delivery_address')}</label>
              <input className="input" placeholder={t('delivery_address_placeholder')} {...register('delivery_address')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('customer_name')}</label>
              <input className="input" {...register('customer_name')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('customer_phone')}</label>
              <input className="input" dir="ltr" placeholder={t('phone_placeholder')} {...register('customer_phone')} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('notes')}</label>
              <textarea className="input resize-none h-16" {...register('notes')} />
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

export default function TasksPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const statusConfig = getStatusConfig(t);
  const priorityConfig = getPriorityConfig(t);

  const { data: stats } = useQuery('tasks-stats', async () => {
    const res = await api.get('/tasks/stats');
    return res.data.data || {};
  });

  const { data: tasks = [], isLoading } = useQuery(['tasks', statusFilter], async () => {
    const q = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    const res = await api.get(`/tasks${q}`);
    return res.data.data || [];
  });

  const { data: vehicles = [] } = useQuery('vehicles-tasks', async () => {
    const res = await api.get('/vehicles?limit=200');
    return res.data.data || [];
  });

  const { data: drivers = [] } = useQuery('drivers-tasks', async () => {
    const res = await api.get('/drivers');
    return res.data.data || [];
  });

  const deleteMutation = useMutation(
    (id) => api.delete(`/tasks/${id}`),
    { onSuccess: () => { queryClient.invalidateQueries('tasks'); toast.success(t('deleted')); } }
  );

  const updateStatus = useMutation(
    ({ id, status }) => api.put(`/tasks/${id}/status`, { status }),
    { onSuccess: () => queryClient.invalidateQueries('tasks') }
  );

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="section-title">
          <ClipboardList size={22} className="text-emerald-400" />
          {t('tasks')}
        </h1>
        <button onClick={() => { setEditTask(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} />{t('new_task')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: t('task_pending'),      value: stats?.pending      || 0, color: 'text-slate-400' },
          { label: t('task_assigned'),     value: stats?.assigned     || 0, color: 'text-blue-400' },
          { label: t('task_in_progress'),  value: stats?.in_progress  || 0, color: 'text-amber-400' },
          { label: t('task_completed_today'), value: stats?.completed_today || 0, color: 'text-emerald-400' },
          { label: t('task_cancelled'),      value: stats?.cancelled    || 0, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="stat-card p-4 text-center">
            <p className={clsx('text-3xl font-bold tabular-nums', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[['all', t('all')],['pending', t('task_pending')],['assigned', t('task_assigned')],['in_progress', t('task_in_progress')],['completed', t('task_completed')],['cancelled', t('task_cancelled')]].map(([k,l]) => (
          <button key={k} onClick={() => setStatusFilter(k)}
            className={clsx('px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
              statusFilter === k
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800/50 text-slate-400 border-slate-700/30 hover:text-white')}>
            {l}
          </button>
        ))}
      </div>

      {/* Tasks */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardList size={40} className="mx-auto mb-3 text-slate-700" />
          <p className="text-slate-500 text-sm">{t('no_tasks')}</p>
          <button onClick={() => { setEditTask(null); setShowModal(true); }} className="btn-primary mt-4 mx-auto">
            <Plus size={15} />{t('add_task')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map(task => {
            const sc = statusConfig[task.status] || statusConfig.pending;
            const pc = priorityConfig[task.priority] || priorityConfig.normal;
            const StatusIcon = sc.icon;
            return (
              <div key={task.id} className="card p-4 hover:border-emerald-500/20 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{task.title}</p>
                    <span className={clsx('text-xs font-medium', pc.color)}>{pc.label} {t('priority_label')}</span>
                  </div>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-lg border flex items-center gap-1 flex-shrink-0 ms-2', sc.color)}>
                    <StatusIcon size={11} />{sc.label}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400">
                  {task.vehicle_name && (
                    <div className="flex items-center gap-1.5">
                      <Car size={12} className="text-slate-600" />
                      {task.vehicle_name} · <span className="font-mono">{task.plate_number}</span>
                    </div>
                  )}
                  {task.driver_name && (
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-slate-600" />
                      {task.driver_name}
                    </div>
                  )}
                  {task.delivery_address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-600" />
                      <span className="truncate">{task.delivery_address}</span>
                    </div>
                  )}
                  {task.delivery_time && (
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-600" />
                      {new Date(task.delivery_time).toLocaleString(i18n.language === 'ar' ? 'ar-OM' : 'en-US')}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  {task.status === 'pending' && (
                    <button onClick={() => updateStatus.mutate({ id: task.id, status: 'in_progress' })}
                      className="text-xs px-2.5 py-1 bg-amber-500/15 text-amber-400 rounded-lg hover:bg-amber-500/25 transition-colors border border-amber-500/20">
                      {t('start_execution')}
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button onClick={() => updateStatus.mutate({ id: task.id, status: 'completed' })}
                      className="text-xs px-2.5 py-1 bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-colors border border-emerald-500/20">
                      {t('finish')}
                    </button>
                  )}
                  <div className="flex gap-1 ms-auto">
                    <button onClick={() => { setEditTask(task); setShowModal(true); }}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => window.confirm(t('delete_task_confirm')) && deleteMutation.mutate(task.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <TaskModal task={editTask} vehicles={vehicles} drivers={drivers} onClose={() => setShowModal(false)} />}
    </div>
  );
}
