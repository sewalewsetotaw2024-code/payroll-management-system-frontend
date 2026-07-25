import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../store/store';
import type {
  LeaveApplication,
  LeaveSyncLog,
} from '../types/leave.types';

export interface LeaveState {
  applications: LeaveApplication[];
  syncLogs: LeaveSyncLog[];
  loading: boolean;
  error: string | null;
}

const initialState: LeaveState = {
  applications: [],
  syncLogs: [],
  loading: false,
  error: null,
};

const leaveSlice = createSlice({
  name: 'leave',
  initialState,
  reducers: {
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
    fetchSyncLogsSuccess(state, action: PayloadAction<LeaveSyncLog[]>) {
      state.syncLogs = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const leaveActions = leaveSlice.actions;

export const selectLeaveApplications = (state: RootState) => state.leave.applications;
export const selectLeaveSyncLogs = (state: RootState) => state.leave.syncLogs;
export const selectLeaveLoading = (state: RootState) => state.leave.loading;
export const selectLeaveError = (state: RootState) => state.leave.error;

export default leaveSlice.reducer;
