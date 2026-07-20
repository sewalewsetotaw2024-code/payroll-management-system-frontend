import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../store/store';
import type { PayrollBatch, GenerateBatchesResponse, PaginatedResponse, PayrollBatchEmployeeItem } from '../types';

export interface PayrollBatchState {
  batches: PayrollBatch[];
  selectedBatch: PayrollBatch | null;
  employees: PayrollBatchEmployeeItem[];
  totalItems: number;
  totalPages: number;
  page: number;
  loading: boolean;
  generating: boolean;
  error: string | null;
}

const initialState: PayrollBatchState = {
  batches: [],
  selectedBatch: null,
  employees: [],
  totalItems: 0,
  totalPages: 0,
  page: 1,
  loading: false,
  generating: false,
  error: null,
};

const payrollBatchSlice = createSlice({
  name: 'payrollBatch',
  initialState,
  reducers: {
    fetchBatchesRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchBatchesSuccess(state, action: PayloadAction<{ batches: PayrollBatch[]; totalItems: number; totalPages: number }>) {
      state.batches = action.payload.batches;
      state.totalItems = action.payload.totalItems;
      state.totalPages = action.payload.totalPages;
      state.loading = false;
      state.error = null;
    },
    fetchBatchesFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchBatchEmployeesRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchBatchEmployeesSuccess(state, action: PayloadAction<PaginatedResponse<PayrollBatchEmployeeItem>>) {
      state.employees = action.payload.items;
      state.totalItems = action.payload.totalItems;
      state.totalPages = action.payload.totalPages;
      state.loading = false;
      state.error = null;
    },
    fetchBatchEmployeesFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    generateBatchesRequest(state) {
      state.generating = true;
      state.error = null;
    },
    generateBatchesSuccess(state, action: PayloadAction<GenerateBatchesResponse>) {
      state.generating = false;
      state.error = null;
      state.batches = action.payload.batches;
    },
    generateBatchesFailure(state, action: PayloadAction<string>) {
      state.generating = false;
      state.error = action.payload;
    },
    setSelectedBatch(state, action: PayloadAction<PayrollBatch | null>) {
      state.selectedBatch = action.payload;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const payrollBatchActions = payrollBatchSlice.actions;

export const selectPayrollBatchItems = (state: RootState) => state.payrollBatch.batches;
export const selectSelectedPayrollBatch = (state: RootState) => state.payrollBatch.selectedBatch;
export const selectPayrollBatchEmployees = (state: RootState) => state.payrollBatch.employees;
export const selectPayrollBatchLoading = (state: RootState) => state.payrollBatch.loading;
export const selectPayrollBatchGenerating = (state: RootState) => state.payrollBatch.generating;
export const selectPayrollBatchError = (state: RootState) => state.payrollBatch.error;

export default payrollBatchSlice.reducer;
