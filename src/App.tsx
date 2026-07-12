import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { authActions } from './features/auth';
import { Login } from './features/auth';
import { tokenStorage } from './lib/token';
import { ToastProvider } from './components/ui/Toast';
import { Dashboard } from './features/dashboard';
import { Configuration } from './features/configuration';
import { EmployeeDeductionManagement } from './features/configuration/components/EmployeeDeductionManagement';
import { DeductionEmployeesPage } from './features/configuration/components/DeductionEmployeesPage';
import { Employees } from './features/employees';
import { PayrollProcessing } from './features/payrollProcessing';
import { BonusManagement } from './features/bonusManagement';
import { Payslips } from './features/payslips';
import { Overtime, EmployeeAttendanceDetail as OvertimeEmployeeDetail } from './features/overtime';
import { AttendancePage, EmployeeAttendanceDetail as AttendanceEmployeeDetail } from './features/attendance';
import LeavePage from './features/leave/pages/LeaveApprovalPage';
import { ActingAllowance } from './features/actingAllowance';
import { ComplianceReport } from './features/complianceReport';
import { DataManagement } from './features/dataManagement';
import { ApprovalWorkflow, ApprovalWorkflowBuilderPage, EmployeeAttendanceStatsPage, PayrollEmployeeStatsPage } from './features/approvalWorkflow';
import { ApprovalRouteGuard } from './components/auth/ApprovalRouteGuard';
import { Notifications } from './features/notifications';
import { PayrollBatchPage, BatchEmployeeListPage } from './features/payrollBatch';

export default function App() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, loading } = useAppSelector((s) => s.auth);

  React.useEffect(() => {
    const token = tokenStorage.getToken();
    if (token && !user) {
      dispatch(authActions.fetchMeRequest());
    }
  }, [dispatch, user]);

  const handleLogout = () => {
    dispatch(authActions.logout());
  };

  if (loading && !user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse text-sm">Initializing secure session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <ToastProvider>
      <DashboardLayout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/config" element={<Configuration />} />
          <Route path="/employee-deductions/:configId" element={<DeductionEmployeesPage />} />
          <Route path="/employee-deductions" element={<EmployeeDeductionManagement />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/payroll" element={<PayrollProcessing />} />
          <Route path="/payslips" element={<Payslips />} />
          <Route path="/bonus" element={<BonusManagement />} />
          <Route path="/overtime" element={<Overtime />} />
          <Route path="/overtime/:employeeId" element={<OvertimeEmployeeDetail />} />

          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/attendance/:employeeId" element={<AttendanceEmployeeDetail />} />
          <Route path="/leave" element={<LeavePage />} />

          <Route path="/acting" element={<ActingAllowance />} />
          <Route path="/reports" element={<ComplianceReport />} />
          <Route path="/data" element={<DataManagement />} />
          <Route path="/payroll-batch" element={<PayrollBatchPage />} />
          <Route path="/payroll-batch/:batchId" element={<BatchEmployeeListPage />} />
          <Route path="/approval" element={
            <ApprovalRouteGuard>
              <ApprovalWorkflow />
            </ApprovalRouteGuard>
          } />
          <Route path="/workflow-builder" element={
            <ApprovalRouteGuard>
              <ApprovalWorkflowBuilderPage />
            </ApprovalRouteGuard>
          } />
          <Route path="/approval/attendance-stats" element={
            <ApprovalRouteGuard>
              <EmployeeAttendanceStatsPage />
            </ApprovalRouteGuard>
          } />
          <Route path="/approval/payroll-stats" element={
            <ApprovalRouteGuard>
              <PayrollEmployeeStatsPage />
            </ApprovalRouteGuard>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </DashboardLayout>
    </ToastProvider>
  );
}
