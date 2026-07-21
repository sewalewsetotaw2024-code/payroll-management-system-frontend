import axios from 'axios';
import { tokenStorage } from '../../../lib/token';

// Separate axios instance for payroll processing endpoints
// (main axiosInstance has baseURL '/api/v1/configurations')
const payrollAxios = axios.create({
  baseURL: '/api/v1/payroll',
  headers: { 'Content-Type': 'application/json' },
});

payrollAxios.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

payrollAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('[Payroll API] Unauthorized');
    }
    return Promise.reject(error);
  },
);

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface PayrollPeriodInfo {
  name: string | null;
  startDate: string;
  endDate: string;
  cycle?: string;
}

export interface PayrollRun {
  id: string;
  payrollPeriodId: string;
  payrollBatchId?: string;
  status: string;
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalPension: number;
  totalBonus: number;
  totalOvertime: number;
  totalCostToCompany: number;
  employeeCount: number;
  monthlyWorkdays: number;
  processedAt: string | null;
  finalizedAt: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  payrollPeriod?: PayrollPeriodInfo;
}

export interface PayrollRunItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  workDays: number;
  basicSalary: number;
  proratedSalary: number;
  grossTaxableIncome: number;
  grossSalary: number;
  costToCompany: number;
  totalDeductions: number;
  netSalary: number;
  currency: string;
  isMidMonthHire: boolean;
  deductionCapBreached: boolean;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    departmentName: string | null;
    tinNumber: string | null;
    jobPosition: string | null;
    hireDate: string | null;
    compensation?: {
      basicSalary: number;
      grossSalary: number;
    };
  };
  payrollAllowances?: { amount: number }[];
}

export interface PayrollEarning {
  id: string;
  payrollRunItemId: string;
  earningType: string;
  label: string;
  amount: number;
  isTaxable: boolean;
}

export interface PayrollDeduction {
  id: string;
  payrollRunItemId: string;
  deductionType: string;
  label: string;
  amount: number;
  isOverridden: boolean;
}

export interface PayrollTax {
  id: string;
  payrollRunItemId: string;
  grossTaxableIncome: number;
  taxBracketId: string | null;
  appliedRate: number;
  appliedDeduction: number;
  taxAmount: number;
}

export interface PayrollPension {
  id: string;
  payrollRunItemId: string;
  basis: string;
  baseSalary: number;
  employeeContribution: number;
  employerContribution: number;
}

export interface PayrollOvertime {
  id: string;
  payrollRunItemId: string;
  category: string;
  hours: number;
  rate: number;
  hourlyRate: number;
  amount: number;
  isTaxable: boolean;
}

export interface PayrollAllowance {
  id: string;
  payrollRunItemId: string;
  label: string;
  amount: number;
  isTaxable: boolean;
  isProrated: boolean;
  proratedDays: number | null;
}

export interface PayrollProration {
  id: string;
  payrollRunItemId: string;
  hireDate: string;
  periodStart: string;
  periodEnd: string;
  totalDays: number;
  workedDays: number;
  proratedFactor: number;
}

export interface ActingAllowanceTier {
  startMonth: number;
  endMonth: number;
  percent: number;
}

export interface ActingAllowanceTierMonth {
  month: number;
  percent: number;
  amount: number;
}

export interface ActingAllowanceBreakdown {
  salaryDiff: number;
  monthsElapsed: number;
  currentMonth: number;
  tiers: ActingAllowanceTier[];
  tierBreakdown: ActingAllowanceTierMonth[];
}

export interface PayrollRunItemDetail extends PayrollRunItem {
  payrollEarnings: PayrollEarning[];
  payrollDeductions: PayrollDeduction[];
  payrollTax: PayrollTax | null;
  payrollPension: PayrollPension | null;
  payrollOvertime: PayrollOvertime[];
  payrollAllowances: PayrollAllowance[];
  payrollProration: PayrollProration | null;
  actingAllowanceBreakdown?: ActingAllowanceBreakdown | null;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  pagination: {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface RunPayrollRequest {
  payrollPeriodId: string;
  batchId?: string;
  employeeId?: string;
  page?: number;
  limit?: number;
}

export interface RunPayrollResponse {
  payrollRunId: string;
  totalEmployees: number;
  processedCount: number;
  hasMore: boolean;
}

export interface GeneratePayslipsResponse {
  runId: string;
  total: number;
  generated: number;
  skipped: number;
}

export interface SingleResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ──────────────────────────────────────────────
// API Functions
// ──────────────────────────────────────────────

/**
 * API client for payroll processing operations including run, retrieval, and breakdown.
 */
export const payrollRunApi = {
  /** Run payroll for a given period (supports batch + paginated processing) */
  runPayroll: (payload: RunPayrollRequest) =>
    payrollAxios.post<SingleResponse<RunPayrollResponse>>('/run', payload),

  /** List all payroll runs (paginated, optionally filtered by period) */
  getRuns: (params?: { page?: number; limit?: number; payrollPeriodId?: string; _t?: number }) =>
    payrollAxios.get<PaginatedResponse<PayrollRun>>('/runs', { params }),

  /** Get a single payroll run */
  getRun: (id: string) =>
    payrollAxios.get<SingleResponse<PayrollRun>>(`/runs/${id}`),

  /** List items for a payroll run */
  getRunItems: (runId: string, params?: { page?: number; limit?: number }) =>
    payrollAxios.get<PaginatedResponse<PayrollRunItem>>(`/runs/${runId}/items`, { params }),

  /** Get a single payroll run item with full detail records */
  getRunItem: (runId: string, itemId: string) =>
    payrollAxios.get<SingleResponse<PayrollRunItemDetail>>(`/runs/${runId}/items/${itemId}`),

  /** Generate payslips for all employees in a payroll run */
  generatePayslipsForRun: (runId: string) =>
    payrollAxios.post<SingleResponse<GeneratePayslipsResponse>>(`/runs/${runId}/generate-payslips`),

  /** Get per-employee payroll stats for a period */
  getEmployeeStats: (params: { payrollPeriodId: string }) =>
    payrollAxios.get<SingleResponse<EmployeePayrollStat[]>>('/runs/employees', { params }),
};

// ──────────────────────────────────────────────
// Employee Payroll Stat (used by PayrollStatsPage)
// ──────────────────────────────────────────────

export interface EmployeePayrollStat {
  employeeName: string;
  externalId: string;
  position: string;
  department: string;
  workDays: number;
  basicSalary: number;
  grossPay: number;
  totalDeductions: number;
  tax: number;
  pension: number;
  costToCompany: number;
  netPay: number;
}

export default payrollAxios;
