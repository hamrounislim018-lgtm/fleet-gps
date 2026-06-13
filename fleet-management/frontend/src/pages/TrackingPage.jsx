import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useQuery } from 'react-query';
import { Search, Navigation, Gauge, Fuel, Clock, MapPin, X, Car } from 'lucide-react';
import api from '../services/api';
import mqttService from '../services/mqtt';
import clsx from 'clsx';

// Custom marker icon
const createIcon = (status) => {
  const colors = { moving: '#10b981', idle: '#f59e0b', stopped: '#ef4444', offline: '#475569' };
  const c = colors[status] || colors.offline;
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:36px;height:36px;">
        <div style="
          width:36px;height:36px;background:${c};border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);border:3px solid rgba(255,255,255,0.9);
          box-shadow:0 4px 16px rgba(0,0,0,0.5),0 0 0 4px ${c}30;
        "></div>
        <div style="
          position:absolute;top:50%;left:50%;transform:translate(-50%,-60%);
          width:10px;height:10px;background:white;border-radius:50%;opacity:0.9;
        "></div>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38]
  });
};

export default function TrackingPage() {
  const { t, i18n } = useTranslation();
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState([]);
  const [mapRef, setMapRef] = useState(null);

  const { data: initial } = useQuery('live-tracking', async () => {
    const res = await api.get('/tracking/live');
    return res.data.data;
  }, { refetchInterval: 15000 });

  useEffect(() => { if (initial) setVehicles(initial); }, [initial]);

  useEffect(() => {
    // Connect to MQTT broker
    const brokerUrl = 'ws://localhost:1884'; // Default MQTT WebSocket port
    mqttService.connect(brokerUrl);

    const unsub = mqttService.on('position_update', (data) => {
      setVehicles(prev => prev.map(v =>
        v.id === data.vehicleId
          ? { ...v, latitude: data.latitude, longitude: data.longitude, speed: data.speed, gps_status: data.status }
          : v
      ));
    });
    return () => {
      unsub();
      mqttService.disconnect();
    };
  }, []);

  const handleSelect = async (vehicle) => {
    setSelected(vehicle);
    if (mapRef && vehicle.latitude && vehicle.longitude) {
      mapRef.flyTo([vehicle.latitude, vehicle.longitude], 15, { duration: 1.5 });
    }
    try {
      const from = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const res = await api.get(`/vehicles/${vehicle.id}/history?from=${from}&limit=500`);
      setHistory(res.data.data.map(p => [p.latitude, p.longitude]));
    } catch { setHistory([]); }
  };

  const filtered = vehicles.filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.plate_number?.toLowerCase().includes(search.toLowerCase())
  );

  const statusCount = {
    moving:  vehicles.filter(v => v.gps_status === 'moving').length,
    stopped: vehicles.filter(v => v.gps_status === 'stopped').length,
    offline: vehicles.filter(v => !v.gps_status || v.gps_status === 'offline').length,
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-3 animate-fade-up">

      {/* Left panel */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">

        {/* Status summary */}
        <div className="card p-3 grid grid-cols-3 gap-2 text-center">
          {[
            { label: t('moving_label'), value: statusCount.moving,  color: 'text-emerald-400', dot: 'pulse-green' },
            { label: t('stopped_label'), value: statusCount.stopped, color: 'text-red-400',     dot: 'pulse-red' },
            { label: t('offline_label'), value: statusCount.offline, color: 'text-slate-400',   dot: 'pulse-gray' },
          ].map(s => (
            <div key={s.label} className="py-1">
              <div className="flex justify-center mb-1"><span className={s.dot} /></div>
              <p className={clsx('text-xl font-bold tabular-nums', s.color)}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input ps-9 text-sm" placeholder={t('search')}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Vehicle list */}
        <div className="card flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {filtered.map(v => (
            <button key={v.id} onClick={() => handleSelect(v)}
              className={clsx(
                'w-full text-start px-3 py-3 hover:bg-slate-800/40 transition-colors',
                selected?.id === v.id && 'bg-emerald-500/10 border-s-2 border-emerald-500'
              )}>
              <div className="flex items-center gap-2.5">
                <span className={clsx(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  v.gps_status === 'moving'  ? 'bg-emerald-500' :
                  v.gps_status === 'idle'    ? 'bg-amber-500' :
                  v.gps_status === 'stopped' ? 'bg-red-500' : 'bg-slate-500'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{v.name}</p>
                  <p className="text-xs text-slate-500">{v.plate_number}</p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {Math.round(v.speed || 0)} <span className="text-slate-600">{t('kmh')}</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 card overflow-hidden relative">
        <MapContainer
          center={[23.5880, 58.3829]}
          zoom={7}
          className="w-full h-full"
          zoomControl={false}
          ref={setMapRef}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          {history.length > 1 && (
            <Polyline positions={history} color="#10b981" weight={3} opacity={0.8}
              dashArray="8 4" />
          )}

          {filtered.map(v => {
            if (!v.latitude || !v.longitude) return null;
            return (
              <Marker key={v.id} position={[v.latitude, v.longitude]}
                icon={createIcon(v.gps_status)}
                eventHandlers={{ click: () => handleSelect(v) }}>
                <Popup>
                  <div className="min-w-52 text-sm space-y-1.5">
                    <p className="font-bold text-base border-b border-slate-700 pb-2 mb-2">{v.name}</p>
                    <p>🚗 {v.plate_number}</p>
                    <p>👤 {v.driver_name || t('no_driver')}</p>
                    <p>⚡ {Math.round(v.speed || 0)} {t('kmh')}</p>
                    {v.fuel_level && <p>⛽ {Math.round(v.fuel_level)}%</p>}
                    <p className="text-slate-400 text-xs pt-1">
                      {v.last_update ? new Date(v.last_update).toLocaleString(i18n.language === 'ar' ? 'ar-OM' : 'en-US') : '--'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Map label */}
        <div className="absolute top-3 start-3 z-10 glass px-3 py-1.5 rounded-lg flex items-center gap-2">
          <MapPin size={12} className="text-emerald-400" />
          <span className="text-xs text-slate-300">{t('oman_label')}</span>
        </div>

        {/* Selected vehicle panel */}
        {selected && (
          <div className="absolute bottom-4 start-4 end-4 md:end-auto md:w-80 glass rounded-2xl p-4 z-10 animate-slide-in">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-white">{selected.name}</h3>
                <p className="text-xs text-slate-400">{selected.plate_number}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={clsx('text-xs px-2.5 py-1 rounded-lg font-medium border', `badge-${selected.gps_status || 'offline'}`)}>
                  {t(selected.gps_status || 'offline')}
                </span>
                <button onClick={() => { setSelected(null); setHistory([]); }}
                  className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: Gauge, label: t('kmh'), value: Math.round(selected.speed || 0), color: 'text-blue-400' },
                { icon: Fuel,  label: t('fuel_percent'), value: selected.fuel_level ? Math.round(selected.fuel_level) : '--', color: 'text-emerald-400' },
                { icon: Clock, label: t('last_update_label'), value: selected.last_update ? new Date(selected.last_update).toLocaleTimeString(i18n.language === 'ar' ? 'ar-OM' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '--', color: 'text-purple-400' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-slate-800/50 rounded-xl p-2.5">
                  <Icon size={14} className={clsx('mx-auto mb-1', color)} />
                  <p className={clsx('text-lg font-bold tabular-nums', color)}>{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            {history.length > 0 && (
              <p className="text-xs text-slate-500 text-center mt-2">
                {history.length} {t('tracking_points')} • {t('last_3_hours')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
