import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Award, AlertTriangle, Zap, Clock, Gauge, User } from 'lucide-react';
import api from '../services/api';
import clsx from 'clsx';
import { format, subDays } from 'date-fns';

const gradeConfig = {
  A: { color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  B: { color: 'text-blue-400',    bg: 'bg-blue-500/15 border-blue-500/30' },
  C: { color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30' },
  D: { color: 'text-orange-400',  bg: 'bg-orange-500/15 border-orange-500/30' },
  F: { color: 'text-red-400',     bg: 'bg-red-500/15 border-red-500/30' },
};

export default function DriverBehaviorPage() {
  const { t, i18n } = useTranslation();
  const [from] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to]   = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: scores = [], isLoading } = useQuery(['driver-scores', from, to], async () => {
    const res = await api.get(`/driver-behavior/scores?from=${from}&to=${to}`);
    return res.data.data || [];
  });

  const { data: events = [] } = useQuery('behavior-events', async () => {
    const res = await api.get('/driver-behavior/events?limit=50');
    return res.data.data || [];
  });

  const getEventTypeLabel = (t) => ({
    harsh_brake:  { label: t('harsh_brake'),     color: 'text-red-400',    icon: '⛔' },
    harsh_accel:  { label: t('harsh_accel'),      color: 'text-amber-400',  icon: '🚀' },
    speeding:     { label: t('speeding_behavior'),   color: 'text-orange-400', icon: '⚡' },
    sharp_turn:   { label: t('sharp_turn'),     color: 'text-yellow-400', icon: '↩️' },
    idle_long:    { label: t('idle_long'),      color: 'text-slate-400',  icon: '💤' },
  });

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">
            <TrendingUp size={22} className="text-emerald-400" />
            {t('driver_behavior')}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('behavior_subtitle')}</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/60 flex items-center gap-2">
          <Award size={16} className="text-amber-400" />
          <h2 className="font-semibold text-white">{t('driver_ranking')}</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : scores.length === 0 ? (
          <div className="text-center py-16">
            <Award size={40} className="mx-auto mb-3 text-slate-700" />
            <p className="text-slate-500 text-sm">{t('no_behavior_data')}</p>
            <p className="text-slate-600 text-xs mt-1">{t('behavior_data_hint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('rank')}</th><th>{t('driver')}</th><th>{t('vehicle')}</th><th>{t('points')}</th>
                  <th>{t('grade')}</th><th>{t('speeding_behavior')}</th><th>{t('harsh_brake')}</th>
                  <th>{t('harsh_accel')}</th><th>{t('distance')}</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s, idx) => {
                  const grade = s.grade || 'F';
                  const gc = gradeConfig[grade] || gradeConfig.F;
                  const score = parseFloat(s.avg_score || 0);
                  return (
                    <tr key={s.id}>
                      <td className="text-slate-400 font-bold">#{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
                            {s.full_name?.[0] || 'S'}
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">{s.full_name}</p>
                            {s.full_name_ar && <p className="text-xs text-slate-500">{s.full_name_ar}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-400 text-sm">{s.vehicle_name || '--'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-700 rounded-full max-w-20">
                            <div className={clsx('h-2 rounded-full', score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                              style={{ width: `${Math.min(score, 100)}%` }} />
                          </div>
                          <span className={clsx('font-bold tabular-nums text-sm', gc.color)}>{score.toFixed(0)}</span>
                        </div>
                      </td>
                      <td>
                        <span className={clsx('text-xs px-2.5 py-1 rounded-lg font-bold border', gc.bg, gc.color)}>
                          {grade}
                        </span>
                      </td>
                      <td className="text-red-400 tabular-nums">{s.total_speeding || 0}</td>
                      <td className="text-orange-400 tabular-nums">{s.total_harsh_brake || 0}</td>
                      <td className="text-amber-400 tabular-nums">{s.total_harsh_accel || 0}</td>
                      <td className="text-slate-300 font-mono">{parseFloat(s.total_distance || 0).toFixed(0)} {t('km')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent events */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/60 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400" />
          <h2 className="font-semibold text-white">{t('recent_events')}</h2>
        </div>
        {events.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">{t('no_recent_events')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40 max-h-80 overflow-y-auto">
            {events.map(ev => {
              const et = getEventTypeLabel(t)[ev.event_type] || { label: ev.event_type, color: 'text-slate-400', icon: '⚠️' };
              return (
                <div key={ev.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/30">
                  <span className="text-lg">{et.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{ev.driver_name || t('undefined_driver')}</p>
                    <p className={clsx('text-xs', et.color)}>{et.label}
                      {ev.value && <span className="text-slate-400 ms-1">({parseFloat(ev.value).toFixed(1)})</span>}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-xs text-slate-500">{ev.vehicle_name}</p>
                    <p className="text-xs text-slate-600">{new Date(ev.created_at).toLocaleString(i18n.language === 'ar' ? 'ar-OM' : 'en-US')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
