import axios from 'axios';
import axiosInstance from '../../../api/axiosInstance';
import { tokenStorage } from '../../../lib/token';
import type {
  FiscalYear,
  TaxBracket,
  PensionRule,
  AllowanceConfig,
  DeductionConfig,
  EmployeeDeduction,
  WorkdaysConfig,
  OvertimeRule,
  PayrollPeriod,
  PaginationParams,
  PayrollBatch,
  PayslipNotificationSettings,
  CurrencyRate,
  PayFrequency,
  SystemCurrency,
} from '../types/configuration.types';

// Axios for integration/sync endpoints (base: /api/v1/integrations)
const integrationAxios = axios.create({
  baseURL: '/api/v1/integrations',
  headers: { 'Content-Type': 'application/json' },
});

integrationAxios.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Payroll Employee (Synced from Employee Module) ───────────────────
/**
 * Payroll employee model representing synced employee data from the Employee module.
 * Includes salary info, allowances, bank details, and pension/tax eligibility.
 */
export interface PayrollEmployee {
  id: string;
  externalId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  tinNumber?: string;
  pensionNumber?: string;
  jobPosition?: string;
  departmentName?: string;
  hireDate?: string;
  status: string;
  currency: string;
  basicSalary?: number;
  grossSalary?: number;
  taxableRemuneration?: number;
  transportationAllowance?: number;
  telephoneAllowance?: number;
  representationAllowance?: number;
  housingAllowance?: number;
  mealAllowance?: number;
  costSharingBalance?: number;
  bankAccountNumber?: string;
  isPensionEligible: boolean;
  isTaxExempt: boolean;
  syncedAt?: string;
  createdAt?: string;
}

/** Backward-compatible alias for PayrollEmployee. */
export type Employee = PayrollEmployee;

/** API endpoints for fetching payroll employee data. */
export const employeeApi = {
  getAll: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    axiosInstance.get('/employees', { params }),
  getById: (id: string) => axiosInstance.get(`/employees/${id}`),
};

// ─── Sync & Integration ───────────────────────────────────────────────
/** API endpoints for triggering sync from Employee Module to Payroll Module. */
export const syncApi = {
  triggerSync: () => integrationAxios.post('/sync/trigger'),
  getSyncLogs: () => integrationAxios.get('/sync/logs'),
  getWebhookEvents: () => integrationAxios.get('/webhook-events'),
};

// ─── Fiscal Years ──────────────────────────────────────────────
/** API endpoints for CRUD operations on fiscal years. */
export const fiscalYearApi = {
  getAll: () => axiosInstance.get('/fiscal-years'),
  getById: (id: string) => axiosInstance.get(`/fiscal-year/${id}`),
  create: (data: Omit<FiscalYear, 'id'>) => axiosInstance.post('/fiscal-year', data),
  update: (id: string, data: Partial<FiscalYear>) => axiosInstance.put(`/fiscal-year/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/fiscal-year/${id}`),
  saveBatch: (fiscalYears: FiscalYear[]) => axiosInstance.post('/fiscal-years/save-configuration', { fiscalYears }),
  activate: (id: string) => axiosInstance.post(`/fiscal-year/${id}/activate`),
  close: (id: string) => axiosInstance.post(`/fiscal-year/${id}/close`),
};

// ─── Tax Brackets ──────────────────────────────────────────────
/** API endpoints for CRUD operations on tax brackets. */
export const taxBracketApi = {
  getAll: (params?: PaginationParams) => axiosInstance.get('/tax-brackets', { params }),
  getById: (id: string) => axiosInstance.get(`/tax-bracket/${id}`),
  create: (data: Omit<TaxBracket, 'id'>) => axiosInstance.post('/tax-bracket', data),
  update: (id: string, data: Partial<TaxBracket>) => axiosInstance.put(`/tax-bracket/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/tax-bracket/${id}`),
  saveBatch: (taxBrackets: TaxBracket[]) => axiosInstance.post('/tax-brackets/save-configuration', { taxBrackets }),
};

// ─── Pension Rules ─────────────────────────────────────────────
/** API endpoints for CRUD operations on pension rules. */
export const pensionRuleApi = {
  getAll: () => axiosInstance.get('/pension-rules'),
  getById: (id: string) => axiosInstance.get(`/pension-rule/${id}`),
  create: (data: Omit<PensionRule, 'id'>) => axiosInstance.post('/pension-rule', data),
  update: (id: string, data: Partial<PensionRule>) => axiosInstance.put(`/pension-rule/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/pension-rule/${id}`),
  saveBatch: (rules: PensionRule[]) => axiosInstance.post('/pension-rules/save-configuration', { pensionRules: rules }),
};

