import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import i18n from '../i18n';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { accessToken, refreshToken, user } = response.data.data;

        // Set language and direction
        if (user.language) {
          i18n.changeLanguage(user.language);
          document.documentElement.lang = user.language;
          document.documentElement.dir = user.language === 'ar' ? 'rtl' : 'ltr';
          localStorage.setItem('language', user.language);
        }

        set({ user, accessToken, refreshToken, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        return user;
      },

      logout: async () => {
        try {
          const { refreshToken } = get();
          await api.post('/auth/logout', { refreshToken });
        } catch {}
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },

      updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),

      setToken: (accessToken) => {
        set({ accessToken });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }
    }),
    {
      name: 'fleet-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore;
