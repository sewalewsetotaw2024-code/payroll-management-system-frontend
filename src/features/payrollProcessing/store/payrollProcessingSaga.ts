import { call, put, takeLatest } from 'redux-saga/effects';
import { payrollProcessingActions } from './payrollProcessingSlice';
import { payrollRunApi } from '../api/payrollProcessingApi';

function* fetchRunsSaga(action: any): Generator {
  try {
    const response: any = yield call(payrollRunApi.getRuns, action.payload);
    yield put(payrollProcessingActions.fetchRunsSuccess({
      data: response.data.data,
      pagination: response.data.pagination,
    }));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch payroll runs';
    yield put(payrollProcessingActions.fetchRunsFailure(message));
  }
}

function* fetchRunSaga(action: { payload: string }): Generator {
  try {
    const response: any = yield call(payrollRunApi.getRun, action.payload);
    yield put(payrollProcessingActions.fetchRunSuccess(response.data.data));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch payroll run';
    yield put(payrollProcessingActions.fetchRunFailure(message));
  }
}

function* fetchRunItemsSaga(action: { payload: { runId: string; params?: any } }): Generator {
  try {
    const response: any = yield call(payrollRunApi.getRunItems, action.payload.runId, action.payload.params);
    yield put(payrollProcessingActions.fetchRunItemsSuccess({
      data: response.data.data,
      pagination: response.data.pagination,
    }));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch run items';
    yield put(payrollProcessingActions.fetchRunItemsFailure(message));
  }
}

function* fetchRunItemSaga(action: { payload: { runId: string; itemId: string } }): Generator {
  try {
    const response: any = yield call(payrollRunApi.getRunItem, action.payload.runId, action.payload.itemId);
    yield put(payrollProcessingActions.fetchRunItemSuccess(response.data.data));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch run item';
    yield put(payrollProcessingActions.fetchRunItemFailure(message));
  }
}

function* runPayrollSaga(action: { payload: any }): Generator {
  try {
    const response: any = yield call(payrollRunApi.runPayroll, action.payload);
    yield put(payrollProcessingActions.runPayrollSuccess(response.data.data));
    // Refresh runs list after successful payroll run
    yield put(payrollProcessingActions.fetchRunsRequest());
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to run payroll';
    yield put(payrollProcessingActions.runPayrollFailure(message));
  }
}

function* generatePayslipsSaga(action: { payload: string }): Generator {
  try {
    const response: any = yield call(payrollRunApi.generatePayslipsForRun, action.payload);
    yield put(payrollProcessingActions.generatePayslipsSuccess(response.data.data));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to generate payslips';
    yield put(payrollProcessingActions.generatePayslipsFailure(message));
  }
}

function* fetchEmployeeStatsSaga(action: { payload: { payrollPeriodId: string } }): Generator {
  try {
    const response: any = yield call(payrollRunApi.getEmployeeStats, action.payload);
    yield put(payrollProcessingActions.fetchEmployeeStatsSuccess(response.data.data));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch employee stats';
    yield put(payrollProcessingActions.fetchEmployeeStatsFailure(message));
  }
}

export default function* payrollProcessingSaga() {
  // `as any` handles redux-saga typing mismatch with newer TS versions
  yield takeLatest(payrollProcessingActions.fetchRunsRequest.type as any, fetchRunsSaga);
  yield takeLatest(payrollProcessingActions.fetchRunRequest.type as any, fetchRunSaga);
  yield takeLatest(payrollProcessingActions.fetchRunItemsRequest.type as any, fetchRunItemsSaga);
  yield takeLatest(payrollProcessingActions.fetchRunItemRequest.type as any, fetchRunItemSaga);
  yield takeLatest(payrollProcessingActions.runPayrollRequest.type as any, runPayrollSaga);
  yield takeLatest(payrollProcessingActions.generatePayslipsRequest.type as any, generatePayslipsSaga);
  yield takeLatest(payrollProcessingActions.fetchEmployeeStatsRequest.type as any, fetchEmployeeStatsSaga);
}
