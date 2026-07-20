import { call, put, takeLatest } from 'redux-saga/effects';
import { approvalWorkflowActions } from './approvalWorkflowSlice';
import {
  fetchAttendanceImportSummary,
  fetchPayrollRunSummary,
  fetchPaymentApprovalSummary,
  computePipelineFlags,
  fetchRoles,
  fetchRolePermissions,
  fetchRoleLabels,
  createRole,
  updateRole,
  deleteRole,
  fetchApprovalWorkflow,
  fetchApprovalStatus,
  requestApproval,
  approveRequest,
  rejectRequest,
} from '../api/approvalWorkflowApi';

function* fetchAttendanceSummarySaga(action: { payload: string }): Generator {
  try {
    const summary: any = yield call(fetchAttendanceImportSummary, action.payload);
    yield put(approvalWorkflowActions.fetchAttendanceSummarySuccess(summary));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch attendance summary';
    yield put(approvalWorkflowActions.fetchAttendanceSummaryFailure(message));
  }
}

function* fetchPayrollRunSummarySaga(action: { payload: string }): Generator {
  try {
    const summary: any = yield call(fetchPayrollRunSummary, action.payload);
    yield put(approvalWorkflowActions.fetchPayrollRunSummarySuccess(summary));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch payroll run summary';
    yield put(approvalWorkflowActions.fetchPayrollRunSummaryFailure(message));
  }
}

function* fetchPaymentSummarySaga(action: { payload: string }): Generator {
  try {
    const summary: any = yield call(fetchPaymentApprovalSummary, action.payload);
    yield put(approvalWorkflowActions.fetchPaymentSummarySuccess(summary));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch payment summary';
    yield put(approvalWorkflowActions.fetchPaymentSummaryFailure(message));
  }
}

function* computePipelineFlagsSaga(action: { payload: { attendance: any; payrollRun: any; payment: any } }): Generator {
  try {
    const flags: any = yield call(computePipelineFlags, action.payload.attendance, action.payload.payrollRun, action.payload.payment);
    yield put(approvalWorkflowActions.computePipelineFlags(flags));
  } catch (error: any) {
    console.error('Failed to compute pipeline flags:', error);
  }
}

function* fetchRolesSaga(): Generator {
  try {
    const roles: any = yield call(fetchRoles);
    yield put(approvalWorkflowActions.fetchRolesSuccess(roles));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch roles';
    yield put(approvalWorkflowActions.fetchRolesFailure(message));
  }
}

function* fetchRolePermissionsSaga(): Generator {
  try {
    const permissions: any = yield call(fetchRolePermissions);
    yield put(approvalWorkflowActions.fetchRolePermissionsSuccess(permissions));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch role permissions';
    yield put(approvalWorkflowActions.fetchRolePermissionsFailure(message));
  }
}

function* fetchRoleLabelsSaga(): Generator {
  try {
    const labels: any = yield call(fetchRoleLabels);
    yield put(approvalWorkflowActions.fetchRoleLabelsSuccess(labels));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch role labels';
    yield put(approvalWorkflowActions.fetchRoleLabelsFailure(message));
  }
}

function* createRoleSaga(action: { payload: string }): Generator {
  try {
    yield call(createRole, action.payload);
    yield put(approvalWorkflowActions.createRoleSuccess());
    // Refresh roles after creation
    yield put(approvalWorkflowActions.fetchRolesRequest());
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to create role';
    yield put(approvalWorkflowActions.createRoleFailure(message));
  }
}

function* updateRoleSaga(action: { payload: { roleId: number; data: { name: string } } }): Generator {
  try {
    yield call(updateRole, action.payload.roleId, action.payload.data);
    yield put(approvalWorkflowActions.updateRoleSuccess());
    // Refresh roles after update
    yield put(approvalWorkflowActions.fetchRolesRequest());
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to update role';
    yield put(approvalWorkflowActions.updateRoleFailure(message));
  }
}

function* deleteRoleSaga(action: { payload: number }): Generator {
  try {
    yield call(deleteRole, action.payload);
    yield put(approvalWorkflowActions.deleteRoleSuccess());
    // Refresh roles after deletion
    yield put(approvalWorkflowActions.fetchRolesRequest());
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to delete role';
    yield put(approvalWorkflowActions.deleteRoleFailure(message));
  }
}

