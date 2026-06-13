import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import {
  Activity, TrendingUp, FileText, Download, Flame, Car
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import clsx from 'clsx';
import { format, subDays } from 'date-fns';

// Lazy-load the map to avoid SSR/context issues
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 rounded-xl text-xs">
      <p className="text-slate-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? Number(p.value).toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { t, i18n } = useTranslation();
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to,   setTo]   = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState('activity');

  const { data: dailyActivity = [] } = useQuery(
    ['daily-activity', from, to],
    async () => {
      const res = await api.get('/analytics/daily-activity?days=30');
      return (res.data.data || []).map(d => ({
        date: new Date(d.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-OM' : 'en-US', { month: 'short', day: 'numeric' }),
        distance: parseFloat(d.distance || 0),
        trips: parseInt(d.trips || 0),
        active_vehicles: parseInt(d.active_vehicles || 0),
      }));
    }
  );

  const { data: utilization = [] } = useQuery(
    ['utilization', from, to],
    async () => {
      const res = await api.get(`/analytics/utilization?from=${from}&to=${to}`);
      return res.data.data || [];
    }
  );

  const { data: heatmapData = [] } = useQuery(
    'heatmap',
    async () => {
      const res = await api.get('/analytics/heatmap');
      return res.data.data || [];
    }
  );

  const { data: compliance = [] } = useQuery(
    ['compliance', from, to],
    async () => {
      const res = await api.get(`/analytics/compliance?from=${from}&to=${to}`);
      return res.data.data || [];
    }
  );

  const tabs = [
    { key: 'activity',    label: t('daily_activity'),    icon: Activity },
    { key: 'utilization', label: t('fleet_utilization'),  icon: TrendingUp },
    { key: 'heatmap',     label: t('heatmap'),    icon: Flame },
    { key: 'compliance',  label: t('compliance_report'),   icon: FileText },
  ];

  return (
    <div className="space-y-5 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="section-title">
          <Activity size={22} className="text-emerald-400" />
          {t('analytics_advanced')}
        </h1>
        <div className="flex gap-2 items-center">
          <input type="date" className="input text-sm w-36" value={from} onChange={e => setFrom(e.target.value)} />
          <span className="text-slate-500 text-sm">—</span>
          <input type="date" className="input text-sm w-36" value={to}   onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border',
              activeTab === key
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800/50 text-slate-400 border-slate-700/30 hover:text-white'
            )}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── النشاط اليومي ── */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" />
              {t('daily_distance_km')}
            </h3>
            {dailyActivity.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Activity size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('no_data_yet')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyActivity}>
                  <defs>
                    <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="distance" name={t('distance_label')}
                    stroke="#10b981" strokeWidth={2} fill="url(#distGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Car size={16} className="text-blue-400" />
              {t('trips_and_active_vehicles')}
            </h3>
            {dailyActivity.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-sm">{t('no_data')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="trips" name={t('trips_label')} fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="active_vehicles" name={t('active_vehicles_label')} fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ── استخدام الأسطول ── */}
      {activeTab === 'utilization' && (
        <div className="card overflow-hidden">
          {utilization.length === 0 ? (
            <div className="text-center py-16">
              <TrendingUp size={40} className="mx-auto mb-3 text-slate-700" />
              <p className="text-slate-500 text-sm">لا توجد بيانات للفترة المحددة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('vehicle_label')}</th><th>{t('trips_label')}</th><th>{t('distance_label')}</th>
                    <th>{t('engine_hours_label')}</th><th>{t('avg_speed_label')}</th><th>{t('utilization_rate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {utilization.map(r => {
                    const pct = parseFloat(r.utilization_pct || 0);
                    return (
                      <tr key={r.id}>
                        <td>
                          <p className="font-medium text-white">{r.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{r.plate_number}</p>
                        </td>
                        <td className="text-slate-300 tabular-nums">{r.trip_count}</td>
                        <td className="text-emerald-400 font-mono">{parseFloat(r.total_distance || 0).toFixed(1)} {t('km')}</td>
                        <td className="text-blue-400">
                          {Math.floor((r.total_engine_seconds || 0) / 3600)}{t('hours')} {Math.floor(((r.total_engine_seconds || 0) % 3600) / 60)}{t('minutes')}
                        </td>
                        <td className="text-slate-300 font-mono">{parseFloat(r.avg_speed || 0).toFixed(1)} {t('kmh')}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full max-w-24">
                              <div
                                className={clsx('h-2 rounded-full', pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500')}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-slate-300">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── خريطة الحرارة ── */}
      {activeTab === 'heatmap' && (
        <div className="card overflow-hidden" style={{ height: 480 }}>
          <div className="px-5 py-3 border-b border-slate-800/60 flex items-center gap-2">
            <Flame size={15} className="text-orange-400" />
            <h3 className="font-semibold text-white text-sm">
              {t('heatmap_most_visited')}
              <span className="text-slate-500 font-normal text-xs ms-2">({heatmapData.length} {t('points')})</span>
            </h3>
          </div>
          <div style={{ height: 'calc(100% - 48px)', position: 'relative' }}>
            <MapContainer
              center={[23.5880, 58.3829]}
              zoom={7}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              {heatmapData.map((point, i) => {
                const weight = parseFloat(point.weight || 1);
                const radius = Math.min(4 + weight / 3, 20);
                const opacity = Math.min(0.2 + weight / 30, 0.85);
                return (
                  <CircleMarker
                    key={i}
                    center={[parseFloat(point.lat), parseFloat(point.lng)]}
                    radius={radius}
                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: opacity, weight: 0 }}
                  />
                );
              })}
            </MapContainer>
            {heatmapData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="glass px-6 py-4 rounded-xl text-center">
                  <Flame size={32} className="mx-auto mb-2 text-slate-600" />
                  <p className="text-slate-400 text-sm">{t('no_heatmap_data')}</p>
                  <p className="text-slate-600 text-xs mt-1">{t('heatmap_built_from_gps')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── تقرير الامتثال ── */}
      {activeTab === 'compliance' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <FileText size={15} className="text-emerald-400" />
              {t('compliance_working_hours')}
            </h3>
            <button
              onClick={() => window.open(`/api/reports/trips?from=${from}&to=${to}&format=excel`, '_blank')}
              className="btn-secondary text-xs"
            >
              <Download size={13} />{t('export_excel')}
            </button>
          </div>
          {compliance.length === 0 ? (
            <div className="text-center py-16">
              <FileText size={40} className="mx-auto mb-3 text-slate-700" />
              <p className="text-slate-500 text-sm">لا توجد بيانات للفترة المحددة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('vehicle_label')}</th><th>{t('driver_label')}</th><th>{t('date')}</th>
                    <th>{t('working_hours')}</th><th>{t('distance_label')}</th><th>{t('trips_label')}</th>
                    <th>{t('max_speed_label')}</th><th>{t('speed_violations')}</th>
                  </tr>
                </thead>
                <tbody>
                  {compliance.map((r, i) => (
                    <tr key={i}>
                      <td className="font-medium text-white">{r.vehicle_name}</td>
                      <td className="text-slate-400 text-sm">{r.driver_name || '--'}</td>
                      <td className="text-xs text-slate-400">{new Date(r.work_date).toLocaleDateString(i18n.language === 'ar' ? 'ar-OM' : 'en-US')}</td>
                      <td className={clsx('font-mono', parseFloat(r.hours_worked) > 10 ? 'text-red-400' : 'text-slate-300')}>
                        {parseFloat(r.hours_worked || 0).toFixed(1)} {t('hours')}
                      </td>
                      <td className="text-emerald-400 font-mono">{parseFloat(r.distance_km || 0).toFixed(1)} {t('km')}</td>
                      <td className="text-slate-300 tabular-nums">{r.trips}</td>
                      <td className={clsx('font-mono', parseFloat(r.max_speed_recorded) > 120 ? 'text-red-400' : 'text-slate-300')}>
                        {Math.round(r.max_speed_recorded || 0)} {t('kmh')}
                      </td>
                      <td className={clsx('tabular-nums font-bold', parseInt(r.speed_violations) > 0 ? 'text-red-400' : 'text-emerald-400')}>
                        {r.speed_violations}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
