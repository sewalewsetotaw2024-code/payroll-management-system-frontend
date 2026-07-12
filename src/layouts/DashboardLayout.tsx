import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useAppSelector } from '../store/hooks';

interface DashboardLayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

const tabLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  employees: 'Employee Profiles',
  payroll: 'Payroll Processing',
  payslips: 'Payslips',
  'employee-deductions': 'Employee Deductions',
  bonus: 'Bonus Management',
  overtime: 'Overtime',
  acting: 'Acting Allowance',
  reports: 'Compliance & Report',
  data: 'Data Management',
  approval: 'Approval Workflow',
  config: 'Configuration',
  notifications: 'Notifications',
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();
  const activeTab = location.pathname.replace('/', '') || 'dashboard';
  const authUser = useAppSelector((state) => state.auth.user);
  const userRole = authUser?.role?.name ?? null;

  return (
    <div className="flex h-screen bg-[#F4F4F4]">
      <Sidebar
        activeTab={activeTab}
        isCollapsed={isCollapsed}
        onLogout={onLogout}
        userRole={userRole}
        className="hidden lg:flex"
      />

      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar
              activeTab={activeTab}
              isCollapsed={false}
              onLogout={() => { onLogout?.(); setMobileOpen(false); }}
            />
          </div>
        </>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden absolute top-4 left-4 z-30 w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-700 transition-all"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden lg:block absolute top-8 -left-4 z-50">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white hover:bg-emerald-700 shadow-lg shadow-emerald-900/30 transition-all active:scale-90 group"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            ) : (
              <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
            )}
          </button>
        </div>

        <Header activeTab={activeTab} />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
