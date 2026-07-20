import { call, put, takeLatest } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import { leaveActions } from './leaveSlice';
import { leaveApi } from '../api/leaveApi';

function* fetchBalancesSaga(action: PayloadAction<{ employeeId?: string; fiscalYear?: number; leaveType?: string } | undefined>): Generator {
  try {
    const response: any = yield call(leaveApi.getBalances, action.payload);
    yield put(leaveActions.fetchBalancesSuccess(response));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch leave balances';
    yield put(leaveActions.fetchBalancesFailure(message));
  }
}

function* fetchApplicationsSaga(action: PayloadAction<{ employeeId?: string; status?: string; startDate?: string; endDate?: string } | undefined>): Generator {
  try {
    const response: any = yield call(leaveApi.getApplications, action.payload);
    yield put(leaveActions.fetchApplicationsSuccess(response));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch leave applications';
    yield put(leaveActions.fetchApplicationsFailure(message));
  }
}

function* fetchDeductionsSaga(action: PayloadAction<{ payrollPeriodId?: string; employeeId?: string } | undefined>): Generator {
  try {
    const response: any = yield call(leaveApi.getDeductions, action.payload);
    yield put(leaveActions.fetchDeductionsSuccess(response));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch leave deductions';
    yield put(leaveActions.fetchDeductionsFailure(message));
  }
}

function* syncLeaveSaga(action: PayloadAction<{ companyId: number; periodStart: string; periodEnd: string; payrollRunId: string }>): Generator {
  try {
    const result: any = yield call(
      leaveApi.syncLeavePeriodByRun,
      action.payload.companyId,
      action.payload.periodStart,
      action.payload.periodEnd,
      action.payload.payrollRunId,
    );
    yield put(leaveActions.syncLeaveSuccess(result));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to sync leave';
    yield put(leaveActions.syncLeaveFailure(message));
  }
}

function* fetchSyncLogsSaga(action: PayloadAction<number | undefined>): Generator {
  try {
    const logs: any = yield call(leaveApi.getSyncLogs, action.payload);
    yield put(leaveActions.fetchSyncLogsSuccess(logs));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch leave sync logs';
    yield put(leaveActions.fetchApplicationsFailure(message));
  }
}

function* fetchBreakdownSaga(action: PayloadAction<string>): Generator {
  try {
    const breakdown: any = yield call(leaveApi.getLeaveBreakdown, action.payload);
    yield put(leaveActions.fetchBreakdownSuccess(breakdown));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch leave breakdown';
    yield put(leaveActions.fetchApplicationsFailure(message));
  }
}

export default function* leaveSaga() {
  yield takeLatest(leaveActions.fetchBalancesRequest.type, fetchBalancesSaga);
  yield takeLatest(leaveActions.fetchApplicationsRequest.type, fetchApplicationsSaga);
  yield takeLatest(leaveActions.fetchDeductionsRequest.type, fetchDeductionsSaga);
  yield takeLatest(leaveActions.syncLeaveRequest.type, syncLeaveSaga);
  yield takeLatest(leaveActions.fetchSyncLogsSuccess.type, fetchSyncLogsSaga);
  yield takeLatest(leaveActions.fetchBreakdownSuccess.type, fetchBreakdownSaga);
}
