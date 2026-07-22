import axios from 'axios';
import { tokenStorage } from '../../../lib/token';
import type { MyPeriodsResponse, PayslipDetail, GenerationStatus } from '../types/payslip.types';
import type { GeneratePayslipResult, BatchGenerateResult } from '../../payslipTemplates/types/payslipTemplate.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Separate axios instance for employee payslip endpoints
// (main axiosInstance has baseURL '/api/v1/configurations')
const payslipAxios = axios.create({
  baseURL: `${API_BASE_URL}/payroll`,
  headers: { 'Content-Type': 'application/json' },
});

payslipAxios.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

payslipAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('[Payslip API] Unauthorized');
    }
    return Promise.reject(error);
  },
);

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

/** Standard single-entity API response wrapper */
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ──────────────────────────────────────────────
// API Functions
// ──────────────────────────────────────────────

/**
 * API client for employee-facing payslip operations.
 */
export const payslipApi = {
  /** Get fiscal years and periods where current user has payslip data */
  getMyPeriods: () =>
    payslipAxios.get<ApiResponse<MyPeriodsResponse>>('/payslips/periods'),

  /** Get full payslip detail for a specific period (optional employeeId for HR) */
  getMyPayslipDetail: (periodId: string, employeeId?: string) =>
    payslipAxios.get<ApiResponse<PayslipDetail>>(`/payslips/period/${periodId}`, {
      params: employeeId ? { employeeId } : undefined,
    }),

  /** Generate PDF for one payslip (admin, by runItemId) */
  generatePayslipPdf: (runItemId: string, templateId?: string) =>
    payslipAxios.post<ApiResponse<GeneratePayslipResult>>(`/payslips/generate/${runItemId}`, { templateId })
      .then(r => r.data.data),

  /** Self-service: employee generates their own payslip PDF for a given period */
  generateMyPayslip: (periodId: string, templateId?: string) =>
    payslipAxios.post<ApiResponse<GeneratePayslipResult>>(`/payslips/generate-mine/${periodId}`, { templateId })
      .then(r => r.data.data),

  /** Generate PDFs for all employees in a payroll run */
  batchGeneratePayslipPdfs: (payrollRunId: string, templateId?: string) =>
    payslipAxios.post<ApiResponse<BatchGenerateResult>>(`/payslips/batch-generate/${payrollRunId}`, { templateId })
      .then(r => r.data.data),

  /** Get the URL to view/download a payslip PDF */
  getPayslipPdfUrl: (payslipId: string) =>
    `${API_BASE_URL}/payroll/payslips/${payslipId}/pdf`,

  /** Poll payslip generation status (lightweight check) */
  getPayslipStatus: async (
    payslipId: string,
  ): Promise<{ generationStatus: GenerationStatus; payslipPdfUrl: string | null; errorMessage: string | null }> => {
    const response = await payslipAxios.get<ApiResponse<PayslipDetail>>(`/payslips/self/${payslipId}`);
    const data = response.data?.data ?? response.data as any;
    return {
      generationStatus: data.generationStatus,
      payslipPdfUrl: data.payslipPdfUrl,
      errorMessage: data.errorMessage,
    };
  },

  /** Batch-update payslip visibility to DONE for a given payroll run */
  updateVisibilityForRun: (runId: string, visibility = "DONE") =>
    payslipAxios.put(`/runs/${runId}/payslips/visibility`, { visibility }),

  /** Download payslip PDF as a file */
  downloadPayslipPdf: async (payslipId: string, filename?: string) => {
    const response = await payslipAxios.get(`/payslips/${payslipId}/pdf`, {
      params: { download: 1 },
      responseType: 'blob',
    });

    // Create a blob URL and trigger download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename ?? `payslip-${payslipId}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  },
};

export default payslipAxios;
