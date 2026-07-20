import axios from 'axios';
import { tokenStorage } from '../../../lib/token';
import type {
    AttendanceImport,
    ImportResult,
    OtCalculationResult,
    ImportDetail,
    EmployeeDailyRecords,
    CombinedPeriodSummary,
} from '../types/attendance.types';

/**
 * Axios instance configured for the Attendance API base path.
 * Automatically attaches the Bearer token from tokenStorage on every request.
 */
const attendanceAxios = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || '/api/v1'}/attendance`,
});

attendanceAxios.interceptors.request.use((config) => {
    const token = tokenStorage.getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * API client for attendance-related operations including file import,
 * overtime calculation, and import management.
 */
export const attendanceApi = {
    /**
     * Uploads a biometric Excel file for attendance import.
     *
     * @param file - The biometric Excel file to upload.
     * @param sheetName - Optional sheet name within the workbook to import.
     * @returns Promise resolving to the import result with row-level error details.
     */
    importFile: async (file: File, sheetName?: string): Promise<ImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        if (sheetName) formData.append('sheetName', sheetName);

        const response = await attendanceAxios.post('/import', formData);
        return response.data.data as ImportResult;
    },

    /**
     * Calculate attendance summary (total hours + total days) from attendance data.
     * Results are persisted for display in the Attendance Summary tab.
     */
    calculateSummary: async (importId: string): Promise<CombinedPeriodSummary> => {
        const response = await attendanceAxios.post(`/imports/${importId}/calculate-summary`);
        return response.data.data as CombinedPeriodSummary;
    },

    /**
     * Retrieve previously calculated attendance summary for an import.
     */
    getSummary: async (importId: string): Promise<CombinedPeriodSummary | null> => {
        const response = await attendanceAxios.get(`/imports/${importId}/summary`);
        if (!response.data.success) return null;
        return response.data.data as CombinedPeriodSummary;
    },

    /** Import attendance data with the sheet name already known from client-side parsing. */
    importFileWithSheet: async (file: File, sheetName: string): Promise<ImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sheetName', sheetName);

        const response = await attendanceAxios.post('/import', formData);
        return response.data.data as ImportResult;
    },

    /**
     * Retrieves existing overtime calculation results without re-calculating.
     * Returns null if OT hasn't been calculated yet.
     *
     * @param importId - The ID of the import to get OT results for.
     * @returns Promise resolving to OT result or null if not yet calculated.
     */
    getOvertimeResults: async (importId: string): Promise<OtCalculationResult | null> => {
        const response = await attendanceAxios.get(`/imports/${importId}/overtime`);
        if (!response.data.success) return null;
        return response.data.data as OtCalculationResult;
    },

    /**
     * Triggers overtime calculation for a completed import.
     *
     * @param importId - The ID of the import to calculate overtime for.
     * @returns Promise resolving to the overtime calculation result with category breakdown.
     */
    calculateOvertime: async (importId: string): Promise<OtCalculationResult> => {
        const response = await attendanceAxios.post(`/imports/${importId}/calculate-ot`);
        return response.data.data as OtCalculationResult;
    },

    /**
     * Retrieves a paginated list of attendance imports with optional filters.
     *
     * @param params - Optional query parameters (periodLabel, source, status, page, limit).
     * @returns Promise resolving to an array of attendance imports.
     */
    listImports: async (params?: {
        periodLabel?: string;
        source?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<AttendanceImport[]> => {
        const response = await attendanceAxios.get('/imports', { params });
        return (response.data.data as AttendanceImport[]) ?? [];
    },

    /**
     * Fetches the full detail of an import by its ID, including records and summaries.
     *
     * @param importId - The unique identifier of the import.
     * @returns Promise resolving to the full import detail with records and summaries.
     */
    getImportById: async (importId: string): Promise<ImportDetail> => {
        const response = await attendanceAxios.get(`/imports/${importId}`);
        return response.data.data as ImportDetail;
    },

    /**
     * Fetches per-employee attendance data for an import, returning a flat
     * array of employee-level rows with fields like employeeName, externalId,
     * regularHours, overtimeHours, absentDays, paidLeaveDays, and actualDays.
     *
     * @param importId - The unique identifier of the import.
     * @returns Promise resolving to an array of per-employee attendance rows.
     */
    getImportEmployees: async (importId: string): Promise<any[]> => {
        const response = await attendanceAxios.get(`/imports/${importId}/employees`);
        return (response.data.data as any[]) ?? [];
    },

    /**
     * Deletes an import and its associated records.
     *
     * @param importId - The unique identifier of the import to delete.
     */
    deleteImport: async (importId: string): Promise<void> => {
        await attendanceAxios.delete(`/imports/${importId}`);
    },

    /**
     * Toggles the active status of an attendance import.
     * When activating, all other imports for the same payroll period are deactivated.
     *
     * @param importId - The unique identifier of the import to toggle.
     * @returns Promise resolving to the updated import's active state.
     */
    toggleImportActive: async (importId: string): Promise<{ id: string; isActive: boolean }> => {
        const response = await attendanceAxios.patch(`/imports/${importId}/toggle-active`);
        return response.data.data as { id: string; isActive: boolean };
    },

    /**
     * Retrieves attendance imports filtered by payroll period ID.
     *
     * Uses the existing listImports endpoint and filters results client-side
     * to include only imports belonging to the specified period.
     *
     * @param periodId - The payroll period ID to filter by.
     * @returns Promise resolving to an array of attendance imports for the period.
     */
    getAttendanceByPeriod: async (periodId: string): Promise<AttendanceImport[]> => {
        const imports = await attendanceApi.listImports();
        return imports.filter((imp) => imp.payrollPeriodId === periodId);
    },

    /**
     * Fetches the full detail of an import by its ID, including attendance records.
     *
     * Convenience alias that returns the full ImportDetail (which includes
     * attendanceRecords and monthlySummaries).
     *
     * @param importId - The unique identifier of the import.
     * @returns Promise resolving to the full import detail with records and summaries.
     */
    getAttendanceRecords: async (importId: string): Promise<ImportDetail> => {
        const response = await attendanceAxios.get(`/imports/${importId}`);
        return response.data.data as ImportDetail;
    },

    /**
     * Retrieves daily attendance records for a single employee within an import,
     * pre-grouped by month for the heatmap component.
     *
     * @param importId - The attendance import ID.
     * @param employeeId - The employee ID to get records for.
     * @returns Promise resolving to structured per-month daily records.
     */
    getEmployeeDailyRecords: async (importId: string, employeeId: string): Promise<EmployeeDailyRecords> => {
        const response = await attendanceAxios.get(`/imports/${importId}/employees/${employeeId}/daily-records`);
        return response.data.data as EmployeeDailyRecords;
    },
};
