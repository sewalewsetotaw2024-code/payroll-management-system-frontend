import axios from 'axios';
import { tokenStorage } from '../../../lib/token';
import type { PayslipTemplate } from '../types/payslipTemplate.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface ApiResponse<T> { success: boolean; message: string; data: T; }

export const payslipTemplateApi = {
  list: () =>
    api.get<ApiResponse<PayslipTemplate[]>>('/payslip-templates').then(r => r.data.data),

  getById: (id: string) =>
    api.get<ApiResponse<PayslipTemplate>>(`/payslip-templates/${id}`).then(r => r.data.data),

  create: (data: { name: string; language?: string; isDefault?: boolean; htmlContent?: string }) =>
    api.post<ApiResponse<PayslipTemplate>>('/payslip-templates', data).then(r => r.data.data),

  update: (id: string, data: { name?: string; language?: string; isDefault?: boolean; htmlContent?: string }) =>
    api.put<ApiResponse<PayslipTemplate>>(`/payslip-templates/${id}`, data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/payslip-templates/${id}`),

  preview: async (id: string): Promise<string> => {
    const res = await api.post<ApiResponse<{ html: string }>>(`/payslip-templates/${id}/preview`);
    return res.data.data.html;
  },

  downloadUrl: (id: string) => `${API_BASE_URL}/payslip-templates/${id}/download`,
};
