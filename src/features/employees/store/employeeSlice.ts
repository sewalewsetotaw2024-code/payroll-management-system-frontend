import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../store/store';
import type { PayrollEmployee, PaginationMeta } from '../api/employeeApi';

export interface EmployeeState {
  employees: PayrollEmployee[];
  selectedEmployee: PayrollEmployee | null;
  pagination: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  syncLoading: boolean;
  syncError: string | null;
}

const initialState: EmployeeState = {
  employees: [],
  selectedEmployee: null,
  pagination: null,
  loading: false,
  error: null,
  syncLoading: false,
  syncError: null,
};

const employeeSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    fetchEmployeesRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchEmployeesSuccess(state, action: PayloadAction<{ data: PayrollEmployee[]; pagination: PaginationMeta | null }>) {
      state.employees = action.payload.data;
      state.pagination = action.payload.pagination;
      state.loading = false;
      state.error = null;
    },
    fetchEmployeesFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchEmployeeByIdRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchEmployeeByIdSuccess(state, action: PayloadAction<PayrollEmployee>) {
      state.selectedEmployee = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchEmployeeByIdFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    syncEmployeesRequest(state) {
      state.syncLoading = true;
      state.syncError = null;
    },
    syncEmployeesSuccess(state) {
      state.syncLoading = false;
      state.syncError = null;
    },
    syncEmployeesFailure(state, action: PayloadAction<string>) {
      state.syncLoading = false;
      state.syncError = action.payload;
    },
    clearSelectedEmployee(state) {
      state.selectedEmployee = null;
    },
  },
});

export const employeeActions = employeeSlice.actions;

export const selectAllEmployees = (state: RootState) => state.employees.employees;
export const selectSelectedEmployee = (state: RootState) => state.employees.selectedEmployee;
export const selectEmployeePagination = (state: RootState) => state.employees.pagination;
export const selectEmployeesLoading = (state: RootState) => state.employees.loading;
export const selectEmployeeError = (state: RootState) => state.employees.error;
export const selectSyncLoading = (state: RootState) => state.employees.syncLoading;
export const selectSyncError = (state: RootState) => state.employees.syncError;

export default employeeSlice.reducer;
