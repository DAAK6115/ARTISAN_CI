import axios from 'axios';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  updateTokens,
} from './auth';
import { notifyDataChanged } from './dataSync';

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/$/, '') || (isLocalhost
  ? 'http://localhost:8000/api'
  : 'https://artisan-ci-backend.onrender.com/api');

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

const publicPaths = [
  '/accounts/register/',
  '/accounts/login/',
  '/accounts/logout/',
  '/accounts/refresh/',
  '/accounts/password-reset/request/',
  '/accounts/password-reset/confirm/',
];

const isPublicPath = (url = '') => publicPaths.some((path) => url.includes(path));

let refreshPromise = null;

async function refreshSession() {
  if (refreshPromise) return refreshPromise;

  const refresh = getRefreshToken();
  if (!refresh) throw new Error('Aucun jeton de rafraîchissement.');

  refreshPromise = axios
    .post(`${API_BASE_URL}/accounts/refresh/`, { refresh }, { timeout: 20000 })
    .then((response) => {
      const { access, refresh: rotatedRefresh } = response.data;
      if (!access) throw new Error('Réponse de rafraîchissement invalide.');
      updateTokens({ access, refresh: rotatedRefresh });
      return access;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

axiosInstance.interceptors.request.use(
  (config) => {
    if (!isPublicPath(config.url)) {
      const access = getAccessToken();
      if (access) {
        config.headers.Authorization = `Bearer ${access}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => {
    const method = String(response.config?.method || 'get').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      window.setTimeout(() => notifyDataChanged({
        method,
        url: response.config?.url || '',
      }), 0);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isPublicPath(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccess = await refreshSession();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      clearSession();
      if (window.location.pathname !== '/login') {
        window.location.replace('/login?reason=session-expired');
      }
      return Promise.reject(refreshError);
    }
  }
);

export default axiosInstance;
