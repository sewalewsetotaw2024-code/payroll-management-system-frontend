import axios from 'axios';
import { tokenStorage } from '../../../lib/token';
import type { LeaveBalance, LeaveApplication, LeaveDeduction, LeaveSyncLog, PayrollLeaveItem, LeaveSyncResult, LeaveFromAttendanceResult } from '../types/leave.types';

const leaveAxios = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || '/api/v1'}/leave` });

leaveAxios.interceptors.request.use((config) => {
    const token = tokenStorage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const leaveApi = {
    sync: async (fiscalYear?: number, payrollPeriodId?: string): Promise<{
        typesSynced: number;
        balancesSynced: number;
        applicationsSynced: number;
    }> => {
        const res = await leaveAxios.post('/sync', { fiscalYear, payrollPeriodId });
        return res.data.data;
    },

    getBalances: async (params?: {
        employeeId?: string;
        fiscalYear?: number;
        leaveType?: string;
    }): Promise<LeaveBalance[]> => {
        const res = await leaveAxios.get('/balances', { params });
        return res.data.data as LeaveBalance[];
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

    getDeductions: async (params?: {
        payrollPeriodId?: string;
        employeeId?: string;
    }): Promise<LeaveDeduction[]> => {
        const res = await leaveAxios.get('/deductions', { params });
        return res.data.data as LeaveDeduction[];
    },

    calculateDeductions: async (payrollPeriodId: string): Promise<{
        totalEmployees: number;
        totalDeductions: number;
        items: { employeeId: string; employeeName: string; leaveDays: number; deductionAmount: number }[];
    }> => {
        const res = await leaveAxios.post('/calculate-deductions', { payrollPeriodId });
        return res.data.data;
    },

    calculateLeaveFromAttendance: async (payrollPeriodId: string): Promise<LeaveFromAttendanceResult> => {
        const res = await leaveAxios.post('/calculate-from-attendance', { payrollPeriodId });
        return res.data.data;
    },

    getSyncLogs: async (limit?: number): Promise<LeaveSyncLog[]> => {
        const res = await leaveAxios.get('/sync-logs', { params: { limit } });
        return res.data.data as LeaveSyncLog[];
    },

    /**
     * Fetch PayrollLeaveItem records for a single payroll run item.
     * Used by the EmployeePayrollBreakdown modal to display per-leave-type details.
     *
     * @param payrollRunItemId - The PayrollRunItem to fetch leave data for.
     */
    getLeaveBreakdown: async (
        payrollRunItemId: string
    ): Promise<PayrollLeaveItem[]> => {
        const res = await leaveAxios.get('/breakdown', {
            params: { payrollRunItemId },
        });
        return res.data.data as PayrollLeaveItem[];
    },

    /**
     * Sync period-accurate leave for a single employee (one PayrollRunItem).
     * Fetches approved leave from the employee management system, computes
     * days-in-period with half-day support, and upserts PayrollLeaveItem records.
     *
     * @param companyId     - Company scope.
     * @param periodStart   - Payroll period start date (ISO string).
     * @param periodEnd     - Payroll period end date (ISO string).
     * @param payrollRunItemId - The specific PayrollRunItem to sync leave for.
     */
    syncLeavePeriod: async (
        companyId: number,
        periodStart: string,
        periodEnd: string,
        payrollRunItemId: string
    ): Promise<LeaveSyncResult> => {
        const res = await leaveAxios.post('/sync-period', {
            companyId,
            periodStart,
            periodEnd,
            payrollRunItemId,
        });
        return res.data.data as LeaveSyncResult;
    },

    /**
     * Sync period-accurate leave for ALL employees in a PayrollRun.
     * Fetches EMS leave data once for the entire period, then processes each
     * employee's items in a batch transaction.
     *
     * @param companyId   - Company scope.
     * @param periodStart - Payroll period start date (ISO string).
     * @param periodEnd   - Payroll period end date (ISO string).
     * @param payrollRunId - The PayrollRun whose items should be synced.
     */
    syncLeavePeriodByRun: async (
        companyId: number,
        periodStart: string,
        periodEnd: string,
        payrollRunId: string
    ): Promise<LeaveSyncResult> => {
        const res = await leaveAxios.post('/sync-period-run', {
            companyId,
            periodStart,
            periodEnd,
            payrollRunId,
        });
        return res.data.data as LeaveSyncResult;
    },

    /**
     * Fetch aggregated leave summary for a PayrollRun from existing synced data.
     * Returns total deduction amounts, employee/leave-type counts, and per-item
     * details — all computed from the payroll DB (no EMS query).
     *
     * @param payrollRunId - The PayrollRun to summarise.
     */
    getLeaveRunSummary: async (payrollRunId: string): Promise<LeaveSyncResult | null> => {
        const res = await leaveAxios.get('/run-summary', {
            params: { payrollRunId },
        });
        return res.data.data as LeaveSyncResult;
    },

    /**
     * Fetch PayrollLeaveItem records for a specific employee across all periods.
     * Includes the payroll period name/dates for context.
     * Used by EmployeeDetailModal to display the employee's leave deduction history.
     *
     * @param employeeId - Employee ID (payroll DB) to fetch leave items for.
     */
    getEmployeeLeaveItems: async (employeeId: string): Promise<PayrollLeaveItem[]> => {
        const res = await leaveAxios.get('/employee-items', {
            params: { employeeId },
        });
        return res.data.data as PayrollLeaveItem[];
    },
};
