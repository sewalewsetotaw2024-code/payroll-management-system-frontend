import { call, put, takeLatest } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import { overtimeActions } from './overtimeSlice';
import { attendanceApi } from '../../attendance/api/attendanceApi';
import { overtimeRuleApi, workdaysApi } from '../../configuration/api/configurationApi';

function* fetchOvertimeDataSaga(): Generator {
  try {
    const [importsResponse, rulesResponse, workdaysResponse]: any = yield call(function* () {
      const [imports, rules, workdays] = yield [
        call(attendanceApi.listImports, { limit: 1000 }),
        call(overtimeRuleApi.getAll),
        call(workdaysApi.get),
      ];
      return [imports, rules, workdays];
    });

    const imports = importsResponse?.data?.data ?? importsResponse?.data ?? [];
    const rules = rulesResponse?.data?.data ?? rulesResponse?.data ?? [];
    const workdaysConfig = workdaysResponse?.data?.data ?? workdaysResponse?.data ?? null;

    yield put(overtimeActions.fetchOvertimeDataSuccess({ imports, rules, workdaysConfig }));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch overtime data';
    yield put(overtimeActions.fetchOvertimeDataFailure(message));
  }
}

function* calculateOvertimeSaga(action: PayloadAction<{ importId: string }>): Generator {
  try {
    const result: any = yield call(attendanceApi.calculateOvertime, action.payload.importId);
    yield put(overtimeActions.calculateOvertimeSuccess(result));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to calculate overtime';
    yield put(overtimeActions.calculateOvertimeFailure(message));
  }
}

export default function* overtimeSaga() {
  yield takeLatest(overtimeActions.fetchOvertimeDataRequest.type, fetchOvertimeDataSaga);
  yield takeLatest(overtimeActions.calculateOvertimeRequest.type, calculateOvertimeSaga);
}
