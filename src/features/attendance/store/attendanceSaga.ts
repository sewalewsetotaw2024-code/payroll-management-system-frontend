import { call, put, takeLatest } from 'redux-saga/effects';
import { attendanceActions } from './attendanceSlice';
import { attendanceApi } from '../api/attendanceApi';

function* fetchImportsSaga(action: any): Generator {
  try {
    const imports: any = yield call(attendanceApi.listImports, action.payload);
    yield put(attendanceActions.fetchImportsSuccess(imports));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch imports';
    yield put(attendanceActions.fetchImportsFailure(message));
  }
}

function* fetchImportByIdSaga(action: { payload: string }): Generator {
  try {
    const importDetail: any = yield call(attendanceApi.getImportById, action.payload);
    yield put(attendanceActions.fetchImportByIdSuccess(importDetail));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch import';
    yield put(attendanceActions.fetchImportByIdFailure(message));
  }
}

function* importFileSaga(action: { payload: { file: File; sheetName?: string } }): Generator {
  try {
    const result: any = yield call(attendanceApi.importFile, action.payload.file, action.payload.sheetName);
    yield put(attendanceActions.importFileSuccess());
    // Refresh imports list after successful import
    yield put(attendanceActions.fetchImportsRequest());
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to import file';
    yield put(attendanceActions.importFileFailure(message));
  }
}

function* calculateOvertimeSaga(action: { payload: string }): Generator {
  try {
    const result: any = yield call(attendanceApi.calculateOvertime, action.payload);
    yield put(attendanceActions.calculateOvertimeSuccess(result));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to calculate overtime';
    yield put(attendanceActions.calculateOvertimeFailure(message));
  }
}

function* calculateSummarySaga(action: { payload: string }): Generator {
  try {
    const summary: any = yield call(attendanceApi.calculateSummary, action.payload);
    yield put(attendanceActions.calculateSummarySuccess(summary));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to calculate summary';
    yield put(attendanceActions.calculateSummaryFailure(message));
  }
}

function* fetchEmployeeDailyRecordsSaga(action: { payload: { importId: string; employeeId: string } }): Generator {
  try {
    const records: any = yield call(attendanceApi.getEmployeeDailyRecords, action.payload.importId, action.payload.employeeId);
    yield put(attendanceActions.fetchEmployeeDailyRecordsSuccess(records));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch employee records';
    yield put(attendanceActions.fetchEmployeeDailyRecordsFailure(message));
  }
}

function* deleteImportSaga(action: { payload: string }): Generator {
  try {
    yield call(attendanceApi.deleteImport, action.payload);
    yield put(attendanceActions.deleteImportSuccess());
    // Refresh imports list after deletion
    yield put(attendanceActions.fetchImportsRequest());
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to delete import';
    yield put(attendanceActions.deleteImportFailure(message));
  }
}

function* toggleImportActiveSaga(action: { payload: string }): Generator {
  try {
    yield call(attendanceApi.toggleImportActive, action.payload);
    yield put(attendanceActions.toggleImportActiveSuccess());
    // Refresh imports list after toggle
    yield put(attendanceActions.fetchImportsRequest());
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to toggle import';
    yield put(attendanceActions.toggleImportActiveFailure(message));
  }
}

export default function* attendanceSaga() {
  // `as any` handles redux-saga typing mismatch with newer TS versions
  yield takeLatest(attendanceActions.fetchImportsRequest.type as any, fetchImportsSaga);
  yield takeLatest(attendanceActions.fetchImportByIdRequest.type as any, fetchImportByIdSaga);
  yield takeLatest(attendanceActions.importFileRequest.type as any, importFileSaga);
  yield takeLatest(attendanceActions.calculateOvertimeRequest.type as any, calculateOvertimeSaga);
  yield takeLatest(attendanceActions.calculateSummaryRequest.type as any, calculateSummarySaga);
  yield takeLatest(attendanceActions.fetchEmployeeDailyRecordsRequest.type as any, fetchEmployeeDailyRecordsSaga);
  yield takeLatest(attendanceActions.deleteImportRequest.type as any, deleteImportSaga);
  yield takeLatest(attendanceActions.toggleImportActiveRequest.type as any, toggleImportActiveSaga);
}
