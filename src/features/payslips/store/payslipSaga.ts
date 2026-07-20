import { call, put, takeLatest } from 'redux-saga/effects';
import { payslipActions } from './payslipSlice';
import { payslipApi } from '../api/payslipApi';

function* fetchMyPeriodsSaga(): Generator {
  try {
    const response: any = yield call(payslipApi.getMyPeriods);
    yield put(payslipActions.fetchMyPeriodsSuccess(response.data.data));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch periods';
    yield put(payslipActions.fetchMyPeriodsFailure(message));
  }
}

function* fetchMyPayslipDetailSaga(action: { payload: string }): Generator {
  try {
    const response: any = yield call(payslipApi.getMyPayslipDetail, action.payload);
    yield put(payslipActions.fetchMyPayslipDetailSuccess(response.data.data));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch payslip detail';
    yield put(payslipActions.fetchMyPayslipDetailFailure(message));
  }
}

function* generateMyPayslipSaga(action: { payload: { periodId: string; templateId?: string } }): Generator {
  try {
    const result: any = yield call(payslipApi.generateMyPayslip, action.payload.periodId, action.payload.templateId);
    yield put(payslipActions.generateMyPayslipSuccess(result));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to generate payslip';
    yield put(payslipActions.generateMyPayslipFailure(message));
  }
}

function* batchGeneratePayslipsSaga(action: { payload: { payrollRunId: string; templateId?: string } }): Generator {
  try {
    const result: any = yield call(payslipApi.batchGeneratePayslipPdfs, action.payload.payrollRunId, action.payload.templateId);
    yield put(payslipActions.batchGeneratePayslipsSuccess(result));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to batch generate payslips';
    yield put(payslipActions.batchGeneratePayslipsFailure(message));
  }
}

function* getPayslipStatusSaga(action: { payload: string }): Generator {
  try {
    const status: any = yield call(payslipApi.getPayslipStatus, action.payload);
    yield put(payslipActions.getPayslipStatusSuccess(status));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to get payslip status';
    yield put(payslipActions.getPayslipStatusFailure(message));
  }
}

export default function* payslipSaga() {
  // `as any` handles redux-saga typing mismatch with newer TS versions
  yield takeLatest(payslipActions.fetchMyPeriodsRequest.type as any, fetchMyPeriodsSaga);
  yield takeLatest(payslipActions.fetchMyPayslipDetailRequest.type as any, fetchMyPayslipDetailSaga);
  yield takeLatest(payslipActions.generateMyPayslipRequest.type as any, generateMyPayslipSaga);
  yield takeLatest(payslipActions.batchGeneratePayslipsRequest.type as any, batchGeneratePayslipsSaga);
  yield takeLatest(payslipActions.getPayslipStatusRequest.type as any, getPayslipStatusSaga);
}
