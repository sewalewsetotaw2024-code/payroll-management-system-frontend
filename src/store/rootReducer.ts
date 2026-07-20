import { combineReducers } from '@reduxjs/toolkit';
import configurationReducer from '../features/configuration/store/configurationSlice';
import authReducer from '../features/auth/store/authSlice';
import notificationReducer from '../features/notifications/store/notificationSlice';
import employeeReducer from '../features/employees/store/employeeSlice';
import attendanceReducer from '../features/attendance/store/attendanceSlice';
import payrollProcessingReducer from '../features/payrollProcessing/store/payrollProcessingSlice';
import payslipReducer from '../features/payslips/store/payslipSlice';
import approvalWorkflowReducer from '../features/approvalWorkflow/store/approvalWorkflowSlice';
import leaveReducer from '../features/leave/store/leaveSlice';
import payrollBatchReducer from '../features/payrollBatch/store/payrollBatchSlice';
import overtimeReducer from '../features/overtime/store/overtimeSlice';

const rootReducer = combineReducers({
  configuration: configurationReducer,
  auth: authReducer,
  notifications: notificationReducer,
  employees: employeeReducer,
  attendance: attendanceReducer,
  payrollProcessing: payrollProcessingReducer,
  payslips: payslipReducer,
  approvalWorkflow: approvalWorkflowReducer,
  leave: leaveReducer,
  payrollBatch: payrollBatchReducer,
  overtime: overtimeReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
