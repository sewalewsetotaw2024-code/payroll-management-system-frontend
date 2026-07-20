import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import {
  X,
  Briefcase,
  Mail,
  Calendar,
  Building,
  IdCard,
  DollarSign,
  PiggyBank,
  Car,
  Phone,
  Home,
  Utensils,
  UserCog,
  Plus,
} from 'lucide-react';

/**
 * Employee data shape used within the detail modal.
 */
interface ModalEmployee {
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
  hireDate?: string;
  probationEndDate?: string;
  employmentEndDate?: string;
  placeOfWork?: string;
  contractReference?: string;
  status: string;
  currency?: string;
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
  isPensionEligible?: boolean;
  isTaxExempt?: boolean;
  syncedAt?: string;
  employeeDeductions?: Array<{
    id: string;
    deductionType: string;
    label: string;
    calculationType: string;
    amount?: number | string;
    percent?: number | string;
    paymentPlan?: {
        totalAmount: number | string;
        paidAmount: number | string;
        remaining?: number | string;
        paidInstallments: number;
        numInstallments?: number;
    } | null;
  }>;
}

/**
 * Props for the EmployeeDetailModal component.
 */
interface EmployeeDetailModalProps {
  employee: ModalEmployee | null;
  loading?: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onEdit?: (employee: ModalEmployee) => void;
}

/**
 * EmployeeDetailModal component that displays a full-screen modal with detailed employee
 * information, including personal details, salary breakdown, allowances, tax and pension status.
 * Features an animated entrance/exit with backdrop blur.
 */
