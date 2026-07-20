import { all, fork } from 'redux-saga/effects';
import configurationSaga from '../features/configuration/store/configurationSaga';
import authSaga from '../features/auth/store/authSaga';
import notificationSaga from '../features/notifications/store/notificationSaga';
import employeeSaga from '../features/employees/store/employeeSaga';
import attendanceSaga from '../features/attendance/store/attendanceSaga';
import payrollProcessingSaga from '../features/payrollProcessing/store/payrollProcessingSaga';
import payslipSaga from '../features/payslips/store/payslipSaga';
import approvalWorkflowSaga from '../features/approvalWorkflow/store/approvalWorkflowSaga';
import leaveSaga from '../features/leave/store/leaveSaga';
import payrollBatchSaga from '../features/payrollBatch/store/payrollBatchSaga';
import overtimeSaga from '../features/overtime/store/overtimeSaga';

export default function* rootSaga() {
  yield all([
    fork(configurationSaga),
    fork(authSaga),
    fork(notificationSaga),
    fork(employeeSaga),
    fork(attendanceSaga),
    fork(payrollProcessingSaga),
    fork(payslipSaga),
    fork(approvalWorkflowSaga),
    fork(leaveSaga),
    fork(payrollBatchSaga),
    fork(overtimeSaga),
  ]);
}
