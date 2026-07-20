import axiosInstance from '../../api/axiosInstance';
import type { PayrollBatch, PayrollBatchEmployeeItem, GenerateBatchesResponse, PaginatedResponse } from './types';

interface GenerateBatchesParams {
  payrollPeriodId: string;
  batchSize?: number;
}

interface ListBatchesParams {
  payrollPeriodId: string;
  page?: number;
  limit?: number;
}

interface ListEmployeesParams {
  batchId: string;
  page?: number;
  limit?: number;
  search?: string;
}

export async function generateBatches(params: GenerateBatchesParams): Promise<GenerateBatchesResponse> {
  const { data } = await axiosInstance.post<{ success: boolean; data: GenerateBatchesResponse }>(
    '/payroll-batch/generate',
    params,
  );
  return data.data;
}

export async function listBatchesByPeriod(params: ListBatchesParams): Promise<{
  batches: PayrollBatch[];
  totalItems: number;
  totalPages: number;
}> {
  const { data } = await axiosInstance.get<{ success: boolean; data: { batches: PayrollBatch[]; totalItems: number; totalPages: number } }>(
    '/payroll-batches/by-period',
    { params },
  );
  return data.data;
}

export async function listBatchEmployees(params: ListEmployeesParams): Promise<PaginatedResponse<PayrollBatchEmployeeItem>> {
  const { data } = await axiosInstance.get<{ success: boolean; data: PaginatedResponse<PayrollBatchEmployeeItem> }>(
    '/payroll-batch/employees',
    { params },
  );
  return data.data;
}

export async function renameBatch(batchId: string, name: string): Promise<PayrollBatch> {
  const { data } = await axiosInstance.put<{ success: boolean; data: PayrollBatch }>(
    `/payroll-batch/${batchId}`,
    { name },
  );
  return data.data;
}

export async function activateBatch(batchId: string): Promise<PayrollBatch> {
  const { data } = await axiosInstance.post<{ success: boolean; data: PayrollBatch }>(
    `/payroll-batch/${batchId}/activate`,
  );
  return data.data;
}

export async function closeBatch(batchId: string): Promise<PayrollBatch> {
  const { data } = await axiosInstance.post<{ success: boolean; data: PayrollBatch }>(
    `/payroll-batch/${batchId}/close`,
  );
  return data.data;
}

export async function archiveBatch(batchId: string): Promise<PayrollBatch> {
  const { data } = await axiosInstance.post<{ success: boolean; data: PayrollBatch }>(
    `/payroll-batch/${batchId}/archive`,
  );
  return data.data;
}

export async function deleteBatch(batchId: string): Promise<void> {
  await axiosInstance.delete(`/payroll-batch/${batchId}`);
}

export async function removeBatchEmployee(batchEmployeeId: string): Promise<void> {
  await axiosInstance.delete(`/payroll-batch/employees/${batchEmployeeId}`);
}

export async function moveBatchEmployee(
  batchEmployeeId: string,
  targetBatchId: string,
): Promise<void> {
  await axiosInstance.put(`/payroll-batch/employees/${batchEmployeeId}/move`, {
    targetBatchId,
  });
}
