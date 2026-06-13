import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, Car, X, Gauge } from 'lucide-react';
import api from '../services/api';
import clsx from 'clsx';

const VehicleModal = ({ vehicle, onClose, drivers }) => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isEdit = !!vehicle?.id;
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: vehicle || {} });

  const mutation = useMutation(
    (data) => isEdit ? api.put(`/vehicles/${vehicle.id}`, data) : api.post('/vehicles', data),
    {
      onSuccess: () => { queryClient.invalidateQueries('vehicles'); toast.success(t('success')); onClose(); },
      onError: (err) => toast.error(err.response?.data?.message || t('error'))
    }
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1829] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Car size={18} className="text-emerald-400" />
            {isEdit ? t('edit_vehicle') : t('add_vehicle')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(mutation.mutate)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('vehicle_name')} *</label>
              <input className="input" {...register('name', { required: true })} />
              {errors.name && <p className="text-red-400 text-xs mt-1">{t('required')}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('plate_number')} *</label>
              <input className="input" placeholder={t('plate_placeholder')} {...register('plate_number', { required: true })} />
              {errors.plate_number && <p className="text-red-400 text-xs mt-1">{t('required')}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('make')}</label>
              <input className="input" placeholder={t('make_placeholder')} {...register('make')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('model')}</label>
              <input className="input" {...register('model')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('year')}</label>
              <input type="number" className="input" placeholder={t('year_placeholder')} {...register('year')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('max_speed')}</label>
              <input type="number" className="input" defaultValue={120} {...register('max_speed')} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('driver')}</label>
              <select className="input" {...register('driver_id')}>
                <option value="">-- {t('select_driver')} --</option>
                {drivers?.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mutation.isLoading} className="btn-primary flex-1">
              {mutation.isLoading ? t('saving_dots') : t('save')}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function VehiclesPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data: vehicles = [], isLoading } = useQuery('vehicles', async () => {
    const res = await api.get('/vehicles?limit=200');
    return res.data.data || [];
  });

  const { data: drivers = [] } = useQuery('drivers-list', async () => {
    const res = await api.get('/drivers');
    return res.data.data || [];
  });

  const deleteMutation = useMutation(
    (id) => api.delete(`/vehicles/${id}`),
    {
      onSuccess: () => { queryClient.invalidateQueries('vehicles'); toast.success(t('success')); },
      onError: () => toast.error(t('error'))
    }
  );

  const filtered = vehicles.filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.plate_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="section-title">
          <Car size={22} className="text-emerald-400" />
          {t('vehicles')}
        </h1>
        <button onClick={() => { setModal(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} />{t('add_vehicle')}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input ps-9 text-sm" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-xs text-slate-500">{filtered.length} {t('vehicles_count_label')}</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Car size={40} className="mx-auto mb-3 text-slate-700" />
            <p className="text-slate-500 text-sm">{t('no_data')}</p>
            <button onClick={() => { setModal(null); setShowModal(true); }} className="btn-primary mt-4 mx-auto">
              <Plus size={15} />{t('add_vehicle')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('vehicle')}</th><th>{t('plate')}</th><th>{t('driver')}</th>
                  <th>{t('speed')}</th><th>{t('status_label')}</th><th>{t('last_update')}</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <Car size={16} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{v.name}</p>
                          <p className="text-xs text-slate-500">{v.make} {v.model} {v.year}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="font-mono text-sm bg-slate-800 px-2 py-0.5 rounded-lg">{v.plate_number}</span></td>
                    <td className="text-slate-400">{v.driver_name || <span className="text-slate-600">--</span>}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Gauge size={12} className="text-slate-500" />
                        <span className={clsx('font-mono font-semibold', (v.speed || 0) > 0 ? 'text-emerald-400' : 'text-slate-500')}>
                          {Math.round(v.speed || 0)}
                        </span>
                        <span className="text-xs text-slate-600">{t('kmh')}</span>
                      </div>
                    </td>
                    <td>
                      <span className={clsx('text-xs px-2.5 py-1 rounded-lg font-medium border', `badge-${v.gps_status || 'offline'}`)}>
                        {t(v.gps_status || 'offline')}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">
                      {v.last_update ? new Date(v.last_update).toLocaleString(i18n.language === 'ar' ? 'ar-OM' : 'en-US') : '--'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setModal(v); setShowModal(true); }}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => window.confirm(t('confirm_delete')) && deleteMutation.mutate(v.id)}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
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

      {showModal && <VehicleModal vehicle={modal} drivers={drivers} onClose={() => setShowModal(false)} />}
    </div>
  );
}
