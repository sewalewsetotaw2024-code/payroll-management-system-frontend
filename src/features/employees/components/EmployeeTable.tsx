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
    if (s === 'ACTIVE') return { class: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Active' };
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
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm p-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          <p className="text-slate-500 font-medium">Loading employees...</p>
        </div>
      </div>
    );
  }

  // Empty state with sync option
  if (employees.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm p-16 text-center space-y-4">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
          <Search className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-slate-900 font-bold text-lg">No employees found</h3>
          <p className="text-slate-500 text-sm mt-1">
            {onSync ? 'Click "Sync Employees" to pull data from Employee Module.' : 'Try adjusting your filters or search terms.'}
          </p>
        </div>
        {onSync && (
          <button
            onClick={onSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/10"
          >
            <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
            {syncing ? 'Syncing...' : 'Sync Employees'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Position / Dept</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Basic Salary</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Allowances</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gross</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {employees.map((emp) => {
              const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown';
              const initials = `${(emp.firstName || '')[0] || ''}${(emp.lastName || '')[0] || ''}` || '?';
              const badge = getStatusBadge(emp.status);
              const currency = emp.currency || 'ETB';

              const transport = Number(emp.transportationAllowance) || 0;
              const telephone = Number(emp.telephoneAllowance) || 0;
              const housing = Number(emp.housingAllowance) || 0;
              const meal = Number(emp.mealAllowance) || 0;
              const representation = Number(emp.representationAllowance) || 0;
              const other = Number(emp.otherPayments) || 0;
              const totalAllowances = transport + telephone + housing + meal + representation + other;
              const startDate = emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : '-';

              return (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => onViewEmployee(emp)}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-100/50 border border-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-sm shadow-sm">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{fullName}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {emp.externalId && (
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                              ID: {emp.externalId}
                            </span>
                          )}
                          {emp.tinNumber && (
                            <>
                              <span className="text-slate-200">|</span>
                              <span className="text-[11px] text-slate-400 font-bold tracking-tight">
                                TIN: {emp.tinNumber}
                              </span>
                            </>
                          )}
                          {emp.pensionNumber && (
                            <>
                              <span className="text-slate-200">|</span>
                              <span className="text-[11px] text-slate-400 font-bold tracking-tight">
                                PEN: {emp.pensionNumber}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {emp.employmentType && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              {emp.employmentType}
                            </span>
                          )}
                          {emp.email && (
                            <>
                              {emp.employmentType && <span className="text-slate-200">|</span>}
                              <span className="text-[10px] text-slate-400 font-normal truncate max-w-[180px]">
                                {emp.email}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm text-slate-700 font-bold">{emp.jobPosition || 'Not specified'}</p>
                    {emp.departmentName && (
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5 uppercase tracking-wider">
                        {emp.departmentName}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={cn('px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest', badge.class)}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-sm font-black text-slate-900">{formatCurrency(emp.basicSalary, currency)}</p>
                    {emp.taxableRemuneration != null && (
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                        Taxable: {formatCurrency(emp.taxableRemuneration, currency)}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-sm font-bold text-emerald-600">{totalAllowances > 0 ? formatCurrency(totalAllowances, currency) : '-'}</p>
                    {totalAllowances > 0 && (
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">incl. allowances</p>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-sm font-black text-slate-900">{formatCurrency(emp.grossSalary, currency)}</p>
                    {emp.costSharingBalance != null && emp.costSharingBalance > 0 && (
                      <p className="text-[10px] text-rose-500 font-bold uppercase mt-1">
                        CS: {formatCurrency(emp.costSharingBalance, currency)}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-slate-700">{startDate}</p>
                    {emp.managerName && (
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Mgr: {emp.managerName}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onViewEmployee(emp)}
                        className="p-2.5 text-slate-400 hover:text-[#047857] hover:bg-emerald-50 rounded-xl transition-all active:scale-90"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all active:scale-90">
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
