import React from 'react';
import { Eye, MoreVertical, Search, RefreshCw } from 'lucide-react';
import { cn, formatCurrency as fmtCurrency } from '../../../lib/utils';

/**
 * Employee data shape used within the table (subset of PayrollEmployee).
 */
interface TableEmployee {
  id: string;
  externalId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  gender?: string;
  tinNumber?: string;
  pensionNumber?: string;
  jobPosition?: string;
  departmentName?: string;
  employmentType?: string;
  managerName?: string;
  status: string;
  basicSalary?: number;
  grossSalary?: number;
  taxableRemuneration?: number;
  transportationAllowance?: number;
  telephoneAllowance?: number;
  representationAllowance?: number;
  housingAllowance?: number;
  mealAllowance?: number;
  otherPayments?: number;
  costSharingBalance?: number;
  bankAccountNumber?: string;
  currency: string;
  hireDate?: string;
  probationEndDate?: string;
  placeOfWork?: string;
  createdAt?: string;
  isPensionEligible: boolean;
  isTaxExempt: boolean;
  syncedAt?: string;
}

/**
 * Props for the EmployeeTable component.
 */
interface EmployeeTableProps {
  employees: TableEmployee[];
  onViewEmployee: (employee: TableEmployee) => void;
  loading?: boolean;
  onSync?: () => void;
  syncing?: boolean;
}

/**
 * EmployeeTable component that renders a table of employee records with loading,
 * empty, and error states. Displays employee name, position, status, salary breakdown,
 * and action buttons. Includes a sync prompt when no employees are found.
 */
export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  onViewEmployee,
  loading,
  onSync,
  syncing,
}) => {
  /** Map a status string to badge styling classes and a display label. */
  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'ACTIVE') return { class: 'bg-brand-50 text-emerald-700 border-emerald-100', label: 'Active' };
    if (s === 'INACTIVE') return { class: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Inactive' };
    if (s === 'ON_LEAVE' || s === 'ON LEAVE') return { class: 'bg-amber-50 text-amber-700 border-amber-100', label: 'On Leave' };
    if (s === 'TERMINATED') return { class: 'bg-rose-50 text-rose-700 border-rose-100', label: 'Terminated' };
    return { class: 'bg-slate-100 text-slate-500 border-slate-200', label: status || 'Unknown' };
  };

  /** Safely coerce a value to number (handles Prisma Decimal strings). */
  const toNum = (v: any): number | null => (v == null || v === '' ? null : Number(v));
  /** Format a number with thousand separators and currency suffix. */
  const formatCurrency = (amount: any, currency: string = 'ETB') => {
    const n = toNum(amount);
    if (n == null) return '-';
    return `${n.toLocaleString()} ${currency}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="glass rounded-[3rem] shadow-xl p-24 text-center border-white">
        <div className="flex flex-col items-center gap-6">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent shadow-lg"></div>
          <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Accessing Database...</p>
        </div>
      </div>
    );
  }

  // Empty state with sync option
  if (employees.length === 0) {
    return (
      <div className="glass rounded-[3rem] shadow-xl p-24 text-center space-y-8 border-white">
        <div className="w-24 h-24 bg-brand-primary/5 rounded-[2rem] flex items-center justify-center mx-auto text-brand-primary/30 ring-1 ring-brand-primary/10 shadow-inner">
          <Search className="w-12 h-12" />
        </div>
        <div className="max-w-sm mx-auto">
          <h3 className="text-slate-900 font-black text-2xl tracking-tight">No records found</h3>
          <p className="text-slate-500 font-medium mt-2">
            {onSync ? 'Your personnel directory is currently empty. Synchronize with the master ERP module to begin.' : 'We couldn\'t find any employees matching those specific filters.'}
          </p>
        </div>
        {onSync && (
          <button
            onClick={onSync}
            disabled={syncing}
            className="inline-flex items-center gap-3 px-8 py-4 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-brand-dark transition-all disabled:opacity-50 shadow-2xl shadow-emerald-900/30 active:scale-95"
          >
            <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
            {syncing ? 'Processing Sync...' : 'Initialize Sync'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="glass rounded-[3rem] shadow-2xl border-white overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-white/40 border-b border-slate-100">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-200/50">Employee</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-200/50">Engagement</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center border-r border-slate-200/50">Status</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right border-r border-slate-200/50">Compensation</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right border-r border-slate-200/50">Total Gross</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-200/50 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => {
              const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown';
              const initials = `${(emp.firstName || '')[0] || ''}${(emp.lastName || '')[0] || ''}`.toUpperCase() || '?';
              const badge = getStatusBadge(emp.status);
              const currency = emp.currency || 'ETB';

              return (
                <tr 
                  key={emp.id} 
                  className={cn(
                    'transition-all group cursor-pointer border-b border-slate-50/50', 
                    idx % 2 === 0 ? 'bg-white/20' : 'bg-transparent', 
                    'hover:bg-brand-primary/5'
                  )} 
                  onClick={() => onViewEmployee(emp)}
                >
                  <td className="px-8 py-5 border-r border-slate-200/50">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-brand-primary shadow-lg shadow-brand-900/20 flex items-center justify-center text-white font-black text-sm group-hover:scale-110 transition-transform">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 truncate tracking-tight">{fullName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {emp.externalId || emp.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 border-r border-slate-200/50">
                    <p className="text-sm text-slate-700 font-bold">{emp.jobPosition || 'Not specified'}</p>
                    <p className="text-[10px] text-brand-primary/70 font-black mt-1 uppercase tracking-widest">
                      {emp.departmentName || 'Global'}
                    </p>
                  </td>
                  <td className="px-8 py-5 text-center border-r border-slate-200/50">
                    <span className={cn('px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border tracking-[0.15em] shadow-sm', badge.class)}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right border-r border-slate-200/50">
                    <p className="text-sm font-black text-slate-900 font-mono tracking-tight">{formatCurrency(emp.basicSalary, currency)}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Base Salary</p>
                  </td>
                  <td className="px-8 py-5 text-right border-r border-slate-200/50">
                    <p className="text-sm font-black text-brand-primary font-mono tracking-tight">{formatCurrency(emp.grossSalary, currency)}</p>
                    <p className="text-[9px] text-brand-primary/50 font-bold uppercase tracking-widest mt-1.5">Total Pay</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                      <button
                        onClick={() => onViewEmployee(emp)}
                        className="p-3 bg-white shadow-sm ring-1 ring-slate-100 text-brand-primary hover:bg-brand-primary hover:text-white rounded-2xl transition-all active:scale-90"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-3 bg-white shadow-sm ring-1 ring-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all active:scale-90">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