function* fetchWorkflowConfigSaga(): Generator {
  try {
    const config: any = yield call(fetchApprovalWorkflow);
    yield put(approvalWorkflowActions.fetchWorkflowConfigSuccess(config));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch workflow config';
    yield put(approvalWorkflowActions.fetchWorkflowConfigFailure(message));
  }
}

function* fetchApprovalStatusSaga(action: { payload: any }): Generator {
  try {
    const status: any = yield call(fetchApprovalStatus, action.payload);
    yield put(approvalWorkflowActions.fetchApprovalStatusSuccess(status));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch approval status';
    yield put(approvalWorkflowActions.fetchApprovalStatusFailure(message));
  }
}

function* requestApprovalSaga(action: { payload: any }): Generator {
  try {
    yield call(requestApproval, action.payload.stageType, action.payload.referenceType, action.payload.payrollRunId, action.payload.attendanceImportId, action.payload.payrollPeriodId);
    yield put(approvalWorkflowActions.requestApprovalSuccess());
    // Refresh approval status after request
    yield put(approvalWorkflowActions.fetchApprovalStatusRequest(action.payload));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to request approval';
    yield put(approvalWorkflowActions.requestApprovalFailure(message));
  }
}

function* approveRequestSaga(action: { payload: { requestId: string; comment?: string } }): Generator {
  try {
    yield call(approveRequest, action.payload.requestId, action.payload.comment);
    yield put(approvalWorkflowActions.approveRequestSuccess());
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to approve request';
    yield put(approvalWorkflowActions.approveRequestFailure(message));
  }
}

function* rejectRequestSaga(action: { payload: { requestId: string; comment?: string } }): Generator {
  try {
    yield call(rejectRequest, action.payload.requestId, action.payload.comment);
    yield put(approvalWorkflowActions.rejectRequestSuccess());
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to reject request';
    yield put(approvalWorkflowActions.rejectRequestFailure(message));
  }
}

export default function* approvalWorkflowSaga() {
  // The `as any` casts handle a redux-saga typing mismatch with newer TS versions
  // where takeLatest expects TakeableChannel but receives a plain action-type string.
  yield takeLatest(approvalWorkflowActions.fetchAttendanceSummaryRequest.type as any, fetchAttendanceSummarySaga);
  yield takeLatest(approvalWorkflowActions.fetchPayrollRunSummaryRequest.type as any, fetchPayrollRunSummarySaga);
  yield takeLatest(approvalWorkflowActions.fetchPaymentSummaryRequest.type as any, fetchPaymentSummarySaga);
  yield takeLatest(approvalWorkflowActions.computePipelineFlags.type as any, computePipelineFlagsSaga);
  yield takeLatest(approvalWorkflowActions.fetchRolesRequest.type as any, fetchRolesSaga);
  yield takeLatest(approvalWorkflowActions.fetchRolePermissionsRequest.type as any, fetchRolePermissionsSaga);
  yield takeLatest(approvalWorkflowActions.fetchRoleLabelsRequest.type as any, fetchRoleLabelsSaga);
  yield takeLatest(approvalWorkflowActions.createRoleRequest.type as any, createRoleSaga);
  yield takeLatest(approvalWorkflowActions.updateRoleRequest.type as any, updateRoleSaga);
  yield takeLatest(approvalWorkflowActions.deleteRoleRequest.type as any, deleteRoleSaga);
  yield takeLatest(approvalWorkflowActions.fetchWorkflowConfigRequest.type as any, fetchWorkflowConfigSaga);
  yield takeLatest(approvalWorkflowActions.fetchApprovalStatusRequest.type as any, fetchApprovalStatusSaga);
  yield takeLatest(approvalWorkflowActions.requestApprovalRequest.type as any, requestApprovalSaga);
  yield takeLatest(approvalWorkflowActions.approveRequestRequest.type as any, approveRequestSaga);
  yield takeLatest(approvalWorkflowActions.rejectRequestRequest.type as any, rejectRequestSaga);
}
