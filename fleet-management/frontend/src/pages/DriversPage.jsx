import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, User, X, Phone, CreditCard, Car } from 'lucide-react';
import api from '../services/api';
import clsx from 'clsx';

const DriverModal = ({ driver, onClose, mutation }) => {
  const { t, i18n } = useTranslation();
  const isEdit = !!driver?.id;
  const { register, handleSubmit } = useForm({ defaultValues: driver || {} });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1829] border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User size={18} className="text-emerald-400" />
            {isEdit ? t('edit_driver') : t('add_driver')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(mutation.mutate)} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('full_name')} *</label>
              <input className="input" {...register('full_name', { required: true })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('full_name_ar')}</label>
              <input className="input" {...register('full_name_ar')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('phone_label')}</label>
              <input className="input" placeholder={t('phone_placeholder')} {...register('phone')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('email_label')}</label>
              <input type="email" className="input" {...register('email')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('license_number')}</label>
              <input className="input" {...register('license_number')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('license_expiry')}</label>
              <input type="date" className="input" {...register('license_expiry')} />
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

export default function DriversPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data: drivers, isLoading } = useQuery('drivers', async () => {
    const res = await api.get('/drivers');
    return res.data.data;
  });

  const deleteMutation = useMutation(
    (id) => api.delete(`/drivers/${id}`),
    { onSuccess: () => { queryClient.invalidateQueries('drivers'); toast.success(t('success')); } }
  );

  const saveMutation = useMutation(
    (data) => modal?.id ? api.put(`/drivers/${modal.id}`, data) : api.post('/drivers', data),
    {
      onSuccess: () => { queryClient.invalidateQueries('drivers'); toast.success(t('success')); setShowModal(false); },
      onError: () => toast.error(t('error'))
    }
  );

  // Check license expiry
  const isExpiringSoon = (date) => {
    if (!date) return false;
    const days = (new Date(date) - new Date()) / (1000 * 60 * 60 * 24);
    return days < 30 && days > 0;
  };
  const isExpired = (date) => date && new Date(date) < new Date();

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="section-title">
          <User size={22} className="text-emerald-400" />
          {t('drivers')}
        </h1>
        <button onClick={() => { setModal(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} />
          {t('add_driver')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {drivers?.map(driver => (
            <div key={driver.id} className="card p-5 hover:border-emerald-500/20 transition-all duration-300 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 border border-emerald-500/20 flex items-center justify-center">
                    <User size={22} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{driver.full_name}</p>
                    {driver.full_name_ar && <p className="text-sm text-slate-400">{driver.full_name_ar}</p>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setModal(driver); setShowModal(true); }}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => window.confirm(t('confirm_delete')) && deleteMutation.mutate(driver.id)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {driver.phone && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone size={13} className="text-slate-600" />
                    <span dir="ltr">{driver.phone}</span>
                  </div>
                )}
                {driver.license_number && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <CreditCard size={13} className="text-slate-600" />
                    <span>{driver.license_number}</span>
                    {driver.license_expiry && (
                      <span className={clsx('text-xs px-1.5 py-0.5 rounded-md ms-auto',
                        isExpired(driver.license_expiry) ? 'bg-red-500/15 text-red-400' :
                        isExpiringSoon(driver.license_expiry) ? 'bg-amber-500/15 text-amber-400' :
                        'bg-slate-700/50 text-slate-500')}>
                        {isExpired(driver.license_expiry) ? t('license_expired') :
                         isExpiringSoon(driver.license_expiry) ? t('license_expiring_soon') :
                         new Date(driver.license_expiry).toLocaleDateString(i18n.language === 'ar' ? 'ar-OM' : 'en-US')}
                      </span>
                    )}
                  </div>
                )}
                {driver.current_vehicle && (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Car size={13} />
                    <span>{driver.current_vehicle}</span>
                    <span className="text-slate-500 font-mono text-xs">({driver.plate_number})</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {drivers?.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-500">
              <User size={40} className="mx-auto mb-3 opacity-20" />
              <p>{t('no_data')}</p>
            </div>
          )}
        </div>
      )}

      {showModal && <DriverModal driver={modal} mutation={saveMutation} onClose={() => setShowModal(false)} />}
    </div>
  );
}
