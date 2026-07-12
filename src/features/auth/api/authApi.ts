import axios from 'axios';
import type { LoginCredentials, LoginResponse } from '../types/auth.types';
import { tokenStorage } from '../../../lib/token';

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_API_URL || 'https://adiu-okr.onrender.com/api/v1';

const authAxios = axios.create({
  baseURL: `${AUTH_BASE_URL}/auth`,
  headers: { 'Content-Type': 'application/json' },
});

const userAxios = axios.create({
  baseURL: `${AUTH_BASE_URL}/users`,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor to add token to userAxios
userAxios.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  login: (credentials: LoginCredentials) =>
    authAxios.post<LoginResponse>('/login', credentials),
  fetchMe: () => userAxios.get('/me'),
};
