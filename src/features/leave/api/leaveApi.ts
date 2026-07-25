import axios from 'axios';
import { tokenStorage } from '../../../lib/token';
import type { LeaveApplication, LeaveSyncLog } from '../types/leave.types';

const leaveAxios = axios.create({ baseURL: import.meta.env.PROD ? 'https://payroll-management-system-backend-d2y9.onrender.com/api/v1/leave' : (import.meta.env.VITE_API_URL || '') + '/api/v1/leave' });

leaveAxios.interceptors.request.use((config) => {
    const token = tokenStorage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const leaveApi = {
    sync: async (fiscalYear?: number, payrollPeriodId?: string): Promise<{
        typesSynced: number;
        applicationsSynced: number;
    }> => {
        const res = await leaveAxios.post('/sync', { fiscalYear, payrollPeriodId });
        return res.data.data;
    },

    getApplications: async (params?: {
        employeeId?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<LeaveApplication[]> => {
        const res = await leaveAxios.get('/applications', { params });
        return res.data.data as LeaveApplication[];
    },

    getSyncLogs: async (limit?: number): Promise<LeaveSyncLog[]> => {
        const res = await leaveAxios.get('/sync-logs', { params: { limit } });
        return res.data.data as LeaveSyncLog[];
    },
};
