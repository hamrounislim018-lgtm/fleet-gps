import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, MapPin, Car, Users, Shield,
  Bell, BarChart3, UserCog, LogOut, ChevronRight,
  Wrench, ClipboardList, Fuel, TrendingUp, Thermometer, Building2, Activity
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import clsx from 'clsx';

const navGroups = [
  {
    label: 'التتبع والأسطول',
    items: [
      { path: '/',            icon: LayoutDashboard, label: 'dashboard',   exact: true },
      { path: '/tracking',    icon: MapPin,           label: 'tracking' },
      { path: '/vehicles',    icon: Car,              label: 'vehicles' },
      { path: '/drivers',     icon: Users,            label: 'drivers' },
    ]
  },
  {
    label: 'العمليات',
    items: [
      { path: '/tasks',       icon: ClipboardList,   label: 'tasks' },
      { path: '/maintenance', icon: Wrench,           label: 'maintenance' },
      { path: '/fuel',        icon: Fuel,             label: 'fuel' },
      { path: '/driver-behavior', icon: TrendingUp,       label: 'behavior' },
      { path: '/temperature', icon: Thermometer,      label: 'temperature' },
    ]
  },
  {
    label: 'التقارير والتنبيهات',
    items: [
      { path: '/geofences',   icon: Shield,           label: 'geofences' },
      { path: '/alerts',      icon: Bell,             label: 'alerts' },
      { path: '/reports',     icon: BarChart3,        label: 'reports' },
      { path: '/analytics',   icon: Activity,         label: 'analytics' },
    ]
  },
  {
    label: 'الإدارة',
    items: [
      { path: '/users',       icon: UserCog,          label: 'users',     roles: ['super_admin', 'admin'] },
      { path: '/companies',   icon: Building2,        label: 'companies', roles: ['super_admin'] },
    ]
  }
];

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };


  return (
    <>
      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 start-0 z-30 w-64 flex flex-col transition-transform duration-300',
        'bg-[#080f1e] border-e border-slate-800/60',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shadow-lg shadow-emerald-900/50 flex-shrink-0">
              <MapPin size={18} className="text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm leading-tight">نظام الأسطول</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="pulse-green w-1.5 h-1.5" />
                <p className="text-xs text-emerald-400">مباشر • Live</p>
              </div>
            </div>
          </div>

          {/* Oman flag stripe */}
          <div className="flex gap-0.5 mt-4 rounded-full overflow-hidden h-0.5">
            <div className="flex-1 bg-[#DB0000]" />
            <div className="flex-1 bg-white/60" />
            <div className="flex-1 bg-[#006B3F]" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {navGroups.map(group => {
            const visibleItems = group.items.filter(item => !item.roles || item.roles.includes(user?.role));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {visibleItems.map(({ path, icon: Icon, label, exact }) => (
                    <NavLink
                      key={path}
                      to={path}
                      end={exact}
                      onClick={() => window.innerWidth < 768 && onClose()}
                      className={({ isActive }) => clsx('nav-item', isActive && 'active')}
                    >
                      <Icon size={16} strokeWidth={1.8} />
                      <span className="flex-1 text-sm">{t(label)}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-slate-800/60">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/40 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {user?.full_name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200">
            <LogOut size={16} />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
