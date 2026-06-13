import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, UserCog, X, Shield } from 'lucide-react';
import api from '../services/api';
import clsx from 'clsx';

const getRoleConfig = (t) => ({
  super_admin: { label: t('role_super_admin'), color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  admin:       { label: t('role_admin'),       color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  user:        { label: t('role_user'),        color: 'bg-slate-600/30 text-slate-400 border-slate-600/30' }
});

const UserModal = ({ user, onClose, mutation }) => {
  const { t, i18n } = useTranslation();
  const isEdit = !!user?.id;
  const { register, handleSubmit } = useForm({ defaultValues: user || {} });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1829] border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCog size={18} className="text-emerald-400" />
            {isEdit ? t('edit_user') : t('add_user')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(mutation.mutate)} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('full_name')} *</label>
            <input className="input" {...register('full_name', { required: true })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('email_label')} *</label>
            <input type="email" className="input" {...register('email', { required: !isEdit })} disabled={isEdit} />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('password_label')} *</label>
              <input type="password" className="input" {...register('password', { required: !isEdit })} />
              <p className="text-xs text-slate-600 mt-1">{t('password_hint')}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('phone_label')}</label>
            <input className="input" placeholder={t('phone_placeholder')} {...register('phone')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('role_label')}</label>
            <select className="input" {...register('role')}>
              <option value="user">{t('role_user')}</option>
              <option value="admin">{t('role_admin')}</option>
            </select>
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

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const roleConfig = getRoleConfig(t);

  const { data: users, isLoading } = useQuery('users', async () => {
    const res = await api.get('/users');
    return res.data.data;
  });

  const deleteMutation = useMutation(
    (id) => api.delete(`/users/${id}`),
    { onSuccess: () => { queryClient.invalidateQueries('users'); toast.success(t('success')); } }
  );

  const saveMutation = useMutation(
    (data) => modal?.id ? api.put(`/users/${modal.id}`, data) : api.post('/users', data),
    {
      onSuccess: () => { queryClient.invalidateQueries('users'); toast.success(t('success')); setShowModal(false); },
      onError: (err) => toast.error(err.response?.data?.message || t('error'))
    }
  );

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="section-title">
          <UserCog size={22} className="text-emerald-400" />
          {t('users')}
        </h1>
        <button onClick={() => { setModal(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} />
          {t('add_user')}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr>
              <th>{t('user_label')}</th><th>{t('email_label')}</th><th>{t('phone_label')}</th>
              <th>{t('role_label')}</th><th>{t('status_label')}</th><th>{t('last_login_label')}</th><th></th>
            </tr></thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              )}
              {users?.map(user => {
                const role = roleConfig[user.role] || roleConfig.user;
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 border border-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
                          {user.full_name?.[0]}
                        </div>
                        <span className="font-medium text-white">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="text-slate-400 text-sm">{user.email}</td>
                    <td className="text-slate-400 text-sm" dir="ltr">{user.phone || '--'}</td>
                    <td>
                      <span className={clsx('text-xs px-2.5 py-1 rounded-lg font-medium border', role.color)}>
                        {role.label}
                      </span>
                    </td>
                    <td>
                      <span className={clsx('text-xs px-2.5 py-1 rounded-lg font-medium border',
                        user.is_active
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/15 text-red-400 border-red-500/30')}>
                        {user.is_active ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">
                      {user.last_login ? new Date(user.last_login).toLocaleString(i18n.language === 'ar' ? 'ar-OM' : 'en-US') : t('never_logged_in')}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => { setModal(user); setShowModal(true); }}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => window.confirm(t('confirm_delete')) && deleteMutation.mutate(user.id)}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <UserModal user={modal} mutation={saveMutation} onClose={() => setShowModal(false)} />}
    </div>
  );
}
