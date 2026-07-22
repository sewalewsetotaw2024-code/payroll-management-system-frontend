import axios from 'axios';
import type { ImportType, ImportResult, ImportRecord } from '../types/dataManagement.types';
import { tokenStorage } from '../../../lib/token';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const dataAxios = axios.create({
  baseURL: `${API_BASE_URL}/data`,
});

dataAxios.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Maps an ImportType to its corresponding API endpoint path.
 *
 * @param importType - The type of data being imported.
 * @returns The endpoint string for the given import type.
 */
function getEndpoint(importType: ImportType): string {
  const map: Record<ImportType, string> = {
    EMPLOYEE: '/import/employees',
    ATTENDANCE: '/import/attendance',
    ADJUSTMENT: '/import/adjustments',
  };
  return map[importType];
}

/**
 * API client for data management operations including import and history retrieval.
 */
export const dataManagementApi = {
  /**
   * Uploads a file and its parsed data for import into the system.
   *
   * @param importType - The type of data being imported (EMPLOYEE, ATTENDANCE, ADJUSTMENT).
   * @param file - The raw file to upload.
   * @param data - The parsed row data to import.
   * @param payrollPeriodId - Optional payroll period identifier.
   * @param folderId - Optional folder ID to assign the file to.
   * @returns Promise resolving to the import result.
   */
  importFile: async (
    importType: ImportType,
    file: File,
    data: unknown[],
    payrollPeriodId?: string,
    folderId?: string,
  ): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('data', JSON.stringify(data));
    if (payrollPeriodId) formData.append('payrollPeriodId', payrollPeriodId);
    if (folderId) formData.append('folderId', folderId);

    const response = await dataAxios.post(getEndpoint(importType), formData);
    return response.data.data;
  },

  /**
   * Retrieves the paginated import history.
   *
   * @param params - Optional pagination parameters (page, limit).
   * @returns Promise resolving to the import records and pagination metadata.
   */
  getImportHistory: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{ imports: ImportRecord[]; totalItems: number; currentPage: number; totalPages: number }> => {
    const response = await dataAxios.get('/imports', { params });
    const body = response.data;
    return {
      imports: (body?.data ?? []) as ImportRecord[],
      totalItems: body?.pagination?.totalItems ?? 0,
      currentPage: body?.pagination?.currentPage ?? 1,
      totalPages: body?.pagination?.totalPages ?? 1,
    };
  },

  /**
   * Fetches a single import record by its ID.
   *
   * @param id - The unique identifier of the import record.
   * @returns Promise resolving to the import record.
   */
  getImportById: async (id: string): Promise<ImportRecord> => {
    const response = await dataAxios.get(`/imports/${id}`);
    return response.data.data;
  },
};
