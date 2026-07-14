import axios from 'axios';
import { tokenStorage } from '../../../lib/token';

// Axios for employee API (from payroll backend - synced data)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://payroll-management-system-backend-d2y9.onrender.com/api/v1';

// Employee records are served from the payroll backend under /api/v1/employees
const payrollAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

payrollAxios.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Axios for integration/sync endpoints
const integrationAxios = axios.create({
  baseURL: `${API_BASE_URL}/integrations`,
  headers: { 'Content-Type': 'application/json' },
});

integrationAxios.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Employee model from the payroll backend, synced from the Employee Module.
 */
export interface PayrollEmployee {
  id: string;
  externalId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  gender?: string;
  tinNumber?: string;
  pensionNumber?: string;
  jobPosition?: string;
  departmentName?: string;
  employmentType?: string;
  managerName?: string;
  hireDate?: string;
  probationEndDate?: string;
  employmentEndDate?: string;
  placeOfWork?: string;
  contractReference?: string;
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
  otherPayments?: number;
  costSharingBalance?: number;
  bankAccountNumber?: string;
  isPensionEligible: boolean;
  isTaxExempt: boolean;
  syncedAt?: string;
  createdAt?: string;
}

/** Convenience alias for PayrollEmployee. */
export type Employee = PayrollEmployee;

/**
 * Pagination metadata returned by the employee API.
 */
export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

/**
 * Fetches a paginated list of employees from the payroll backend.
 *
 * @param params - Optional search, status filter, page, and limit parameters.
 * @returns Promise resolving to an object with employee data and pagination metadata.
 */
export const getEmployees = async (params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: PayrollEmployee[]; pagination: PaginationMeta | null }> => {
  try {
    const response = await payrollAxios.get('/employees', { params });
    const body = response.data as any;
    return {
      data: Array.isArray(body?.data) ? body.data : [],
      pagination: body?.pagination || null,
    };
  } catch (error) {
    console.error('[Employee API] Failed to fetch employees:', error);
    return { data: [], pagination: null };
  }
};

/**
 * Fetches a single employee by their ID.
 *
 * @param id - The unique identifier of the employee.
 * @returns Promise resolving to the employee data, or null on failure.
 */
export const getEmployeeById = async (id: string) => {
  try {
    const response = await payrollAxios.get(`/employees/${id}`);
    return (response.data as any)?.data || response.data;
  } catch (error) {
    console.error('[Employee API] Failed to fetch employee:', error);
    return null;
  }
};

/**
 * Triggers a sync from the Employee Module to the Payroll Module.
 * Returns a summary of synced entities.
 *
 * @returns Promise resolving to sync counts, or null if the sync returned no data.
 */
export const triggerEmployeeSync = async (): Promise<{
  roles?: number;
  companies?: number;
  banks?: number;
  appUsers?: number;
  employees?: number;
} | null> => {
  try {
    const response = await integrationAxios.post('/sync/trigger');
    return (response.data as any)?.data || response.data || null;
  } catch (error: any) {
    console.error('[Employee API] Sync failed:', error);
    const msg = error?.response?.data?.message || error?.message || 'Sync failed';
    throw new Error(msg);
  }
};
