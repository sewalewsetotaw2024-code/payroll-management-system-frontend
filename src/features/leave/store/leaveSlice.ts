import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../store/store';
import type {
  LeaveBalance,
  LeaveApplication,
  LeaveDeduction,
  LeaveSyncLog,
  LeaveSyncResult,
  PayrollLeaveItem,
} from '../types/leave.types';

export interface LeaveState {
  balances: LeaveBalance[];
  applications: LeaveApplication[];
  deductions: LeaveDeduction[];
  syncLogs: LeaveSyncLog[];
  breakdown: PayrollLeaveItem[];
  syncSummary: LeaveSyncResult | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
}

const initialState: LeaveState = {
  balances: [],
  applications: [],
  deductions: [],
  syncLogs: [],
  breakdown: [],
  syncSummary: null,
  loading: false,
  syncing: false,
  error: null,
};

const leaveSlice = createSlice({
  name: 'leave',
  initialState,
  reducers: {
    fetchBalancesRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchBalancesSuccess(state, action: PayloadAction<LeaveBalance[]>) {
      state.balances = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchBalancesFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchApplicationsRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchApplicationsSuccess(state, action: PayloadAction<LeaveApplication[]>) {
      state.applications = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchApplicationsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchDeductionsRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchDeductionsSuccess(state, action: PayloadAction<LeaveDeduction[]>) {
      state.deductions = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchDeductionsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    syncLeaveRequest(state) {
      state.syncing = true;
      state.error = null;
    },
    syncLeaveSuccess(state, action: PayloadAction<LeaveSyncResult | null>) {
      state.syncing = false;
      state.syncSummary = action.payload;
      state.error = null;
    },
    syncLeaveFailure(state, action: PayloadAction<string>) {
      state.syncing = false;
      state.error = action.payload;
    },
    fetchSyncLogsSuccess(state, action: PayloadAction<LeaveSyncLog[]>) {
      state.syncLogs = action.payload;
    },
    fetchBreakdownSuccess(state, action: PayloadAction<PayrollLeaveItem[]>) {
      state.breakdown = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const leaveActions = leaveSlice.actions;

export const selectLeaveBalances = (state: RootState) => state.leave.balances;
export const selectLeaveApplications = (state: RootState) => state.leave.applications;
export const selectLeaveDeductions = (state: RootState) => state.leave.deductions;
export const selectLeaveSyncLogs = (state: RootState) => state.leave.syncLogs;
export const selectLeaveBreakdown = (state: RootState) => state.leave.breakdown;
export const selectLeaveSyncSummary = (state: RootState) => state.leave.syncSummary;
export const selectLeaveLoading = (state: RootState) => state.leave.loading;
export const selectLeaveSyncing = (state: RootState) => state.leave.syncing;
export const selectLeaveError = (state: RootState) => state.leave.error;

export default leaveSlice.reducer;
