import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { MapContainer, TileLayer, FeatureGroup, Circle, Polygon } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import toast from 'react-hot-toast';
import { Shield, Trash2, X, Plus } from 'lucide-react';
import api from '../services/api';
import clsx from 'clsx';

export default function GeofencesPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [drawnShape, setDrawnShape] = useState(null);
  const [form, setForm] = useState({ name: '', color: '#10b981', alert_on_enter: true, alert_on_exit: true });

  const { data: geofences, isLoading } = useQuery('geofences', async () => {
    const res = await api.get('/geofences');
    return res.data.data;
  });

  const createMutation = useMutation(
    (data) => api.post('/geofences', data),
    {
      onSuccess: () => { queryClient.invalidateQueries('geofences'); toast.success(t('success')); setShowForm(false); setDrawnShape(null); },
      onError: () => toast.error(t('error'))
    }
  );

  const deleteMutation = useMutation(
    (id) => api.delete(`/geofences/${id}`),
    { onSuccess: () => queryClient.invalidateQueries('geofences') }
  );

  const handleCreated = (e) => {
    const layer = e.layer;
    const type = e.layerType;
    if (type === 'circle') {
      const c = layer.getLatLng();
      setDrawnShape({ type: 'circle', coordinates: [[c.lat, c.lng]], center_lat: c.lat, center_lng: c.lng, radius: layer.getRadius() });
    } else {
      const coords = layer.getLatLngs()[0].map(ll => [ll.lat, ll.lng]);
      setDrawnShape({ type: type === 'rectangle' ? 'rectangle' : 'polygon', coordinates: coords });
    }
    setShowForm(true);
  };

  const handleSave = () => {
    if (!drawnShape || !form.name) { toast.error(t('draw_area_error')); return; }
    createMutation.mutate({ ...form, ...drawnShape });
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-3 animate-fade-up">

      {/* Left panel */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        <div className="card p-4">
          <h2 className="font-semibold text-white flex items-center gap-2 mb-1">
            <Shield size={16} className="text-emerald-400" />
            {t('geofences')}
          </h2>
          <p className="text-xs text-slate-500">{t('draw_area_hint')}</p>
        </div>

        <div className="card flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {isLoading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}

          {geofences?.map(geo => (
            <div key={geo.id} className="flex items-center gap-3 p-3 hover:bg-slate-800/30 transition-colors group">
              <div className="w-3 h-3 rounded-full flex-shrink-0 border-2"
                style={{ backgroundColor: geo.color + '40', borderColor: geo.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{geo.name}</p>
                <p className="text-xs text-slate-500">{geo.type} • {geo.vehicle_count} {t('vehicle_count')}</p>
              </div>
              <button onClick={() => window.confirm(t('confirm_delete')) && deleteMutation.mutate(geo.id)}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-all">
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {!isLoading && geofences?.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              <Shield size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">{t('no_areas')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 card overflow-hidden relative">
        <MapContainer center={[23.5880, 58.3829]} zoom={7} className="w-full h-full">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

          <FeatureGroup>
            <EditControl position="topright" onCreated={handleCreated}
              draw={{ rectangle: true, circle: true, polygon: true, polyline: false, marker: false, circlemarker: false }} />
          </FeatureGroup>

          {geofences?.map(geo => {
            const coords = typeof geo.coordinates === 'string' ? JSON.parse(geo.coordinates) : geo.coordinates;
            if (geo.type === 'circle') {
              return <Circle key={geo.id} center={[geo.center_lat, geo.center_lng]} radius={geo.radius}
                pathOptions={{ color: geo.color, fillOpacity: 0.15, weight: 2 }} />;
            }
            return <Polygon key={geo.id} positions={coords}
              pathOptions={{ color: geo.color, fillOpacity: 0.15, weight: 2 }} />;
          })}
        </MapContainer>

        {/* Create form */}
        {showForm && (
          <div className="absolute top-4 start-4 glass rounded-2xl p-4 w-72 z-10 animate-slide-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">{t('new_area')}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('area_name')} *</label>
                <input className="input text-sm" placeholder={t('area_name_placeholder')}
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('color')}</label>
                <input type="color" className="w-full h-9 rounded-xl border border-slate-600 cursor-pointer bg-slate-800"
                  value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" className="accent-emerald-500" checked={form.alert_on_enter}
                    onChange={e => setForm(p => ({ ...p, alert_on_enter: e.target.checked }))} />
                  {t('alert_enter')}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" className="accent-emerald-500" checked={form.alert_on_exit}
                    onChange={e => setForm(p => ({ ...p, alert_on_exit: e.target.checked }))} />
                  {t('alert_exit')}
                </label>
              </div>
              <button onClick={handleSave} disabled={createMutation.isLoading} className="btn-primary w-full text-sm">
                <Plus size={14} />
                {createMutation.isLoading ? t('saving_dots') : t('save_area')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
