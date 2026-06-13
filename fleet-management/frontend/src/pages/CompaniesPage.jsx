import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Building2, Plus, Edit2, Trash2, X, Users, Car, CheckCircle, XCircle, Crown, Calendar } from 'lucide-react';
import api from '../services/api';
import clsx from 'clsx';

const getPlanConfig = (t) => ({
  basic:      { label: t('plan_basic'),      color: 'text-slate-400',   bg: 'bg-slate-600/30 border-slate-600/30' },
  pro:        { label: t('plan_pro'),        color: 'text-blue-400',    bg: 'bg-blue-500/15 border-blue-500/30' },
  enterprise: { label: t('plan_enterprise'), color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30' },
});

const CompanyModal = ({ company, onClose }) => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isEdit = !!company?.id;
  const { register, handleSubmit } = useForm({ defaultValues: company || { subscription_plan: 'basic', country: 'Oman', max_vehicles: 50 } });

  const mutation = useMutation(
    (data) => isEdit ? api.put(`/companies/${company.id}`, data) : api.post('/companies', data),
    {
      onSuccess: () => { queryClient.invalidateQueries('companies'); toast.success(t('saved')); onClose(); },
      onError: (err) => toast.error(err.response?.data?.message || t('error'))
    }
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1829] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-[#0f1829]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 size={18} className="text-emerald-400" />
            {isEdit ? t('edit_company') : t('add_new_company')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(mutation.mutate)} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('company_name_en')} *</label>
              <input className="input" {...register('name', { required: true })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('company_name_ar')}</label>
              <input className="input" {...register('name_ar')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('email')}</label>
              <input type="email" className="input" {...register('email')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('phone')}</label>
              <input className="input" dir="ltr" placeholder={t('phone_placeholder')} {...register('phone')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('city')}</label>
              <input className="input" placeholder={t('city_placeholder')} {...register('city')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('country')}</label>
              <input className="input" {...register('country')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('max_vehicles')}</label>
              <input type="number" className="input" {...register('max_vehicles')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('subscription_plan')}</label>
              <select className="input" {...register('subscription_plan')}>
                <option value="basic">{t('plan_basic')}</option>
                <option value="pro">{t('plan_pro')}</option>
                <option value="enterprise">{t('plan_enterprise')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('subscription_expires')}</label>
              <input type="date" className="input" {...register('subscription_expires')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('whatsapp_alerts')}</label>
              <input className="input" dir="ltr" placeholder={t('whatsapp_placeholder')} {...register('whatsapp_number')} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('billing_email')}</label>
              <input type="email" className="input" {...register('billing_email')} />
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

export default function CompaniesPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const planConfig = getPlanConfig(t);

  const { data: overview } = useQuery('companies-overview', async () => {
    const res = await api.get('/companies/overview/stats');
    return res.data.data || {};
  });

  const { data: companies = [], isLoading } = useQuery('companies', async () => {
    const res = await api.get('/companies');
    return res.data.data || [];
  });

  const deleteMutation = useMutation(
    (id) => api.delete(`/companies/${id}`),
    { onSuccess: () => { queryClient.invalidateQueries('companies'); toast.success(t('company_disabled')); } }
  );

  const isExpired = (date) => date && new Date(date) < new Date();
  const isExpiringSoon = (date) => {
    if (!date) return false;
    const days = (new Date(date) - new Date()) / 86400000;
    return days < 30 && days > 0;
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">
            <Building2 size={22} className="text-emerald-400" />
            {t('company_management')}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('admin_dashboard')}</p>
        </div>
        <button onClick={() => { setModal(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} />{t('add_company')}
        </button>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('total_companies'),    value: overview?.total_companies    || 0, color: 'text-white' },
          { label: t('active_companies'),    value: overview?.active_companies    || 0, color: 'text-emerald-400' },
          { label: t('expired_subscriptions'), value: overview?.expired_subscriptions || 0, color: 'text-red-400' },
          { label: t('total_vehicles_companies'), value: overview?.total_vehicles    || 0, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="stat-card p-4">
            <p className={clsx('text-3xl font-bold tabular-nums', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Companies grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : companies.length === 0 ? (
        <div className="card text-center py-16">
          <Building2 size={40} className="mx-auto mb-3 text-slate-700" />
          <p className="text-slate-500 text-sm">{t('no_companies')}</p>
          <button onClick={() => { setModal(null); setShowModal(true); }} className="btn-primary mt-4 mx-auto">
            <Plus size={15} />{t('add_first_company')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map(company => {
            const plan = planConfig[company.subscription_plan] || planConfig.basic;
            const expired = isExpired(company.subscription_expires);
            const expiringSoon = isExpiringSoon(company.subscription_expires);

            return (
              <div key={company.id} className={clsx(
                'card p-5 hover:border-emerald-500/20 transition-all group',
                !company.is_active && 'opacity-60'
              )}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Building2 size={22} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{company.name}</p>
                      {company.name_ar && <p className="text-sm text-slate-400">{company.name_ar}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setModal(company); setShowModal(true); }}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => window.confirm(t('disable_company')) && deleteMutation.mutate(company.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Car size={13} className="text-slate-600" />
                    <span>{company.vehicle_count || 0} / {company.max_vehicles} {t('vehicles_count')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Users size={13} className="text-slate-600" />
                    <span>{company.user_count || 0} {t('users_count')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                  <span className={clsx('text-xs px-2.5 py-1 rounded-lg font-medium border', plan.bg, plan.color)}>
                    <Crown size={10} className="inline me-1" />
                    {plan.label}
                  </span>

                  <div className="flex items-center gap-2">
                    {company.subscription_expires && (
                      <span className={clsx('text-xs flex items-center gap-1',
                        expired ? 'text-red-400' : expiringSoon ? 'text-amber-400' : 'text-slate-500')}>
                        <Calendar size={11} />
                        {expired ? t('subscription_expired') : expiringSoon ? t('subscription_expiring_soon') : new Date(company.subscription_expires).toLocaleDateString(i18n.language === 'ar' ? 'ar-OM' : 'en-US')}
                      </span>
                    )}
                    {company.is_active
                      ? <CheckCircle size={14} className="text-emerald-400" />
                      : <XCircle size={14} className="text-red-400" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <CompanyModal company={modal} onClose={() => setShowModal(false)} />}
    </div>
  );
}