// ─── Overtime Rules ────────────────────────────────────────────
/** API endpoints for CRUD operations on overtime rules. */
export const overtimeRuleApi = {
  getAll: () => axiosInstance.get('/overtime-rules'),
  getById: (id: string) => axiosInstance.get(`/overtime-rule/${id}`),
  create: (data: Omit<OvertimeRule, 'id'>) => axiosInstance.post('/overtime-rule', data),
  update: (id: string, data: Partial<OvertimeRule>) => axiosInstance.put(`/overtime-rule/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/overtime-rule/${id}`),
  saveBatch: (configs: OvertimeRule[]) => axiosInstance.post('/overtime-rules/save-configuration', { overtimeRules: configs }),
};

// ─── Payroll Periods ───────────────────────────────────────────
/** API endpoints for CRUD operations and status transitions on payroll periods. */
export const payrollPeriodApi = {
  getAll: () => axiosInstance.get('/payroll-periods'),
  getCurrent: () => axiosInstance.get('/payroll-period/current'),
  getById: (id: string) => axiosInstance.get(`/payroll-period/${id}`),
  create: (data: Omit<PayrollPeriod, 'id'>) => axiosInstance.post('/payroll-period', data),
  update: (id: string, data: Partial<PayrollPeriod>) => axiosInstance.put(`/payroll-period/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/payroll-period/${id}`),
  saveConfiguration: (data: Omit<PayrollPeriod, 'id'>) => axiosInstance.post('/payroll-periods/save-configuration', data),
  open: (id: string) => axiosInstance.post(`/payroll-period/${id}/open`),
  close: (id: string) => axiosInstance.post(`/payroll-period/${id}/close`),
  preview: (startDate: string, endDate: string) => axiosInstance.post('/payroll-period/preview', { startDate, endDate }),
};

// ─── Allowance Configs ─────────────────────────────────────────
/** API endpoints for CRUD operations on allowance configurations. */
export const allowanceApi = {
  getAll: (params?: PaginationParams) => axiosInstance.get('/allowance-configs', { params }),
  getById: (id: string) => axiosInstance.get(`/allowance-config/${id}`),
  create: (data: Omit<AllowanceConfig, 'id'>) => axiosInstance.post('/allowance-config', data),
  update: (id: string, data: Partial<AllowanceConfig>) => axiosInstance.put(`/allowance-config/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/allowance-config/${id}`),
  saveBatch: (allowances: AllowanceConfig[]) => axiosInstance.post('/allowance-configs/save-configuration', { allowances }),
};

// ─── Deduction Configs ─────────────────────────────────────────
/** API endpoints for CRUD operations on deduction configurations. */
export const deductionApi = {
  getAll: (params?: PaginationParams) => axiosInstance.get('/deduction-configs', { params }),
  getById: (id: string) => axiosInstance.get(`/deduction-config/${id}`),
  create: (salaryStructureId: string, data: Omit<DeductionConfig, 'id'>) =>
    axiosInstance.post(`/deduction-config/${salaryStructureId}`, data),
  createSimple: (data: Omit<DeductionConfig, 'id'>) =>
    axiosInstance.post('/deduction-config', data),
  update: (id: string, data: Partial<DeductionConfig>) => axiosInstance.put(`/deduction-config/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/deduction-config/${id}`),
  saveBatch: (salaryStructureId: string, deductions: DeductionConfig[]) =>
    axiosInstance.post(`/salary-structure/${salaryStructureId}/deduction-configs/save-configuration`, { deductions }),
  saveBatchSimple: (deductions: DeductionConfig[]) =>
    axiosInstance.post('/deduction-configs/save-configuration', { deductions }),
};

// ─── Workdays Config ───────────────────────────────────────────
/** API endpoints for fetching and saving workdays configuration. */
export const workdaysApi = {
  get: () => axiosInstance.get('/workdays-config'),
  save: (data: WorkdaysConfig) => axiosInstance.post('/workdays-config/save-configuration', data),
  update: (data: WorkdaysConfig) => axiosInstance.put('/workdays-config', data),
  patch: (data: Partial<WorkdaysConfig>) => axiosInstance.patch('/workdays-config', data),
};

// ─── Payroll Batch ────────────────────────────────────────────
/** API endpoints for CRUD operations and status transitions on payroll batches. */
export const payrollBatchApi = {
  getAll: (params?: PaginationParams) => axiosInstance.get('/payroll-batches', { params }),
  getById: (id: string) => axiosInstance.get(`/payroll-batch/${id}`),
  create: (data: Omit<PayrollBatch, 'id'>) => axiosInstance.post('/payroll-batch', data),
  update: (id: string, data: Partial<PayrollBatch>) => axiosInstance.put(`/payroll-batch/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/payroll-batch/${id}`),
  saveBatch: (batches: PayrollBatch[]) => axiosInstance.post('/payroll-batches/save-configuration', { payrollBatches: batches }),
  activate: (id: string) => axiosInstance.post(`/payroll-batch/${id}/activate`),
  close: (id: string) => axiosInstance.post(`/payroll-batch/${id}/close`),
  archive: (id: string) => axiosInstance.post(`/payroll-batch/${id}/archive`),
};

