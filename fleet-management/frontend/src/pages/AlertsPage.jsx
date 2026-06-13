import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Bell, CheckCheck, AlertTriangle, Info, XCircle, Zap } from 'lucide-react';
import api from '../services/api';
import clsx from 'clsx';

const severityConfig = {
  info:     { icon: Info,          color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  warning:  { icon: AlertTriangle, color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  critical: { icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' }
};

export default function AlertsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data, isLoading } = useQuery(['alerts', filter], async () => {
    const params = filter === 'unread' ? '?is_read=false' : '';
    const res = await api.get(`/alerts${params}&limit=100`);
    return res.data.data;
  }, { refetchInterval: 30000 });

  const markRead = useMutation(
    (id) => api.put(`/alerts/${id}/read`),
    { onSuccess: () => queryClient.invalidateQueries('alerts') }
  );

  const markAll = useMutation(
    () => api.put('/alerts/read-all'),
    { onSuccess: () => queryClient.invalidateQueries('alerts') }
  );

  const unreadCount = data?.filter(a => !a.is_read).length || 0;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">
            <Bell size={22} className="text-emerald-400" />
            {t('alerts')}
          </h1>
          {unreadCount > 0 && (
            <p className="text-xs text-amber-400 mt-0.5">{unreadCount} {t('unread_alerts_count')}</p>
          )}
        </div>
        <button onClick={() => markAll.mutate()} className="btn-secondary text-sm">
          <CheckCheck size={15} />
          {t('mark_all_read')}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all',    label: t('all_label') },
          { key: 'unread', label: t('unread_label') }
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              filter === f.key
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/30')}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-slate-800/40">
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && data?.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Bell size={40} className="mx-auto mb-3 opacity-20" />
            <p>{t('no_alerts')}</p>
          </div>
        )}

        {data?.map(alert => {
          const cfg = severityConfig[alert.severity] || severityConfig.info;
          const Icon = cfg.icon;
          return (
            <div key={alert.id}
              className={clsx('flex items-start gap-4 p-4 transition-colors hover:bg-slate-800/20',
                !alert.is_read && 'bg-slate-800/30')}>

              <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border', cfg.bg, cfg.border)}>
                <Icon size={16} className={cfg.color} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-white">{alert.title_ar || alert.title}</p>
                  {!alert.is_read && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" />}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{alert.message}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-slate-600 font-mono bg-slate-800 px-2 py-0.5 rounded">
                    {alert.plate_number}
                  </span>
                  <span className="text-xs text-slate-600">
                    {new Date(alert.created_at).toLocaleString(i18n.language === 'ar' ? 'ar-OM' : 'en-US')}
                  </span>
                </div>
              </div>

              {!alert.is_read && (
                <button onClick={() => markRead.mutate(alert.id)}
                  className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors flex-shrink-0 px-2 py-1 rounded-lg hover:bg-emerald-500/10">
                  {t('mark_read')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
