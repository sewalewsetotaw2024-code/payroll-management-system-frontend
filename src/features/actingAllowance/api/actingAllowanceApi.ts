/**
 * Acting Allowance — Frontend API Client
 * =========================================
 *
 * Provides methods for rules CRUD and assignments CRUD + preview.
 * Supports 3 calculation methods: PERCENTAGE, FIXED_AMOUNT, RULE_FIXED_AMOUNT.
 * All methods unwrap the `{ success, data }` envelope.
 *
 * @module actingAllowanceApi
 */

import axios from 'axios';
import { tokenStorage } from '../../../lib/token';
import type {
    ActingAllowanceRule,
    ActingAssignment,
    PreviewResult,
    CreateAssignmentPayload,
    PreviewPayload,
    Tier,
    CalculationMethod,
} from '../types/actingAllowance.types';

/** Axios instance with auth interceptor. */
const axiosInstance = axios.create({
    baseURL: '/api/v1',
});

axiosInstance.interceptors.request.use((config) => {
    const token = tokenStorage.getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/** A position fetched from the backend (synced positions). */
export interface PositionOption {
    id: string;
    title: string;
    code: string | null;
    basicSalary: number | null;
    grossSalary: number | null;
    currency: string;
}

/** Acting Allowance API namespace. */
export const actingAllowanceApi = {
    // ── Rules ─────────────────────────────────────────────────

    listRules: async (): Promise<ActingAllowanceRule[]> => {
        const res = await axiosInstance.get('/acting-allowance-rules');
        return (res.data.data as ActingAllowanceRule[]) ?? [];
    },

    createRule: async (data: {
        calculationMethod?: CalculationMethod;
        fixedAmount?: number | null;
        basis?: string;
        tiers?: Tier[];
        effectiveDate: string;
        isActive?: boolean;
    }): Promise<ActingAllowanceRule> => {
        const res = await axiosInstance.post('/acting-allowance-rules', data);
        return res.data.data as ActingAllowanceRule;
    },

    updateRule: async (id: string, data: Partial<{
        calculationMethod: CalculationMethod;
        fixedAmount: number | null;
        basis: string;
        tiers: Tier[];
        effectiveDate: string;
        isActive: boolean;
    }>): Promise<ActingAllowanceRule> => {
        const res = await axiosInstance.put(`/acting-allowance-rules/${id}`, data);
        return res.data.data as ActingAllowanceRule;
    },

    deleteRule: async (id: string): Promise<void> => {
        await axiosInstance.delete(`/acting-allowance-rules/${id}`);
    },

    // ── Assignments ────────────────────────────────────────────

    listAssignments: async (params?: {
        status?: string;
        employeeId?: string;
    }): Promise<ActingAssignment[]> => {
        const res = await axiosInstance.get('/acting-assignments', { params });
        return (res.data.data as ActingAssignment[]) ?? [];
    },

    createAssignment: async (data: CreateAssignmentPayload): Promise<ActingAssignment> => {
        const res = await axiosInstance.post('/acting-assignments', data);
        return res.data.data as ActingAssignment;
    },

    getAssignment: async (id: string): Promise<ActingAssignment> => {
        const res = await axiosInstance.get(`/acting-assignments/${id}`);
        return res.data.data as ActingAssignment;
    },

    updateAssignment: async (id: string, data: Partial<{
        replacedEmployeeId: string | null;
        actingPositionId: string;
        actingAllowanceRuleId: string;
        actingPositionBasicSalary: number;
        actingPositionGrossSalary: number | null;
        fixedAmount: number;
        expectedEndDate: string | null;
        status: string;
        extensionApprovedBy: string;
    }>): Promise<ActingAssignment> => {
        const res = await axiosInstance.put(`/acting-assignments/${id}`, data);
        return res.data.data as ActingAssignment;
    },

    deleteAssignment: async (id: string): Promise<void> => {
        await axiosInstance.delete(`/acting-assignments/${id}`);
    },

    /** GET /positions — List active positions for the company. */
    listPositions: async (): Promise<PositionOption[]> => {
        const res = await axiosInstance.get('/positions');
        return (res.data.data as PositionOption[]) ?? [];
    },

    previewAllowance: async (data: PreviewPayload): Promise<PreviewResult> => {
        const res = await axiosInstance.post('/acting-assignments/preview', data);
        return res.data.data as PreviewResult;
    },
};
