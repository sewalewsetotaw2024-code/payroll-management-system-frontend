import { call, put, takeLatest } from 'redux-saga/effects';
import { employeeActions } from './employeeSlice';
import { getEmployees, getEmployeeById, triggerEmployeeSync } from '../api/employeeApi';

function* fetchEmployeesSaga(action: any): Generator {
  try {
    const response: any = yield call(getEmployees, action.payload);
    yield put(employeeActions.fetchEmployeesSuccess(response));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch employees';
    yield put(employeeActions.fetchEmployeesFailure(message));
  }
}

function* fetchEmployeeByIdSaga(action: { payload: string }): Generator {
  try {
    const employee: any = yield call(getEmployeeById, action.payload);
    if (employee) {
      yield put(employeeActions.fetchEmployeeByIdSuccess(employee));
    } else {
      yield put(employeeActions.fetchEmployeeByIdFailure('Employee not found'));
    }
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch employee';
    yield put(employeeActions.fetchEmployeeByIdFailure(message));
  }
}

function* syncEmployeesSaga(): Generator {
  try {
    yield call(triggerEmployeeSync);
    yield put(employeeActions.syncEmployeesSuccess());
    // Refresh employees list after sync
    yield put(employeeActions.fetchEmployeesRequest());
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to sync employees';
    yield put(employeeActions.syncEmployeesFailure(message));
  }
}

export default function* employeeSaga() {
  // `as any` handles redux-saga typing mismatch with newer TS versions
  yield takeLatest(employeeActions.fetchEmployeesRequest.type as any, fetchEmployeesSaga);
  yield takeLatest(employeeActions.fetchEmployeeByIdRequest.type as any, fetchEmployeeByIdSaga);
  yield takeLatest(employeeActions.syncEmployeesRequest.type as any, syncEmployeesSaga);
}