export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({ employee, loading, onClose, onRefresh, onEdit }) => {
  if (!employee) return null;

  const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown';
  const initials = `${(employee.firstName || '')[0] || ''}${(employee.lastName || '')[0] || ''}` || '?';
  const currency = employee.currency || 'ETB';

  /** Safely coerce a value to number (handles Prisma Decimal strings). */
  const toNum = (v: any): number | null => (v == null || v === '' ? null : Number(v));
  /** Format a number with thousand separators and currency suffix. */
  const formatCurrency = (amount: any) => {
    const n = toNum(amount);
    if (n == null) return '-';
    return `${n.toLocaleString()} ${currency}`;
  };

  /** Coerce to number, defaulting to 0 for null/undefined/NaN. */
  const t = (v: any) => Number(v) || 0;

  // Collect all allowances (only those with non-zero amounts)
  const allowances: { name: string; amount: number; label: string }[] = [];
  const transAmt = t(employee.transportationAllowance);
  const housAmt = t(employee.housingAllowance);
  const mealAmt = t(employee.mealAllowance);
  const telAmt = t(employee.telephoneAllowance);
  const repAmt = t(employee.representationAllowance);
  const otherAmt = t(employee.otherPayments);
  if (transAmt > 0) allowances.push({ name: 'Transport', amount: transAmt, label: 'Transport Allowance' });
  if (housAmt > 0) allowances.push({ name: 'Housing', amount: housAmt, label: 'Housing Allowance' });
  if (mealAmt > 0) allowances.push({ name: 'Meal', amount: mealAmt, label: 'Meal Allowance' });
  if (telAmt > 0) allowances.push({ name: 'Telephone', amount: telAmt, label: 'Telephone Allowance' });
  if (repAmt > 0) allowances.push({ name: 'Representation', amount: repAmt, label: 'Representation Allowance' });
  if (otherAmt > 0) allowances.push({ name: 'Other', amount: otherAmt, label: 'Other Payments' });

  const allowanceMeta: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    Transport: { icon: <Car className="w-4 h-4" />, color: 'text-sky-600', bg: 'bg-sky-50' },
    Housing: { icon: <Home className="w-4 h-4" />, color: 'text-violet-600', bg: 'bg-violet-50' },
    Meal: { icon: <Utensils className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50' },
    Telephone: { icon: <Phone className="w-4 h-4" />, color: 'text-teal-600', bg: 'bg-teal-50' },
    Representation: { icon: <UserCog className="w-4 h-4" />, color: 'text-rose-600', bg: 'bg-rose-50' },
    Other: { icon: <Plus className="w-4 h-4" />, color: 'text-slate-600', bg: 'bg-slate-50' },
  };

  /** Sum of all regular allowances (transport, housing, meal, etc.) */
  const totalAllowances = allowances.reduce((acc, a) => acc + a.amount, 0);

  // ── Salary arithmetic with explicit Number() coercion ──────
  // Prisma Decimal fields are serialised as JSON strings by the API.
  // All arithmetic uses explicit Number() to avoid string concatenation.
  const empBasic = Number(employee.basicSalary) || 0;
  const empGross = Number(employee.grossSalary) || 0;
  const empTaxable = Number(employee.taxableRemuneration) || 0;

  /** Gross remuneration. Falls back to basic + allowances if gross is null. */
  const displayGross = employee.grossSalary != null
    ? empGross
    : employee.basicSalary != null
      ? empBasic + totalAllowances
      : null;

  /** Taxable remuneration. Null if taxableRemuneration is not set. */
  const displayTaxable = employee.taxableRemuneration != null
    ? empTaxable
    : null;

  return (
    <AnimatePresence>
      {employee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl glass rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-white"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-brand-primary text-white relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center gap-6 z-10">
                <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black shadow-inner border border-white/20">
                  {initials}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{fullName}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="bg-white/20 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10">
                      ID: {employee.externalId || employee.id.slice(0, 8)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/40" />
                    <p className="text-emerald-50 font-bold text-xs uppercase tracking-widest">
                      {employee.departmentName || "General Staff"}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90 z-10 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-white/30 backdrop-blur-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Employee Info */}
                <div className="space-y-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Professional Identity</h4>
                  <div className="grid gap-6">
                    {employee.jobPosition && (
                      <DetailItem icon={<Briefcase />} label="Position" value={employee.jobPosition} />
                    )}
                    {employee.departmentName && (
                      <DetailItem icon={<Building />} label="Department" value={employee.departmentName} />
                    )}
                    {employee.email && (
                      <DetailItem icon={<Mail />} label="Communication" value={employee.email} />
                    )}
                    {employee.employmentType && (
                      <DetailItem icon={<Calendar />} label="Contract Type" value={employee.employmentType} />
                    )}
                    {employee.managerName && (
                      <DetailItem icon={<Briefcase />} label="Reporting To" value={employee.managerName} />
                    )}
                  </div>
                </div>

                {/* Salary & Allowances Breakdown */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Compensation Architecture</h4>
                  {/* Gross Total Hero */}
                  {displayGross != null && (
                    <div className="glass bg-white rounded-3xl p-6 shadow-xl border-white relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Cycle Gross Target</p>
                      <p className="text-4xl font-black text-slate-900 tracking-tighter font-mono">{formatCurrency(displayGross)}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-50">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Base</span>
                          <span className="text-xs font-bold text-slate-700 font-mono">{formatCurrency(employee.basicSalary)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Benefits</span>
                          <span className="text-xs font-bold text-emerald-600 font-mono">+{formatCurrency(totalAllowances)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Allowances Section */}
                  {allowances.length > 0 && (
                    <div className="grid gap-3 mt-4">
                      {allowances.map((a, i) => {
                        const meta = allowanceMeta[a.name] || allowanceMeta.Other;
                        return (
                          <div key={i} className="glass bg-white/40 rounded-2xl p-4 flex items-center justify-between group hover:bg-white transition-all border-white/50">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center ring-1 ring-slate-100 group-hover:scale-110 transition-transform`}>
                                  {React.cloneElement(meta.icon as any, { className: `w-4 h-4 ${meta.color}` })}
                                </div>
                              <div>
                                <p className="text-xs font-black text-slate-800 tracking-tight">{a.label}</p>
                              </div>
                            </div>
                            <p className={`font-black text-sm font-mono ${meta.color}`}>+{formatCurrency(a.amount)}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10 border-t border-slate-100">
                <div className="glass bg-white rounded-3xl p-6 border-white flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 text-emerald-600 flex items-center justify-center">
                      <PiggyBank className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pension Profile</span>
                  </div>
                  <p className={cn("text-lg font-black tracking-tight", employee.isPensionEligible !== false ? 'text-emerald-600' : 'text-slate-400')}>
                    {employee.isPensionEligible !== false ? 'ELIGIBLE' : 'INELIGIBLE'}
                  </p>
                </div>

                <div className="glass bg-white rounded-3xl p-6 border-white flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Taxation Protocol</span>
                  </div>
                  <p className={cn("text-lg font-black tracking-tight", employee.isTaxExempt ? 'text-amber-600' : 'text-brand-primary')}>
                    {employee.isTaxExempt ? 'TAX EXEMPT' : 'STANDARD'}
                  </p>
                </div>

                <div className="glass bg-white rounded-3xl p-6 border-white flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <IdCard className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account Integrity</span>
                  </div>
                  <p className="text-sm font-black font-mono text-slate-900 truncate">
                    {employee.bankAccountNumber || "NOT CONFIGURED"}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-slate-100 flex justify-end gap-4 bg-white/50 backdrop-blur-md">
              <button
                onClick={onClose}
                className="cursor-pointer px-8 py-3.5 text-xs font-black uppercase tracking-widest text-slate-500 glass border-white rounded-2xl hover:bg-white hover:text-slate-800 transition-all active:scale-95"
              >
                Dismiss
              </button>
              {onEdit && (
                <button
                  onClick={() => onEdit(employee)}
                  className="cursor-pointer px-8 py-3.5 bg-brand-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-brand-dark transition-all shadow-xl shadow-brand-900/10 active:scale-95"
                >
                  Edit Master Record
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/**
 * DetailItem component that renders a single detail row with an icon, label, and value.
 *
 * @param icon - The icon element for the row.
 * @param label - The field label.
 * @param value - The field value to display.
 */
const DetailItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-4">
    <div className="w-10 h-10 rounded-2xl bg-slate-100/80 flex items-center justify-center text-slate-400 shrink-0 border border-slate-50">
      {React.cloneElement(icon as any, { className: 'w-5 h-5' })}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1.5">{label}</p>
      <p className="text-[15px] font-bold text-slate-800 truncate">{value}</p>
    </div>
  </div>
);
