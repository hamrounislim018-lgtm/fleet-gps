import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, Bell, Sun, Moon, Globe, MapPin } from 'lucide-react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import wsService from '../../services/websocket';

export default function Header({ onMenuClick }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDark, setIsDark] = useState(true);
  const [time, setTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data } = useQuery('unread-count', async () => {
    const res = await api.get('/alerts?is_read=false&limit=1');
    return res.data.pagination?.total || 0;
  }, { refetchInterval: 60000 });

  useEffect(() => { if (data !== undefined) setUnreadCount(data); }, [data]);

  useEffect(() => {
    const unsub = wsService.on('new_alert', () => setUnreadCount(p => p + 1));
    return unsub;
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark', !isDark);
    localStorage.setItem('theme', !isDark ? 'dark' : 'light');
  };

  const toggleLang = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('language', newLang);
  };

  const omaniTime = time.toLocaleTimeString('ar-OM', {
    timeZone: 'Asia/Muscat',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  const omaniDate = time.toLocaleDateString('ar-OM', {
    timeZone: 'Asia/Muscat',
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    <header className="h-14 bg-[#080f1e]/95 backdrop-blur-sm border-b border-slate-800/60 flex items-center justify-between px-4 flex-shrink-0 sticky top-0 z-20">

      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white">
          <Menu size={18} />
        </button>

        {/* Oman time */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/30">
          <MapPin size={12} className="text-emerald-400" />
          <div>
            <p className="text-xs font-mono text-white leading-none">{omaniTime}</p>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">{omaniDate} • مسقط</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Language */}
        <button onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
          <Globe size={14} />
          {i18n.language === 'ar' ? 'EN' : 'عر'}
        </button>

        {/* Theme */}
        <button onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Alerts */}
        <button onClick={() => navigate('/alerts')}
          className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-0.5 border border-[#080f1e]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
