// src/utils/axiosInstance.js
import axios from "axios";

// On choisit l'URL de base en fonction de l'environnement
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8000/api"                  // dev
    : "https://artisan-ci-backend.onrender.com/api"); // prod Render

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// --- Interception des requêtes ---
axiosInstance.interceptors.request.use(
  config => {
    // routes publiques
    const publicPaths = [
      "/accounts/register/",
      "/accounts/login/",
      "/accounts/refresh/",
    ];
    const isPublicPath = publicPaths.some(path =>
      config.url?.includes(path)
    );

    if (!isPublicPath) {
      const token =
        localStorage.getItem("access") || localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  error => Promise.reject(error)
);

// --- Interception des réponses : refresh automatique ---
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        try {
          // ⚠️ ICI on utilise axiosInstance + même baseURL, plus de localhost
          const res = await axiosInstance.post("/accounts/refresh/", {
            refresh,
          });

          const newAccess = res.data.access;
          localStorage.setItem("access", newAccess);

          axiosInstance.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${newAccess}`;
          originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;

          return axiosInstance(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          window.location.href = "/"; // ou /login selon ton routing
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
