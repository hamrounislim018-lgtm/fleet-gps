import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Fuel, Droplets, AlertTriangle, Calendar, Car, User, DollarSign, TrendingDown } from 'lucide-react';
import api from '../services/api';
import clsx from 'clsx';

const FuelLogModal = ({ log, onClose, vehicles, drivers, mutation }) => {
  const { t, i18n } = useTranslation();
  const isEdit = !!log?.id;
  const { register, handleSubmit } = useForm({ defaultValues: log || {} });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1829] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-[#0f1829] z-10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Fuel size={18} className="text-amber-400" />
            {isEdit ? t('edit_fuel_log') : t('add_fuel_record')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(mutation.mutate)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('vehicle')} *</label>
              <select className="input" {...register('vehicle_id', { required: true })}>
                <option value="">-- {t('select_vehicle')} --</option>
                {vehicles?.map(v => (<option key={v.id} value={v.id}>{v.name} ({v.plate_number})</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('driver')}</label>
              <select className="input" {...register('driver_id')}>
                <option value="">-- {t('select_driver')} --</option>
                {drivers?.map(d => (<option key={d.id} value={d.id}>{d.full_name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('liters')} *</label>
              <input type="number" step="0.01" className="input" {...register('liters', { required: true })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('cost_per_liter')} *</label>
              <input type="number" step="0.001" className="input" {...register('cost_per_liter', { required: true })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('total')}</label>
              <input type="number" step="0.01" className="input" {...register('total_cost')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('odometer')}</label>
              <input type="number" className="input" {...register('odometer')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('date')} *</label>
              <input type="datetime-local" className="input" {...register('fuel_date', { required: true })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('fuel_type')}</label>
              <select className="input" {...register('fuel_type')}>
                <option value="gasoline">{t('fuel_type_gasoline')}</option>
                <option value="diesel">{t('fuel_type_diesel')}</option>
                <option value="electric">{t('fuel_type_electric')}</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('station_name')}</label>
              <input className="input" {...register('station_name')} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('receipt_number')}</label>
              <input className="input" {...register('receipt_number')} />
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

export default function FuelPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('logs');

  const { data: stats } = useQuery('fuel-stats', async () => {
    const res = await api.get('/fuel/stats');
    return res.data.data;
  });

  const { data: logs, isLoading: logsLoading } = useQuery('fuel-logs', async () => {
    const res = await api.get('/fuel/logs');
    return res.data.data;
  });

  const { data: theftAlerts, isLoading: alertsLoading } = useQuery('fuel-theft-alerts', async () => {
    const res = await api.get('/fuel/theft-alerts');
    return res.data.data;
  });

  const { data: vehicles } = useQuery('vehicles-select', async () => {
    const res = await api.get('/vehicles?limit=200');
    return res.data.data;
  });

  const { data: drivers } = useQuery('drivers-select', async () => {
    const res = await api.get('/drivers');
    return res.data.data;
  });

  const saveMutation = useMutation(
    (data) => api.post('/fuel/logs', data),
    {
      onSuccess: () => { queryClient.invalidateQueries('fuel-logs'); queryClient.invalidateQueries('fuel-stats'); toast.success(t('saved')); setShowModal(false); },
      onError: () => toast.error(t('error'))
    }
  );

  const confirmAlertMutation = useMutation(
    ({ id, notes }) => api.put(`/fuel/theft-alerts/${id}/confirm`, { notes }),
    {
      onSuccess: () => { queryClient.invalidateQueries('fuel-theft-alerts'); toast.success(t('alert_confirmed_msg')); },
      onError: () => toast.error(t('error'))
    }
  );

  const totalLiters = stats?.reduce((sum, s) => sum + parseFloat(s.total_liters || 0), 0) || 0;
  const totalCost = stats?.reduce((sum, s) => sum + parseFloat(s.total_cost || 0), 0) || 0;
  const avgConsumption = stats?.reduce((sum, s) => sum + parseFloat(s.consumption_per_100km || 0), 0) / (stats?.length || 1) || 0;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="section-title">
          <Fuel size={22} className="text-amber-400" />
          {t('fuel_management')}
        </h1>
        <button onClick={() => { setModal(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} />
          {t('add_fuel_log')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card p-4">
          <Droplets size={18} className="text-amber-400 mb-2" />
          <p className="text-2xl font-bold tabular-nums text-amber-400">{totalLiters.toFixed(0)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('total_fuel_liters')}</p>
        </div>
        <div className="stat-card p-4">
          <DollarSign size={18} className="text-emerald-400 mb-2" />
          <p className="text-2xl font-bold tabular-nums text-emerald-400">{totalCost.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('total_cost_fuel')}</p>
        </div>
        <div className="stat-card p-4">
          <TrendingDown size={18} className="text-blue-400 mb-2" />
          <p className="text-2xl font-bold tabular-nums text-blue-400">{avgConsumption.toFixed(1)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('avg_consumption')}</p>
        </div>
        <div className="stat-card p-4">
          <Car size={18} className="text-purple-400 mb-2" />
          <p className="text-2xl font-bold tabular-nums text-purple-400">{stats?.length || 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('registered_vehicles')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('logs')}
          className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition-all border',
            activeTab === 'logs' ? 'bg-amber-600/20 text-amber-400 border-amber-500/30' : 'bg-slate-800/50 text-slate-400 border-slate-700/30 hover:text-white')}
        >
          {t('fuel_logs')}
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-2',
            activeTab === 'alerts' ? 'bg-red-600/20 text-red-400 border-red-500/30' : 'bg-slate-800/50 text-slate-400 border-slate-700/30 hover:text-white')}
        >
          <AlertTriangle size={14} />
          {t('theft_alerts')}
          {theftAlerts?.filter(a => !a.is_confirmed).length > 0 && (
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {theftAlerts.filter(a => !a.is_confirmed).length}
            </span>
          )}
        </button>
      </div>

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="card overflow-hidden">
          {logsLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('vehicle')}</th><th>{t('driver')}</th><th>{t('liters')}</th>
                    <th>{t('total_cost_fuel')}</th><th>{t('station_name')}</th><th>{t('date')}</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs?.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-slate-500">{t('no_fuel_logs')}</td></tr>}
                  {logs?.map(log => (
                    <tr key={log.id}>
                      <td>
                        <p className="font-medium text-white">{log.vehicle_name}</p>
                        <p className="text-xs text-slate-500 font-mono">{log.plate_number}</p>
                      </td>
                      <td className="text-slate-300">{log.driver_name || '--'}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Droplets size={12} className="text-amber-400" />
                          <span className="font-mono">{parseFloat(log.liters).toFixed(1)} {t('liter')}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <DollarSign size={12} className="text-emerald-400" />
                          <span className="font-mono">{parseFloat(log.total_cost).toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="text-slate-400">{log.station_name || '--'}</td>
                      <td className="text-xs text-slate-500">
                        {new Date(log.fuel_date).toLocaleString(i18n.language === 'ar' ? 'ar-OM' : 'en-US')}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => { setModal(log); setShowModal(true); }} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-amber-400 transition-colors">
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="card overflow-hidden">
          {alertsLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('vehicle')}</th><th>{t('alert_type')}</th><th>{t('value')}</th>
                    <th>{t('date')}</th><th>{t('status')}</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {theftAlerts?.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-500">{t('no_theft_alerts')}</td></tr>}
                  {theftAlerts?.map(alert => (
                    <tr key={alert.id} className={clsx(!alert.is_confirmed && 'bg-red-500/5')}>
                      <td>
                        <p className="font-medium text-white">{alert.vehicle_name}</p>
                        <p className="text-xs text-slate-500 font-mono">{alert.plate_number}</p>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-red-400">
                          <AlertTriangle size={12} />
                          <span>{alert.alert_type}</span>
                        </div>
                      </td>
                      <td className="font-mono text-slate-300">{alert.alert_value}</td>
                      <td className="text-xs text-slate-500">
                        {new Date(alert.detected_at).toLocaleString(i18n.language === 'ar' ? 'ar-OM' : 'en-US')}
                      </td>
                      <td>
                        <span className={clsx('text-xs px-2 py-1 rounded-lg font-medium',
                          alert.is_confirmed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400')}>
                          {alert.is_confirmed ? t('alert_confirmed') : t('alert_under_review')}
                        </span>
                      </td>
                      <td>
                        {!alert.is_confirmed && (
                          <button
                            onClick={() => {
                              const notes = prompt(t('add_notes'));
                              if (notes !== null) confirmAlertMutation.mutate({ id: alert.id, notes });
                            }}
                            className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && <FuelLogModal log={modal} vehicles={vehicles} drivers={drivers} mutation={saveMutation} onClose={() => setShowModal(false)} />}
    </div>
  );
}
