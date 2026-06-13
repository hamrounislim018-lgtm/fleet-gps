import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Thermometer, Plus, X, AlertTriangle, Snowflake, Flame } from 'lucide-react';
import api from '../services/api';
import clsx from 'clsx';

const SensorModal = ({ onClose, vehicles }) => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: { min_temp: -20, max_temp: 8 } });

  const mutation = useMutation(
    (data) => api.post('/temperature/sensors', data),
    {
      onSuccess: () => { queryClient.invalidateQueries('temp-sensors'); toast.success(t('sensor_added')); onClose(); },
      onError: () => toast.error(t('error'))
    }
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1829] border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Thermometer size={18} className="text-blue-400" />
            {t('add_temp_sensor')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(mutation.mutate)} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('vehicle')} *</label>
            <select className="input" {...register('vehicle_id', { required: true })}>
              <option value="">-- {t('select_vehicle_label')} --</option>
              {vehicles?.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate_number})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('sensor_name')} *</label>
            <input className="input" placeholder={t('sensor_name_placeholder')} {...register('sensor_name', { required: true })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('sensor_name_ar')}</label>
            <input className="input" {...register('sensor_name_ar')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('min_temp')}</label>
              <input type="number" step="0.1" className="input" {...register('min_temp')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('max_temp')}</label>
              <input type="number" step="0.1" className="input" {...register('max_temp')} />
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

export default function TemperaturePage() {
  const { t, i18n } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  const { data: vehicles = [] } = useQuery('vehicles-temp', async () => {
    const res = await api.get('/vehicles?limit=200');
    return res.data.data || [];
  });

  const { data: sensors = [], isLoading } = useQuery('temp-sensors', async () => {
    const res = await api.get('/temperature/sensors');
    return res.data.data || [];
  });

  const { data: tempAlerts = [] } = useQuery('temp-alerts', async () => {
    const res = await api.get('/temperature/alerts');
    return res.data.data || [];
  });

  const getTempStatus = (temp, min, max) => {
    if (temp < min) return { label: t('very_cold'), color: 'text-blue-400',    bg: 'bg-blue-500/15 border-blue-500/30' };
    if (temp > max) return { label: t('very_hot'),  color: 'text-red-400',     bg: 'bg-red-500/15 border-red-500/30' };
    return              { label: t('normal_temp'),         color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' };
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">
            <Thermometer size={22} className="text-blue-400" />
            {t('temperature_monitoring')}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('temp_subtitle')}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} />{t('add_sensor')}
        </button>
      </div>

      {/* Temperature alerts */}
      {tempAlerts.length > 0 && (
        <div className="card p-4 border border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-400" />
            <h3 className="font-semibold text-red-400 text-sm">{tempAlerts.length} {t('temp_alerts_24h')}</h3>
          </div>
          {tempAlerts.slice(0, 3).map((a, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-800/60 px-3 py-2 rounded-xl mb-1.5">
              <div>
                <p className="text-sm text-white">{a.vehicle_name} · {a.sensor_name}</p>
                <p className="text-xs text-red-300">
                  {parseFloat(a.temperature).toFixed(1)}°م
                  · {t('range')}: {a.min_temp}°م ~ {a.max_temp}°م
                  · {new Date(a.created_at).toLocaleString(i18n.language === 'ar' ? 'ar-OM' : 'en-US')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sensors grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sensors.length === 0 ? (
        <div className="card text-center py-16">
          <Thermometer size={40} className="mx-auto mb-3 text-slate-700" />
          <p className="text-slate-500 text-sm">{t('no_sensors')}</p>
          <p className="text-slate-600 text-xs mt-1">{t('add_sensor_hint')}</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4 mx-auto">
            <Plus size={15} />{t('add_sensor')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sensors.map(sensor => {
            const temp = sensor.last_temp !== null ? parseFloat(sensor.last_temp) : null;
            const status = temp !== null ? getTempStatus(temp, sensor.min_temp, sensor.max_temp) : null;

            return (
              <div key={sensor.id} className="card p-5 hover:border-blue-500/20 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center',
                      status ? (temp < sensor.min_temp ? 'bg-blue-500/10 border border-blue-500/20' : temp > sensor.max_temp ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20') : 'bg-slate-800')}>
                      {temp !== null && temp < sensor.min_temp
                        ? <Snowflake size={22} className="text-blue-400" />
                        : <Thermometer size={22} className={temp !== null && temp > sensor.max_temp ? 'text-red-400' : 'text-emerald-400'} />}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{sensor.sensor_name}</p>
                      <p className="text-xs text-slate-400">{sensor.vehicle_name}</p>
                    </div>
                  </div>
                  {status && (
                    <span className={clsx('text-xs px-2 py-0.5 rounded-lg border font-medium', status.bg, status.color)}>
                      {status.label}
                    </span>
                  )}
                </div>

                <div className="text-center py-3 border-t border-slate-800/60">
                  {temp !== null ? (
                    <>
                      <p className={clsx('text-4xl font-bold tabular-nums', status?.color || 'text-white')}>
                        {temp.toFixed(1)}°م
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {t('range')}: {sensor.min_temp}°م ~ {sensor.max_temp}°م
                      </p>
                    </>
                  ) : (
                    <p className="text-slate-500 text-sm">{t('no_readings')}</p>
                  )}
                  {sensor.last_reading && (
                    <p className="text-xs text-slate-600 mt-1">
                      آخر قراءة: {new Date(sensor.last_reading).toLocaleTimeString(i18n.language === 'ar' ? 'ar-OM' : 'en-US')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <SensorModal vehicles={vehicles} onClose={() => setShowModal(false)} />}
    </div>
  );
}
