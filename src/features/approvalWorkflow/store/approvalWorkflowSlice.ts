import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../store/store';
import type {
  AttendanceImportSummary,
  PayrollRunSummary,
  PaymentApprovalSummary,
  PipelineFlag,
  ApprovalWorkflowConfig,
} from '../types/approvalWorkflow.types';
import type {
  DynamicRole,
  ApprovalRequestData,
} from '../api/approvalWorkflowApi';

export interface ApprovalWorkflowState {
  attendanceSummary: AttendanceImportSummary | null;
  payrollRunSummary: PayrollRunSummary | null;
  paymentSummary: PaymentApprovalSummary | null;
  pipelineFlags: PipelineFlag[];
  roles: DynamicRole[] | null;
  rolePermissions: Record<string, any> | null;
  roleLabels: Record<string, string> | null;
  workflowConfig: ApprovalWorkflowConfig | null;
  approvalStatus: ApprovalRequestData[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

const initialState: ApprovalWorkflowState = {
  attendanceSummary: null,
  payrollRunSummary: null,
  paymentSummary: null,
  pipelineFlags: [],
  roles: null,
  rolePermissions: null,
  roleLabels: null,
  workflowConfig: null,
  approvalStatus: [],
  loading: false,
  submitting: false,
  error: null,
};

const approvalWorkflowSlice = createSlice({
  name: 'approvalWorkflow',
  initialState,
  reducers: {
    fetchAttendanceSummaryRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchAttendanceSummarySuccess(state, action: PayloadAction<AttendanceImportSummary>) {
      state.attendanceSummary = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchAttendanceSummaryFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchPayrollRunSummaryRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchPayrollRunSummarySuccess(state, action: PayloadAction<PayrollRunSummary>) {
      state.payrollRunSummary = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchPayrollRunSummaryFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchPaymentSummaryRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchPaymentSummarySuccess(state, action: PayloadAction<PaymentApprovalSummary>) {
      state.paymentSummary = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchPaymentSummaryFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    computePipelineFlags(state, action: PayloadAction<PipelineFlag[]>) {
      state.pipelineFlags = action.payload;
    },
    fetchRolesRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchRolesSuccess(state, action: PayloadAction<DynamicRole[]>) {
      state.roles = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchRolesFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchRolePermissionsRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchRolePermissionsSuccess(state, action: PayloadAction<Record<string, any>>) {
      state.rolePermissions = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchRolePermissionsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchRoleLabelsRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchRoleLabelsSuccess(state, action: PayloadAction<Record<string, string>>) {
      state.roleLabels = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchRoleLabelsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    createRoleRequest(state) {
      state.submitting = true;
      state.error = null;
    },
    createRoleSuccess(state) {
      state.submitting = false;
      state.error = null;
    },
    createRoleFailure(state, action: PayloadAction<string>) {
      state.submitting = false;
      state.error = action.payload;
    },
    updateRoleRequest(state) {
      state.submitting = true;
      state.error = null;
    },
    updateRoleSuccess(state) {
      state.submitting = false;
      state.error = null;
    },
    updateRoleFailure(state, action: PayloadAction<string>) {
      state.submitting = false;
      state.error = action.payload;
    },
    deleteRoleRequest(state) {
      state.submitting = true;
      state.error = null;
    },
    deleteRoleSuccess(state) {
      state.submitting = false;
      state.error = null;
    },
    deleteRoleFailure(state, action: PayloadAction<string>) {
      state.submitting = false;
      state.error = action.payload;
    },
    fetchWorkflowConfigRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchWorkflowConfigSuccess(state, action: PayloadAction<ApprovalWorkflowConfig>) {
      state.workflowConfig = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchWorkflowConfigFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchApprovalStatusRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchApprovalStatusSuccess(state, action: PayloadAction<ApprovalRequestData[]>) {
      state.approvalStatus = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchApprovalStatusFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    requestApprovalRequest(state) {
      state.submitting = true;
      state.error = null;
    },
    requestApprovalSuccess(state) {
      state.submitting = false;
      state.error = null;
    },
    requestApprovalFailure(state, action: PayloadAction<string>) {
      state.submitting = false;
      state.error = action.payload;
    },
    approveRequestRequest(state) {
      state.submitting = true;
      state.error = null;
    },
    approveRequestSuccess(state) {
      state.submitting = false;
      state.error = null;
    },
    approveRequestFailure(state, action: PayloadAction<string>) {
      state.submitting = false;
      state.error = action.payload;
    },
    rejectRequestRequest(state) {
      state.submitting = true;
      state.error = null;
    },
    rejectRequestSuccess(state) {
      state.submitting = false;
      state.error = null;
    },
    rejectRequestFailure(state, action: PayloadAction<string>) {
      state.submitting = false;
      state.error = action.payload;
    },
    clearSummaries(state) {
      state.attendanceSummary = null;
      state.payrollRunSummary = null;
      state.paymentSummary = null;
      state.pipelineFlags = [];
    },
  },
});

export const approvalWorkflowActions = approvalWorkflowSlice.actions;

export const selectAttendanceSummary = (state: RootState) => state.approvalWorkflow.attendanceSummary;
export const selectPayrollRunSummary = (state: RootState) => state.approvalWorkflow.payrollRunSummary;
export const selectPaymentSummary = (state: RootState) => state.approvalWorkflow.paymentSummary;
export const selectPipelineFlags = (state: RootState) => state.approvalWorkflow.pipelineFlags;
export const selectRoles = (state: RootState) => state.approvalWorkflow.roles;
export const selectRolePermissions = (state: RootState) => state.approvalWorkflow.rolePermissions;
export const selectRoleLabels = (state: RootState) => state.approvalWorkflow.roleLabels;
export const selectWorkflowConfig = (state: RootState) => state.approvalWorkflow.workflowConfig;
export const selectApprovalStatus = (state: RootState) => state.approvalWorkflow.approvalStatus;
export const selectApprovalLoading = (state: RootState) => state.approvalWorkflow.loading;
export const selectApprovalSubmitting = (state: RootState) => state.approvalWorkflow.submitting;
export const selectApprovalError = (state: RootState) => state.approvalWorkflow.error;

export default approvalWorkflowSlice.reducer;
