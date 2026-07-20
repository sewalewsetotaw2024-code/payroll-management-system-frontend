import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
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
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        isCollapsed={isCollapsed}
        onLogout={onLogout}
        userRole={userRole}
        className="hidden lg:flex m-4 mr-0 rounded-3xl glass shadow-xl"
      />

      {mobileOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden" 
            onClick={() => setMobileOpen(false)} 
          />
          <motion.div 
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            className="fixed inset-y-0 left-0 z-50 lg:hidden p-4"
          >
            <Sidebar
              activeTab={activeTab}
              isCollapsed={false}
              onLogout={() => { onLogout?.(); setMobileOpen(false); }}
              className="h-full rounded-3xl glass-dark shadow-2xl"
            />
          </motion.div>
        </>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="lg:hidden absolute top-4 left-4 z-30 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-10 h-10 glass rounded-xl flex items-center justify-center text-brand-primary hover:bg-white transition-all"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-brand-primary tracking-tight">ADIU</span>
        </div>

        <div className="hidden lg:block absolute top-10 -left-0 z-50">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-8 h-8 glass rounded-full flex items-center justify-center text-brand-primary hover:bg-white shadow-md transition-all active:scale-90 group translate-x-1.5"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            ) : (
              <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            )}
          </button>
        </div>

        <Header activeTab={activeTab} user={authUser} />

        <div className="flex-1 overflow-y-auto px-4 py-2 sm:px-6 lg:px-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto py-4">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
