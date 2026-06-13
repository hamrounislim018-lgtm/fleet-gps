import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Eye, EyeOff, MapPin, Wifi } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || t('email_required') + ' / ' + t('password_required'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLang = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <div className="min-h-screen bg-[#060d1a] grid-bg flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-900/20 rounded-full blur-3xl pointer-events-none" />

      {/* Animated dots background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 bg-emerald-500/30 rounded-full animate-pulse-slow"
            style={{ top: `${15 + i * 15}%`, left: `${10 + i * 14}%`, animationDelay: `${i * 0.5}s` }} />
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* Logo area */}
        <div className="text-center mb-8">
          {/* Oman flag colors accent */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shadow-2xl shadow-emerald-900/50 border border-emerald-500/30">
                <MapPin size={36} className="text-white" strokeWidth={1.5} />
              </div>
              {/* Live indicator */}
              <div className="absolute -top-1 -end-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#060d1a]">
                <Wifi size={10} className="text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white tracking-tight">
            {t('fleet_tracking_system')}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">{t('fleet_subtitle')}</p>

          {/* Oman flag stripe */}
          <div className="flex justify-center mt-4 gap-1">
            <div className="h-1 w-8 rounded-full bg-[#DB0000]" />
            <div className="h-1 w-8 rounded-full bg-white/80" />
            <div className="h-1 w-8 rounded-full bg-[#006B3F]" />
          </div>
        </div>

        {/* Login card */}
        <div className="card-glow p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">{t('login')}</h2>
            <button onClick={toggleLang}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors">
              {i18n.language === 'ar' ? 'EN' : 'عر'}
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('email')}</label>
              <input
                type="email"
                className="input"
                placeholder="admin@fleet.com"
                {...register('email', { required: true })}
                autoComplete="email"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{t('email_required')}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pe-11"
                  placeholder="••••••••"
                  {...register('password', { required: true })}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{t('password_required')}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-base mt-2">
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('logging_in')}
                </>
              ) : (
                <>
                  <MapPin size={16} />
                  {t('login')}
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <p className="text-xs text-slate-500 text-center mb-1">{t('demo_credentials')}</p>
            <p className="text-xs text-slate-400 text-center font-mono">admin@fleet.com / Admin@123456</p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          {t('copyright')}
        </p>
      </div>
    </div>
  );
}
