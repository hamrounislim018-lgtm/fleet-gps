import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { BarChart3, Download, FileText, Clock, Zap, Shield } from 'lucide-react';
import api from '../services/api';
import { format, subDays } from 'date-fns';
import clsx from 'clsx';

const getTabs = (t) => [
  { key: 'trips',            label: t('report_trips'),         icon: FileText },
  { key: 'speed_violations', label: t('report_speed_violations'), icon: Zap },
  { key: 'engine_hours',     label: t('report_engine_hours'),     icon: Clock },
  { key: 'geofence',         label: t('report_geofence'),         icon: Shield },
];

const endpointMap = {
  trips: 'trips', speed_violations: 'speed-violations',
  engine_hours: 'engine-hours', geofence: 'geofence'
};

const formatDuration = (s, t) => {
  if (!s) return '--';
  return `${Math.floor(s / 3600)}${t('hours')} ${Math.floor((s % 3600) / 60)}${t('minutes')}`;
};

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('trips');
  const [from, setFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [vehicleId, setVehicleId] = useState('');

  const { data: vehicles } = useQuery('vehicles-select', async () => {
    const res = await api.get('/vehicles?limit=200');
    return res.data.data;
  });

  const { data: reportData, isLoading } = useQuery(
    ['report', tab, from, to, vehicleId],
    async () => {
      const params = new URLSearchParams({ from, to });
      if (vehicleId) params.append('vehicle_id', vehicleId);
      const res = await api.get(`/reports/${endpointMap[tab]}?${params}`);
      return res.data.data;
    }
  );

  const handleExport = (fmt) => {
    const params = new URLSearchParams({ from, to, format: fmt });
    if (vehicleId) params.append('vehicle_id', vehicleId);
    window.open(`/api/reports/${endpointMap[tab]}?${params}`, '_blank');
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <h1 className="section-title">
        <BarChart3 size={22} className="text-emerald-400" />
        {t('reports')}
      </h1>

      {/* Tab navigation */}
      <div className="flex gap-2 flex-wrap">
        {getTabs(t).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              tab === key
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/30')}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('from_date')}</label>
            <input type="date" className="input text-sm" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('to_date')}</label>
            <input type="date" className="input text-sm" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('vehicle')}</label>
            <select className="input text-sm" value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
              <option value="">-- {t('all_vehicles')} --</option>
              {vehicles?.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate_number})</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleExport('pdf')} className="btn-secondary text-sm">
              <Download size={14} />
              PDF
            </button>
            <button onClick={() => handleExport('excel')} className="btn-secondary text-sm">
              <Download size={14} />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {tab === 'trips' && (
              <table className="data-table">
                <thead><tr>
                  <th>{t('vehicle')}</th><th>{t('plate')}</th><th>{t('driver')}</th>
                  <th>{t('start_time')}</th><th>{t('distance')}</th><th>{t('duration_label')}</th>
                  <th>{t('max_speed')}</th><th>{t('avg_speed')}</th>
                </tr></thead>
                <tbody>
                  {reportData?.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-slate-500">{t('no_data')}</td></tr>}
                  {reportData?.map((r, i) => (
                    <tr key={i}>
                      <td className="font-medium text-white">{r.vehicle_name}</td>
                      <td><span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded">{r.plate_number}</span></td>
                      <td className="text-slate-400">{r.driver_name || '--'}</td>
                      <td className="text-xs text-slate-400">{r.start_time ? new Date(r.start_time).toLocaleString(i18n.language === 'ar' ? 'ar-OM' : 'en-US') : '--'}</td>
                      <td className="text-emerald-400 font-mono">{parseFloat(r.distance || 0).toFixed(1)} {t('km')}</td>
                      <td className="text-slate-300">{formatDuration(r.duration, t)}</td>
                      <td className="text-amber-400 font-mono">{Math.round(r.max_speed || 0)} {t('kmh')}</td>
                      <td className="text-slate-300 font-mono">{Math.round(r.avg_speed || 0)} {t('kmh')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'engine_hours' && (
              <table className="data-table">
                <thead><tr>
                  <th>{t('vehicle')}</th><th>{t('plate')}</th><th>{t('trips_label')}</th>
                  <th>{t('engine_hours')}</th><th>{t('idle_time')}</th><th>{t('total_distance')}</th><th>{t('max_speed')}</th>
                </tr></thead>
                <tbody>
                  {reportData?.map((r, i) => (
                    <tr key={i}>
                      <td className="font-medium text-white">{r.name}</td>
                      <td><span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded">{r.plate_number}</span></td>
                      <td className="text-slate-300">{r.trip_count}</td>
                      <td className="text-emerald-400">{formatDuration(r.total_engine_seconds, t)}</td>
                      <td className="text-amber-400">{formatDuration(r.total_idle_seconds, t)}</td>
                      <td className="text-slate-300 font-mono">{parseFloat(r.total_distance || 0).toFixed(1)} {t('km')}</td>
                      <td className="text-red-400 font-mono">{Math.round(r.max_speed_recorded || 0)} {t('kmh')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {(tab === 'speed_violations' || tab === 'geofence') && (
              <table className="data-table">
                <thead><tr>
                  <th>{t('vehicle')}</th><th>{t('plate')}</th><th>{t('alert_label')}</th><th>{t('speed')}</th><th>{t('date_time')}</th>
                </tr></thead>
                <tbody>
                  {reportData?.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-slate-500">{t('no_data')}</td></tr>}
                  {reportData?.map((r, i) => (
                    <tr key={i}>
                      <td className="font-medium text-white">{r.vehicle_name}</td>
                      <td><span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded">{r.plate_number}</span></td>
                      <td className="text-amber-400">{r.title_ar || r.title}</td>
                      <td className="text-red-400 font-mono">{r.speed ? `${Math.round(r.speed)} ${t('kmh')}` : '--'}</td>
                      <td className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString(i18n.language === 'ar' ? 'ar-OM' : 'en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
