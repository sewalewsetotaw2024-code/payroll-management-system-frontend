import { call, put, takeLatest } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import { leaveActions } from './leaveSlice';
import { leaveApi } from '../api/leaveApi';

function* fetchApplicationsSaga(action: PayloadAction<{ employeeId?: string; status?: string; startDate?: string; endDate?: string } | undefined>): Generator {
  try {
    const response: any = yield call(leaveApi.getApplications, action.payload);
    yield put(leaveActions.fetchApplicationsSuccess(response));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch leave applications';
    yield put(leaveActions.fetchApplicationsFailure(message));
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

export default function* leaveSaga() {
  yield takeLatest(leaveActions.fetchApplicationsRequest.type, fetchApplicationsSaga);
  yield takeLatest(leaveActions.fetchSyncLogsSuccess.type, fetchSyncLogsSaga);
}
