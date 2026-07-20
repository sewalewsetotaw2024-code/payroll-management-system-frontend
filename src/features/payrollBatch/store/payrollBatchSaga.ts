import { call, put, takeLatest } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import { payrollBatchActions } from './payrollBatchSlice';
import { generateBatches, listBatchesByPeriod, listBatchEmployees } from '../api';

function* fetchBatchesSaga(action: PayloadAction<{ payrollPeriodId: string; page?: number; limit?: number }>): Generator {
  try {
    const payload: any = yield call(listBatchesByPeriod, action.payload);
    yield put(payrollBatchActions.fetchBatchesSuccess(payload));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch payroll batches';
    yield put(payrollBatchActions.fetchBatchesFailure(message));
  }
}

function* fetchBatchEmployeesSaga(action: PayloadAction<{ batchId: string; page?: number; limit?: number; search?: string }>): Generator {
  try {
    const payload: any = yield call(listBatchEmployees, action.payload);
    yield put(payrollBatchActions.fetchBatchEmployeesSuccess(payload));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch batch employees';
    yield put(payrollBatchActions.fetchBatchEmployeesFailure(message));
  }
}

function* generateBatchesSaga(action: PayloadAction<{ payrollPeriodId: string; batchSize?: number }>): Generator {
  try {
    const payload: any = yield call(generateBatches, action.payload);
    yield put(payrollBatchActions.generateBatchesSuccess(payload));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to generate payroll batches';
    yield put(payrollBatchActions.generateBatchesFailure(message));
  }
}

export default function* payrollBatchSaga() {
  yield takeLatest(payrollBatchActions.fetchBatchesRequest.type, fetchBatchesSaga);
  yield takeLatest(payrollBatchActions.fetchBatchEmployeesRequest.type, fetchBatchEmployeesSaga);
  yield takeLatest(payrollBatchActions.generateBatchesRequest.type, generateBatchesSaga);
}
