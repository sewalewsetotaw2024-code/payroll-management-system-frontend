import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { tokenStorage } from './token';

/**
 * Standard API Response structure
 */
export interface ApiResponse<T> {
  status: 'success' | 'fail' | 'error';
  data: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Normalized API Error
 */
export interface ApiError {
  status: number;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
  isNetworkError?: boolean;
}

/**
 * Request State for useData hook
 */
export interface RequestState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  isRefreshing: boolean;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
// const BASE_URL = import.meta.env.VITE_API_URL || 'https://adiu-okr.onrender.com/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const normalized = normalizeError(error);
    if (normalized.status === 401) {
      tokenStorage.removeToken();
    }
    return Promise.reject(normalized);
  }
);

export const normalizeError = (error: any): ApiError => {
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError<any>;
    if (ax.response) {
      return {
        status: ax.response.status,
        message: ax.response.data?.message || ax.response.statusText || 'Server Error',
        errors: ax.response.data?.errors,
        code: ax.response.data?.code,
      };
    }
    if (ax.request) {
      return {
        status: 0,
        message: 'Network error. Please check your connection.',
        isNetworkError: true,
      };
    }
  }
  return {
    status: 500,
    message: error instanceof Error ? error.message : 'Unknown error',
  };
};