// ─── Payslip Notification Settings ────────────────────────────
/** API endpoints for fetching and saving payslip notification settings. */
export const payslipNotificationSettingsApi = {
  get: () => axiosInstance.get('/payslip-notification-settings'),
  save: (data: PayslipNotificationSettings) => axiosInstance.post('/payslip-notification-settings/save-configuration', data),
};

// ─── System Currencies ───────────────────────────────────────
/** API endpoints for CRUD operations on system currencies. */
export const currencyApi = {
  getAll: () => axiosInstance.get('/currencies'),
  getById: (id: string) => axiosInstance.get(`/currency/${id}`),
  create: (data: Omit<SystemCurrency, 'id'>) => axiosInstance.post('/currency', data),
  update: (id: string, data: Partial<SystemCurrency>) => axiosInstance.put(`/currency/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/currency/${id}`),
  setBase: (id: string) => axiosInstance.post(`/currency/${id}/set-base`),
};

// ─── Currency Rates ───────────────────────────────────────────
/** API endpoints for CRUD operations on currency exchange rates. */
export const currencyRateApi = {
  getAll: (params?: PaginationParams) => axiosInstance.get('/currency-rates', { params }),
  getById: (id: string) => axiosInstance.get(`/currency-rate/${id}`),
  create: (data: Omit<CurrencyRate, 'id'>) => axiosInstance.post('/currency-rate', data),
  update: (id: string, data: Partial<CurrencyRate>) => axiosInstance.put(`/currency-rate/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/currency-rate/${id}`),
  saveBatch: (rates: CurrencyRate[]) => axiosInstance.post('/currency-rates/save-configuration', { currencyRates: rates }),
};

// ─── Pay Frequency ────────────────────────────────────────────
/** API endpoints for CRUD operations on pay frequency configurations. */
export const payFrequencyApi = {
  getAll: (params?: PaginationParams) => axiosInstance.get('/pay-frequencies', { params }),
  getById: (id: string) => axiosInstance.get(`/pay-frequency/${id}`),
  create: (data: Omit<PayFrequency, 'id'>) => axiosInstance.post('/pay-frequency', data),
  update: (id: string, data: Partial<PayFrequency>) => axiosInstance.put(`/pay-frequency/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/pay-frequency/${id}`),
  saveBatch: (frequencies: PayFrequency[]) => axiosInstance.post('/pay-frequencies/save-configuration', { payFrequencies: frequencies }),
};

// ─── Enum Lookup Endpoints ─────────────────────────────────────
/** API endpoints for fetching enum dropdown options (deduction types, earning types). */
export const enumApi = {
  getDeductionTypes: () => axiosInstance.get('/deduction-types'),
  getEarningTypes: () => axiosInstance.get('/earning-types'),
};

// ─── Employee Deductions (Per-employee assignments) ────────────────
/**
 * API endpoints for per-employee deduction assignments (loans, advances, etc.).
 * Use these endpoints to assign specific deduction amounts to individual employees.
 * Note: axiosInstance already has baseURL '/api/v1/configurations'.
 */
export const employeeDeductionApi = {
  getAll: (params?: { employeeId?: string; deductionItemId?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    axiosInstance.get('/employee-deductions', { params }),
  getById: (id: string) => axiosInstance.get(`/employee-deduction/${id}`),
  create: (data: Omit<EmployeeDeduction, 'id' | 'isActive' | 'companyId' | 'createdAt' | 'updatedAt' | 'paymentPlan'> & {
    totalAmount?: number | null;
    paidAmount?: number;
    numInstallments?: number | null;
    paidInstallments?: number;
  }) =>
    axiosInstance.post('/employee-deduction', data),
  update: (id: string, data: Partial<EmployeeDeduction> & {
    totalAmount?: number | null;
    paidAmount?: number;
    remaining?: number | null;
    numInstallments?: number | null;
    paidInstallments?: number;
  }) =>
    axiosInstance.put(`/employee-deduction/${id}`, data),
  delete: (id: string, params?: { deductionItemId?: string }) =>
    axiosInstance.delete(`/employee-deduction/${id}`, { params }),
  getActiveByEmployee: (employeeId: string) =>
    axiosInstance.get(`/employee/${employeeId}/deductions/active`),
  recordPayment: (id: string, paymentAmount: number, options?: { payrollRunItemId?: string; periodId?: string }) =>
    axiosInstance.post(`/employee-deduction/${id}/record-payment`, { paymentAmount, ...options }),
  bulkAssign: (data: {
    deductionConfigId: string;
    assignments?: Array<{ employeeId: string; amount?: number | null; percent?: number | null }>;
    assignAllEmployees?: boolean;
  }) => axiosInstance.post('/employee-deductions/bulk-assign', data),
};
