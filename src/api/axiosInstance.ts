import axios from 'axios';
import { tokenStorage } from '../lib/token';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.startsWith('http')) return envUrl;
  return import.meta.env.PROD ? 'https://payroll-management-system-backend-j011.onrender.com/api/v1' : '/api/v1';
};
const API_BASE_URL = `${getApiBaseUrl()}/configurations`;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — could redirect to login
      console.error('[Auth] Unauthorized — token may be expired');
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
