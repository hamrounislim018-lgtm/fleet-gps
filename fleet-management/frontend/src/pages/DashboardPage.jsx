import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import {
  Car, Navigation, ParkingCircle, WifiOff,
  Bell, Route, Gauge, TrendingUp, Activity
} from 'lucide-react';
import api from '../services/api';
import mqttService from '../services/mqtt';
import clsx from 'clsx';

// ── Stat Card ──────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, sub, gradient }) => (
  <div className={clsx('stat-card group', gradient && `border-${color}-500/20`)}>
    {/* Glow */}
    <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradient} pointer-events-none`} />

    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
        <p className={clsx('text-4xl font-bold mt-2 tabular-nums', color)}>{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
      <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', `bg-${color.split('-')[1]}-500/10`)}>
        <Icon size={20} className={color} strokeWidth={1.8} />
      </div>
    </div>
  </div>
);

// ── Status dot ─────────────────────────────────────────────
const StatusDot = ({ status }) => {
  const map = {
    moving:  'pulse-green',
    idle:    'pulse-amber',
    stopped: 'pulse-red',
    offline: 'pulse-gray'
  };
  return <span className={map[status] || 'pulse-gray'} />;
};

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const [vehicles, setVehicles] = useState([]);

  const { data: stats, isLoading: statsLoading } = useQuery('dashboard-stats', async () => {
    const res = await api.get('/tracking/stats');
    return res.data.data;
  }, { refetchInterval: 30000 });

  const { data: initialVehicles } = useQuery('live-vehicles-dash', async () => {
    const res = await api.get('/tracking/live');
    return res.data.data;
  }, { refetchInterval: 15000 });

  useEffect(() => { if (initialVehicles) setVehicles(initialVehicles); }, [initialVehicles]);

  // Real-time position updates
  useEffect(() => {
    // Connect to MQTT broker
    const brokerUrl = 'ws://localhost:1884'; // Default MQTT WebSocket port
    mqttService.connect(brokerUrl);

    const unsub = mqttService.on('position_update', (data) => {
      setVehicles(prev => prev.map(v =>
        v.id === data.vehicleId ? { ...v, speed: data.speed, gps_status: data.status } : v
      ));
    });
    return () => {
      unsub();
      mqttService.disconnect();
    };
  }, []);

  const v = stats?.vehicles || {};

  const statCards = [
    { icon: Car,           label: t('total_vehicles'),   value: v.total   || 0, color: 'text-blue-400',    gradient: 'from-blue-500/5 to-transparent' },
    { icon: Navigation,    label: t('moving_vehicles'),  value: v.moving  || 0, color: 'text-emerald-400', gradient: 'from-emerald-500/5 to-transparent' },
    { icon: ParkingCircle, label: t('stopped_vehicles'), value: v.stopped || 0, color: 'text-red-400',     gradient: 'from-red-500/5 to-transparent' },
    { icon: WifiOff,       label: t('offline_vehicles'), value: v.offline || 0, color: 'text-slate-400',   gradient: 'from-slate-500/5 to-transparent' },
    { icon: Bell,          label: t('unread_alerts'),    value: stats?.alerts?.unread_alerts || 0, color: 'text-amber-400', gradient: 'from-amber-500/5 to-transparent' },
    { icon: Route,         label: t('trips_today'),      value: stats?.trips?.trips_today || 0,
      color: 'text-purple-400', gradient: 'from-purple-500/5 to-transparent',
      sub: `${parseFloat(stats?.trips?.distance_today || 0).toFixed(0)} {t('km')} {t('distance_today_dash')}` }
  ];

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">
            <Activity size={22} className="text-emerald-400" />
            {t('dashboard')}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('welcome_message')}</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <span className="pulse-green" />
          <span className="text-xs text-emerald-400 font-medium">{t('live_tracking_label')}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      {/* Vehicle list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Car size={16} className="text-emerald-400" />
            {t('vehicle_status')}
          </h2>
          <span className="text-xs text-slate-500">{vehicles.length} {t('vehicles_count_dash')}</span>
        </div>

        <div className="divide-y divide-slate-800/40 max-h-[420px] overflow-y-auto">
          {vehicles.length === 0 && !statsLoading && (
            <div className="text-center py-12 text-slate-500">
              <Car size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">{t('no_data')}</p>
            </div>
          )}

          {vehicles.map(vehicle => (
            <div key={vehicle.id}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors group">

              {/* Status dot */}
              <StatusDot status={vehicle.gps_status} />

              {/* Vehicle info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-white truncate group-hover:text-emerald-400 transition-colors">
                  {vehicle.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {vehicle.plate_number}
                  {vehicle.driver_name && ` • ${vehicle.driver_name}`}
                </p>
              </div>

              {/* Speed */}
              <div className="flex items-center gap-1.5 text-sm">
                <Gauge size={13} className="text-slate-500" />
                <span className={clsx('font-mono font-semibold tabular-nums',
                  vehicle.speed > 0 ? 'text-emerald-400' : 'text-slate-500')}>
                  {Math.round(vehicle.speed || 0)}
                </span>
                <span className="text-xs text-slate-600">{t('kmh')}</span>
              </div>

              {/* Status badge */}
              <span className={clsx('text-xs px-2.5 py-1 rounded-lg font-medium border', `badge-${vehicle.gps_status || 'offline'}`)}>
                {t(vehicle.gps_status || 'offline')}
              </span>

              {/* Last update */}
              <span className="text-xs text-slate-600 hidden lg:block w-20 text-end">
                {vehicle.last_update ? new Date(vehicle.last_update).toLocaleTimeString(i18n.language === 'ar' ? 'ar-OM' : 'en-US') : '--'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
