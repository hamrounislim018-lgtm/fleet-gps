import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const stored = localStorage.getItem('fleet-auth');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const stored = localStorage.getItem('fleet-auth');
        if (stored) {
          const { state } = JSON.parse(stored);
          if (state?.refreshToken) {
            const response = await axios.post('/api/auth/refresh', {
              refreshToken: state.refreshToken
            });
            const { accessToken } = response.data.data;

            // Update stored token
            const parsed = JSON.parse(stored);
            parsed.state.accessToken = accessToken;
            localStorage.setItem('fleet-auth', JSON.stringify(parsed));

            original.headers.Authorization = `Bearer ${accessToken}`;
            return api(original);
          }
        }
      } catch {
        // Refresh failed - redirect to login
        localStorage.removeItem('fleet-auth');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
