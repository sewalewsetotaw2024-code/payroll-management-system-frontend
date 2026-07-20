import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../store/store';
import type {
  PayrollRun,
  PayrollRunItem,
  PayrollRunItemDetail,
  EmployeePayrollStat,
  RunPayrollResponse,
  GeneratePayslipsResponse,
  PaginatedResponse,
} from '../api/payrollProcessingApi';

export interface PayrollProcessingState {
  runs: PayrollRun[];
  selectedRun: PayrollRun | null;
  runItems: PayrollRunItem[];
  selectedRunItem: PayrollRunItemDetail | null;
  employeeStats: EmployeePayrollStat[];
  pagination: {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
  loading: boolean;
  runLoading: boolean;
  processingLoading: boolean;
  error: string | null;
}

const initialState: PayrollProcessingState = {
  runs: [],
  selectedRun: null,
  runItems: [],
  selectedRunItem: null,
  employeeStats: [],
  pagination: null,
  loading: false,
  runLoading: false,
  processingLoading: false,
  error: null,
};

const payrollProcessingSlice = createSlice({
  name: 'payrollProcessing',
  initialState,
  reducers: {
    fetchRunsRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchRunsSuccess(state, action: PayloadAction<{ data: PayrollRun[]; pagination: any }>) {
      state.runs = action.payload.data;
      state.pagination = action.payload.pagination;
      state.loading = false;
      state.error = null;
    },
    fetchRunsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchRunRequest(state) {
      state.runLoading = true;
      state.error = null;
    },
    fetchRunSuccess(state, action: PayloadAction<PayrollRun>) {
      state.selectedRun = action.payload;
      state.runLoading = false;
      state.error = null;
    },
    fetchRunFailure(state, action: PayloadAction<string>) {
      state.runLoading = false;
      state.error = action.payload;
    },
    fetchRunItemsRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchRunItemsSuccess(state, action: PayloadAction<{ data: PayrollRunItem[]; pagination: any }>) {
      state.runItems = action.payload.data;
      state.pagination = action.payload.pagination;
      state.loading = false;
      state.error = null;
    },
    fetchRunItemsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchRunItemRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchRunItemSuccess(state, action: PayloadAction<PayrollRunItemDetail>) {
      state.selectedRunItem = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchRunItemFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    runPayrollRequest(state) {
      state.processingLoading = true;
      state.error = null;
    },
    runPayrollSuccess(state, action: PayloadAction<RunPayrollResponse>) {
      state.processingLoading = false;
      state.error = null;
    },
    runPayrollFailure(state, action: PayloadAction<string>) {
      state.processingLoading = false;
      state.error = action.payload;
    },
    generatePayslipsRequest(state) {
      state.processingLoading = true;
      state.error = null;
    },
    generatePayslipsSuccess(state, action: PayloadAction<GeneratePayslipsResponse>) {
      state.processingLoading = false;
      state.error = null;
    },
    generatePayslipsFailure(state, action: PayloadAction<string>) {
      state.processingLoading = false;
      state.error = action.payload;
    },
    fetchEmployeeStatsRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchEmployeeStatsSuccess(state, action: PayloadAction<EmployeePayrollStat[]>) {
      state.employeeStats = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchEmployeeStatsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    clearSelectedRun(state) {
      state.selectedRun = null;
      state.runItems = [];
      state.selectedRunItem = null;
    },
    clearSelectedRunItem(state) {
      state.selectedRunItem = null;
    },
  },
});

export const payrollProcessingActions = payrollProcessingSlice.actions;

export const selectAllRuns = (state: RootState) => state.payrollProcessing.runs;
export const selectSelectedRun = (state: RootState) => state.payrollProcessing.selectedRun;
export const selectRunItems = (state: RootState) => state.payrollProcessing.runItems;
export const selectSelectedRunItem = (state: RootState) => state.payrollProcessing.selectedRunItem;
export const selectEmployeeStats = (state: RootState) => state.payrollProcessing.employeeStats;
export const selectPayrollPagination = (state: RootState) => state.payrollProcessing.pagination;
export const selectPayrollLoading = (state: RootState) => state.payrollProcessing.loading;
export const selectRunLoading = (state: RootState) => state.payrollProcessing.runLoading;
export const selectProcessingLoading = (state: RootState) => state.payrollProcessing.processingLoading;
export const selectPayrollError = (state: RootState) => state.payrollProcessing.error;

export default payrollProcessingSlice.reducer;
