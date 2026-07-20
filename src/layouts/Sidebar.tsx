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
];

/** Roles that are allowed to see approval-related nav items. */
const APPROVAL_ROLES = new Set([
  'HR_GENERALIST', 'HR_CS_MANAGER', 'HR_CS_DIRECTOR',
  'FINANCE_OFFICER', 'FINANCE_MANAGER',
  'ADMIN',
]);

/** Role aliases — maps common DB role names (from auth) to canonical keys used by APPROVAL_ROLES. */
const ROLE_ALIASES: Record<string, string> = {
  'admin': 'ADMIN',
  'super admin': 'ADMIN',
  'hr generalist': 'HR_GENERALIST',
  'hr cs manager': 'HR_CS_MANAGER',
  'hr cs director': 'HR_CS_DIRECTOR',
  'finance officer': 'FINANCE_OFFICER',
  'finance manager': 'FINANCE_MANAGER',
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
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, isCollapsed, onLogout, className, userRole }) => {
  const roleKey = resolveRoleKey(userRole);
  const canSeeApproval = roleKey ? APPROVAL_ROLES.has(roleKey) : false;

  const canSeeWorkflowBuilder = roleKey === 'ADMIN';

  // Show all nav items except approval-related ones for non-approval roles
  const visibleItems = navItems.filter((item) => {
    if (item.id === 'approval') return canSeeApproval;
    if (item.id === 'workflow-builder') return canSeeWorkflowBuilder;
    return true;
  });

  return (
    <div className={cn(
      "h-full flex flex-col transition-all duration-300 z-[60] relative overflow-hidden",
      isCollapsed ? "w-20" : "w-64",
      className
    )}>
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-brand-primary rounded-xl shadow-lg shadow-brand-900/20 flex items-center justify-center p-2 flex-shrink-0">
            <Calculator className="w-full h-full text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xl font-bold text-slate-900 leading-none tracking-tight truncate">Adiu</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">Payroll Elite</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
        {visibleItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => cn(
              "sidebar-item w-full no-underline transition-all duration-200",
              isActive
                ? "sidebar-item-active"
                : "sidebar-item-inactive hover:translate-x-1",
              isCollapsed && "justify-center px-0"
            )}
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className={cn(
              "w-5 h-5 shrink-0 transition-transform duration-200",
              isCollapsed ? "group-hover:scale-110" : ""
            )} />
            {!isCollapsed && (
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        {!isCollapsed && (
          <div className="mb-4 p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10">
            <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-1">Company</p>
            <p className="text-sm font-bold text-slate-900 truncate">Kacha Digital Financial</p>
          </div>
        )}
        <button
          onClick={onLogout}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-slate-400 hover:text-rose-500 hover:bg-rose-50 group",
            isCollapsed && "justify-center px-0"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0 transition-transform group-hover:-translate-x-1" />
          {!isCollapsed && <span className="text-sm font-bold">Logout</span>}
        </button>
      </div>
    </div>
  );
};
