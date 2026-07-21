import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { authActions } from './features/auth';
import { Login } from './features/auth';
import { tokenStorage } from './lib/token';
import { ToastProvider } from './components/ui/Toast';
import { ApprovalRouteGuard } from './components/auth/ApprovalRouteGuard';
import { AdminRouteGuard } from './components/auth/AdminRouteGuard';

const Dashboard = lazy(() => import('./features/dashboard').then((m) => ({ default: m.Dashboard })));
const Configuration = lazy(() => import('./features/configuration').then((m) => ({ default: m.Configuration })));
const EmployeeDeductionManagement = lazy(() => import('./features/configuration/components/EmployeeDeductionManagement').then((m) => ({ default: m.EmployeeDeductionManagement })));
const DeductionEmployeesPage = lazy(() => import('./features/configuration/components/DeductionEmployeesPage').then((m) => ({ default: m.DeductionEmployeesPage })));
const Employees = lazy(() => import('./features/employees').then((m) => ({ default: m.Employees })));
const PayrollProcessing = lazy(() => import('./features/payrollProcessing').then((m) => ({ default: m.PayrollProcessing })));
const BonusManagement = lazy(() => import('./features/bonusManagement').then((m) => ({ default: m.BonusManagement })));
const Payslips = lazy(() => import('./features/payslips').then((m) => ({ default: m.Payslips })));
const EmployeePayslipDetailPage = lazy(() => import('./features/payslips').then((m) => ({ default: m.EmployeePayslipDetailPage })));
const PeriodPayslipsPage = lazy(() => import('./features/payslips').then((m) => ({ default: m.PeriodPayslipsPage })));
const Overtime = lazy(() => import('./features/overtime').then((m) => ({ default: m.Overtime })));
const AttendancePage = lazy(() => import('./features/attendance').then((m) => ({ default: m.AttendancePage })));
const AttendanceEmployeeDetail = lazy(() => import('./features/attendance').then((m) => ({ default: m.EmployeeAttendanceDetail })));
const LeavePage = lazy(() => import('./features/leave/pages/LeaveApprovalPage').then((m) => ({ default: m.default })));
const ActingAllowance = lazy(() => import('./features/actingAllowance').then((m) => ({ default: m.ActingAllowance })));
const ComplianceReport = lazy(() => import('./features/complianceReport').then((m) => ({ default: m.ComplianceReport })));
const PayslipTemplateListPage = lazy(() => import('./features/payslipTemplates/pages/PayslipTemplateListPage').then((m) => ({ default: m.PayslipTemplateListPage })));
const DataManagement = lazy(() => import('./features/dataManagement').then((m) => ({ default: m.DataManagement })));
const ApprovalWorkflow = lazy(() => import('./features/approvalWorkflow').then((m) => ({ default: m.ApprovalWorkflow })));
const ApprovalWorkflowBuilderPage = lazy(() => import('./features/approvalWorkflow').then((m) => ({ default: m.ApprovalWorkflowBuilderPage })));
const EmployeeAttendanceStatsPage = lazy(() => import('./features/approvalWorkflow').then((m) => ({ default: m.EmployeeAttendanceStatsPage })));
const PayrollEmployeeStatsPage = lazy(() => import('./features/approvalWorkflow').then((m) => ({ default: m.PayrollEmployeeStatsPage })));
const Notifications = lazy(() => import('./features/notifications').then((m) => ({ default: m.Notifications })));
const PayrollBatchPage = lazy(() => import('./features/payrollBatch').then((m) => ({ default: m.PayrollBatchPage })));
const BatchEmployeeListPage = lazy(() => import('./features/payrollBatch').then((m) => ({ default: m.BatchEmployeeListPage })));
const PeriodEmployeesPage = lazy(() => import('./features/payrollProcessing').then((m) => ({ default: m.PeriodEmployeesPage })));

const loadingFallback = (
  <div className="flex min-h-screen items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      <p className="text-sm font-medium text-slate-600">Loading module…</p>
    </div>
  </div>
);

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
        <Suspense fallback={loadingFallback}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/config" element={<Configuration />} />
            <Route path="/employee-deductions/:configSlug" element={<DeductionEmployeesPage />} />
            <Route path="/employee-deductions" element={<EmployeeDeductionManagement />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/payroll" element={<PayrollProcessing />} />
            <Route path="/payroll/:periodSlug/employees" element={<PeriodEmployeesPage />} />
            <Route path="/payslips" element={<Payslips />} />
            <Route path="/payslips/:periodSlug" element={<PeriodPayslipsPage />} />
            <Route path="/payslips/:periodSlug/employees/:employeeSlug" element={<EmployeePayslipDetailPage />} />
            <Route path="/payslip-templates" element={<PayslipTemplateListPage />} />
            <Route path="/bonus" element={<BonusManagement />} />
            <Route path="/overtime" element={<Overtime />} />

            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/attendance/:employeeSlug" element={<AttendanceEmployeeDetail />} />
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
              <AdminRouteGuard>
                <ApprovalWorkflowBuilderPage />
              </AdminRouteGuard>
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
        </Suspense>
      </DashboardLayout>
    </ToastProvider>
  );
}
