import axios from 'axios';
import type { LoginCredentials, LoginResponse } from '../types/auth.types';
import { tokenStorage } from '../../../lib/token';

const authAxios = axios.create({
  baseURL: '/api/v1/auth',
  headers: { 'Content-Type': 'application/json' },
});

const userAxios = axios.create({
  baseURL: '/api/v1/users',
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
