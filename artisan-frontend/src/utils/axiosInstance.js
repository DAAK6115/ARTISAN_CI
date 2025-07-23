// src/utils/axiosInstance.js
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api/',
});

// Interception des requêtes
axiosInstance.interceptors.request.use(
  (config) => {
    // Liste des routes publiques qui ne nécessitent pas de token
    const publicPaths = ['/accounts/register/', '/accounts/login/', '/accounts/refresh/'];
    const isPublicPath = publicPaths.some(path => config.url?.includes(path));

    if (!isPublicPath) {
      const token = localStorage.getItem('access') || localStorage.getItem('token');
      console.log("🔐 TOKEN ENVOYÉ :", token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interception des réponses : gestion automatique du refresh
axiosInstance.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config;

    // Si erreur 401 (non autorisé) et qu'on n'a pas déjà essayé de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem('refresh');
      if (refresh) {
        try {
          const res = await axios.post('http://localhost:8000/api/accounts/refresh/', {
            refresh: refresh,
          });

          const newAccess = res.data.access;
          localStorage.setItem('access', newAccess);

          // Mise à jour des headers
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
          originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;

          return axiosInstance(originalRequest); // Relance la requête initiale
        } catch (refreshError) {
          // En cas d'échec, suppression des tokens et redirection vers la page d'accueil
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
          window.location.href = '/'; // Redirige vers login
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
