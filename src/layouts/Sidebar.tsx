import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  ReceiptText,
  Calculator,
  Gift,
  Clock,
  CalendarCheck,
  UserPlus,
  FileCheck,
  Database,
  Settings,
  ClipboardCheck,
  LogOut,
  Package,
  TrendingDown,
  Settings2,
  PiggyBank,
  CalendarDays,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  isCollapsed: boolean;
  onLogout?: () => void;
  className?: string;
  /** Current user's role name for sidebar filtering. If omitted, all items shown. */
  userRole?: string | null;
}

/** All nav item IDs — every role sees the full sidebar.
 *  Approval workflow items are only shown for roles in APPROVAL_ROLES. */
const ALL_MODULES = [
  'dashboard', 'employees', 'payroll', 'attendance', 'payslips',
  'employee-deductions', 'bonus', 'overtime', 'acting', 'reports', 'data',
  'approval', 'workflow-builder', 'payroll-batch', 'config',
  'currency', 'folders', 'payroll-periods',
];

/** Roles that are allowed to see approval-related nav items. */
const APPROVAL_ROLES = new Set([
  'HR_OFFICER', 'HR_MANAGER', 'PAYROLL_OFFICER',
  'FINANCE_MANAGER', 'FINANCE_OFFICER',
  'DEPARTMENT_MANAGER', 'ADMIN',
]);

/** Role aliases — maps common DB role names (from auth) to canonical keys used by APPROVAL_ROLES. */
const ROLE_ALIASES: Record<string, string> = {
  'admin': 'ADMIN',
  'super admin': 'ADMIN',
  'hr': 'HR_OFFICER',
  'hr officer': 'HR_OFFICER',
  'hr manager': 'HR_MANAGER',
  'payroll officer': 'PAYROLL_OFFICER',
  'finance manager': 'FINANCE_MANAGER',
  'finance officer': 'FINANCE_OFFICER',
  'department manager': 'DEPARTMENT_MANAGER',
};

/** Resolve a role name (from auth) to a canonical module key. */
function resolveRoleKey(roleName: string | null | undefined): string | null {
  if (!roleName) return null;
  const normalized = roleName.toLowerCase().trim();
  return ROLE_ALIASES[normalized] ?? null;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'employees', label: 'Employee Profiles', icon: Users, path: '/employees' },
  { id: 'payroll', label: 'Payroll Processing', icon: ReceiptText, path: '/payroll' },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck, path: '/attendance' },
  { id: 'payslips', label: 'Payslips', icon: Calculator, path: '/payslips' },
  { id: 'employee-deductions', label: 'Employee Deductions', icon: TrendingDown, path: '/employee-deductions' },
  { id: 'bonus', label: 'Bonus Management', icon: Gift, path: '/bonus' },
  { id: 'overtime', label: 'Overtime', icon: Clock, path: '/overtime' },
  { id: 'acting', label: 'Acting Allowance', icon: UserPlus, path: '/acting' },
  { id: 'reports', label: 'Compliance & Report', icon: FileCheck, path: '/reports' },
  { id: 'data', label: 'Data Management', icon: Database, path: '/data' },
  { id: 'approval', label: 'Approval Workflow', icon: ClipboardCheck, path: '/approval' },
  { id: 'workflow-builder', label: 'Workflow Builder', icon: Settings2, path: '/workflow-builder' },
  { id: 'payroll-batch', label: 'Payroll Batch', icon: Package, path: '/payroll-batch' },
  { id: 'config', label: 'Configuration', icon: Settings, path: '/config' },

  { id: 'currency', label: 'Currency Rates', icon: PiggyBank, path: '/currency' },
  { id: 'folders', label: 'Folders', icon: Database, path: '/folders' },
  { id: 'payroll-periods', label: 'Payroll Periods', icon: CalendarDays, path: '/payroll-periods' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, isCollapsed, onLogout, className, userRole }) => {
  const roleKey = resolveRoleKey(userRole);
  const canSeeApproval = roleKey ? APPROVAL_ROLES.has(roleKey) : false;

  // Show all nav items except approval-related ones for non-approval roles
  const visibleItems = navItems.filter(
    (item) =>
      item.id === 'approval' || item.id === 'workflow-builder'
        ? canSeeApproval
        : true,
  );

  return (
    <div className={cn(
      "h-screen bg-white/70 backdrop-blur-xl text-slate-800 flex flex-col transition-all duration-300 border-r border-slate-200/50 z-[60]",
      isCollapsed ? "w-20" : "w-64",
      className
    )}>
      <div className="p-6 border-b border-slate-100/50 bg-transparent">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center p-1.5 flex-shrink-0">
            <img
              src="https://api.iconify.design/lucide:globe.svg?color=%23047857"
              alt="Adiu Logo"
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xl font-black text-slate-900 leading-none tracking-tight truncate">Adiu</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">Communication</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-3.5 custom-scrollbar overflow-x-visible">
        {visibleItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => cn(
              "sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group no-underline",
              isActive
                ? "sidebar-item-active shadow-sm"
                : "sidebar-item-inactive hover:bg-slate-50",
              isCollapsed && "justify-center"
            )}
          >
            {({ isActive }) => (
              <>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <item.icon className={cn(
                    "w-5 h-5 shrink-0 transition-all",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-600"
                  )} />
                </motion.div>
                {!isCollapsed && (
                  <span className="text-sm font-bold whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                )}
                {isActive && !isCollapsed && (
                  <motion.span 
                    layoutId="sidebar-active-indicator"
                    className="absolute right-2 w-1.5 h-1.5 rounded-full bg-emerald-300" 
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200/50">
        <button
          onClick={onLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-slate-400 hover:text-rose-500 hover:bg-rose-50",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="text-sm font-bold">Logout</span>}
        </button>
      </div>
    </div>
  );
};
